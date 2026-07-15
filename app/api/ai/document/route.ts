import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { reserveUsage, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'
import { handleApiError } from '@/lib/errors/api-error-handler'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'

export const maxDuration = 60

const DISCLAIMER = '\n\n【필수 고지문】\n본 자료는 업로드된 자료를 바탕으로 AI가 작성한 참고용 설명자료입니다. 실제 보장 여부, 보험금 지급 여부, 가입 가능 여부는 해당 보험회사의 약관, 인수기준, 심사결과에 따라 달라질 수 있습니다.'

const SECTION_MARKERS = ['SUMMARY', 'COVERAGE', 'MISCONCEPTIONS', 'QNA', 'AGENT_SCRIPT']

// 여러 섹션을 한 번에 생성하면 Vercel 서버리스 60초 제한을 넘기기 쉬워 타임아웃으로
// 실패한다. 그룹으로 나눠 병렬 호출해 소요시간을 줄인다. 설계사가 이미 아는 내용인
// 체크리스트/면책사항/주의문구는 제외하고, 실제 상담에 쓰는 AGENT_SCRIPT는 다른 섹션과
// 예산을 나눠 쓰지 않도록 단독 호출로 분리해 더 풍성하게 생성한다.
const SECTION_GROUPS = [
  { sections: ['SUMMARY', 'COVERAGE', 'MISCONCEPTIONS'] as const, maxTokens: 4000 },
  { sections: ['QNA'] as const, maxTokens: 3000 },
  { sections: ['AGENT_SCRIPT'] as const, maxTokens: 3500 },
]

const PDF_CONTENT_LIMIT = 12_000

function parseOutputSections(raw: string, disclaimer: string = DISCLAIMER): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const marker = SECTION_MARKERS[i]
    const nextMarker = SECTION_MARKERS[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue
    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim() + disclaimer
  }
  return result
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  const userId = user.id

  const body = await request.json()
  const {
    fileId,
    ageGroup,
    occupation,
    customerSituation,
    explanationPurpose,
    difficultyLevel,
    formatStyle,
    extraRequests,
    categoryId,
    forceRegenerate = false,
  } = body

  if (!fileId) return NextResponse.json({ error: '파일을 선택해주세요' }, { status: 400 })
  if (!explanationPurpose) return NextResponse.json({ error: '설명 목적을 입력해주세요' }, { status: 400 })

  // Fetch the uploaded file's extracted text
  const { data: fileRow } = await (supabase as any)
    .from('uploaded_files')
    .select('original_file_name, extracted_text, status')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single()

  if (!fileRow) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
  if (fileRow.status === 'deleted') return NextResponse.json({ error: '삭제된 파일입니다' }, { status: 410 })
  if (!fileRow.extracted_text || !['completed', 'original_expired'].includes(fileRow.status)) {
    return NextResponse.json({ error: '텍스트가 추출되지 않은 파일입니다. 다른 파일을 선택해주세요.' }, { status: 422 })
  }

  // Check analysis limit
  let payerId = userId
  try {
    payerId = (await reserveUsage(userId, 'pdf_analysis')).payerId
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const { template, version } = await getActivePrompt('ai_document')

  // Truncate pdf content to avoid token overflow
  const pdfContent = fileRow.extracted_text.slice(0, PDF_CONTENT_LIMIT)

  const category = await resolveProductCategory(categoryId)

  let basePrompt = renderPrompt(template, {
    pdf_content: pdfContent,
    age_group: ageGroup || '정보 없음',
    occupation: occupation || '정보 없음',
    customer_situation: customerSituation || '정보 없음',
    explanation_purpose: explanationPurpose,
    difficulty_level: difficultyLevel || '중간 (일반인)',
    format_style: formatStyle || '친근하고 쉽게',
    extra_requests: extraRequests || '없음',
  })
  const categoryAddendum = buildProductCategoryAddendum(category)
  if (categoryAddendum) basePrompt = `${basePrompt}\n\n${categoryAddendum}`
  const fullDisclaimer = category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER

  const groupPrompt = (group: readonly string[]) =>
    `${basePrompt}\n\n※ 위 섹션 중 아래 섹션만 작성하세요 (그 외 섹션은 작성하지 마세요): ${group.map(s => `[${s}]`).join(', ')}`

  const baseCacheInput = {
    fileId,
    ageGroup, occupation, customerSituation, explanationPurpose,
    difficultyLevel, formatStyle, extraRequests, categoryId: category?.id ?? null,
    // Include first 500 chars of PDF text to distinguish files in cache
    pdfPreview: fileRow.extracted_text.slice(0, 500),
  }

  async function runGroups(force: boolean) {
    return Promise.all(
      SECTION_GROUPS.map(({ sections, maxTokens }) => {
        const prompt = groupPrompt(sections)
        return generateWithAI(prompt, {
          feature: 'ai_document',
          userId,
          maxTokens,
          temperature: 0.6,
          cacheInput: { ...baseCacheInput, group: sections.join(',') },
          promptVersion: version,
          forceRegenerate: force,
        })
      })
    )
  }

  let results: Awaited<ReturnType<typeof generateWithAI>>[]
  let sections: Record<string, string>
  try {
    results = await runGroups(forceRegenerate)
    sections = Object.assign({}, ...results.map(r => parseOutputSections(r.text, fullDisclaimer)))

    // Stale cache from before a prompt/format change may not contain valid markers — bypass it once
    if (Object.keys(sections).length === 0 && results.some(r => r.cachedAt)) {
      results = await runGroups(true)
      sections = Object.assign({}, ...results.map(r => parseOutputSections(r.text, fullDisclaimer)))
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: user.id, area: 'ai', metadata: { feature: 'ai_document' } })
  }

  const wasCached = results.every(r => !!r.cachedAt)

  if (!wasCached) {
    await incrementUsage(payerId, 'pdf_analysis', {
      tokenInput: results.reduce((sum, r) => sum + r.usage.inputTokens, 0),
      tokenOutput: results.reduce((sum, r) => sum + r.usage.outputTokens, 0),
    })
    await trackFeatureComplete('ai_document', user.id, {
      fileId,
      explanationPurpose,
      difficultyLevel,
      cached: false,
    })
  }

  const afterCheck = await checkUsageLimit(user.id, 'pdf_analysis')

  return NextResponse.json({
    sections,
    rawText: results.map(r => r.text).join('\n\n'),
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: results[0].provider,
    model: results[0].model,
    promptVersion: version,
    fileName: fileRow.original_file_name,
  })
}
