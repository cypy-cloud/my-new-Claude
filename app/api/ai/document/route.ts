import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { blockIfLimitExceeded, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { trackFeatureComplete } from '@/lib/analytics/track'

const DISCLAIMER = '\n\n【필수 고지문】\n본 자료는 업로드된 자료를 바탕으로 AI가 작성한 참고용 설명자료입니다. 실제 보장 여부, 보험금 지급 여부, 가입 가능 여부는 해당 보험회사의 약관, 인수기준, 심사결과에 따라 달라질 수 있습니다.'

const SECTION_MARKERS = ['SUMMARY', 'COVERAGE', 'MISCONCEPTIONS', 'CHECKLIST', 'EXCLUSIONS', 'QNA', 'AGENT_SCRIPT', 'CAUTION']

const PDF_CONTENT_LIMIT = 12_000

function parseOutputSections(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const marker = SECTION_MARKERS[i]
    const nextMarker = SECTION_MARKERS[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue
    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim() + DISCLAIMER
  }
  return result
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

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
    forceRegenerate = false,
  } = body

  if (!fileId) return NextResponse.json({ error: '파일을 선택해주세요' }, { status: 400 })
  if (!explanationPurpose) return NextResponse.json({ error: '설명 목적을 입력해주세요' }, { status: 400 })

  // Fetch the uploaded file's extracted text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fileRow } = await (supabase as any)
    .from('uploaded_files')
    .select('original_file_name, extracted_text, status')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single()

  if (!fileRow) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
  if (fileRow.status === 'deleted') return NextResponse.json({ error: '삭제된 파일입니다' }, { status: 410 })
  if (!fileRow.extracted_text || fileRow.status !== 'completed') {
    return NextResponse.json({ error: '텍스트가 추출되지 않은 파일입니다. 다른 파일을 선택해주세요.' }, { status: 422 })
  }

  // Check analysis limit
  try {
    await blockIfLimitExceeded(user.id, 'pdf_analysis')
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

  const prompt = renderPrompt(template, {
    pdf_content: pdfContent,
    age_group: ageGroup || '정보 없음',
    occupation: occupation || '정보 없음',
    customer_situation: customerSituation || '정보 없음',
    explanation_purpose: explanationPurpose,
    difficulty_level: difficultyLevel || '중간 (일반인)',
    format_style: formatStyle || '친근하고 쉽게',
    extra_requests: extraRequests || '없음',
  })

  const cacheInput = {
    fileId,
    ageGroup, occupation, customerSituation, explanationPurpose,
    difficultyLevel, formatStyle, extraRequests,
    // Include first 500 chars of PDF text to distinguish files in cache
    pdfPreview: fileRow.extracted_text.slice(0, 500),
  }

  let result
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_document',
      userId: user.id,
      maxTokens: 3000,
      temperature: 0.6,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
    })
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다. 다시 시도해주세요.' }, { status: 500 })
  }

  const wasCached = !!result.cachedAt
  const sections = parseOutputSections(result.text)

  if (!wasCached) {
    await incrementUsage(user.id, 'pdf_analysis', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
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
    rawText: result.text,
    cached: wasCached,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
    promptVersion: version,
    fileName: fileRow.original_file_name,
  })
}
