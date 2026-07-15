import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamMemberGuard, isGuardError } from '@/lib/team/guard'
import { generateWithAI, DuplicateRequestError } from '@/lib/ai/provider'
import { getActivePrompt, renderPrompt } from '@/lib/ai/prompts/prompt-versioning'
import { reserveUsage, checkUsageLimit, incrementUsage, UsageLimitError } from '@/lib/subscription/usage'
import { resolveProductCategory, buildProductCategoryAddendum } from '@/lib/ai-core/product-category'
import { handleApiError } from '@/lib/errors/api-error-handler'
import type { TeamRole } from '@/lib/team/types'

const DISCLAIMER = '\n\n【필수 고지문】\n본 자료는 업로드된 자료를 바탕으로 AI가 작성한 참고용 설명자료입니다. 실제 보장 여부, 보험금 지급 여부, 가입 가능 여부는 해당 보험회사의 약관, 인수기준, 심사결과에 따라 달라질 수 있습니다.'
const SECTION_MARKERS = ['SUMMARY', 'COVERAGE', 'MISCONCEPTIONS', 'CHECKLIST', 'EXCLUSIONS', 'QNA', 'AGENT_SCRIPT', 'CAUTION']
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

// POST: 팀 자료 기반 AI 설명자료 생성 (팀원 전체 가능 — visibility 에 따라 접근 제한)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await teamMemberGuard()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const isAdmin = (guard.ctx.role as TeamRole) === 'owner' || (guard.ctx.role as TeamRole) === 'manager'
  const admin = createAdminClient()

  // 파일 조회 (추출 텍스트 포함)
  const { data: teamFile } = await (admin as any)
    .from('team_files')
    .select('id, team_id, original_file_name, extracted_text, status, visibility')
    .eq('id', id)
    .eq('team_id', guard.ctx.teamId)
    .maybeSingle()

  if (!teamFile) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
  if (teamFile.status === 'deleted') return NextResponse.json({ error: '삭제된 파일입니다' }, { status: 410 })
  if (teamFile.visibility === 'managers_only' && !isAdmin) {
    return NextResponse.json({ error: '관리자만 접근 가능한 자료입니다' }, { status: 403 })
  }
  if (!teamFile.extracted_text || !['completed', 'original_expired'].includes(teamFile.status)) {
    return NextResponse.json({ error: '텍스트가 추출되지 않은 파일입니다' }, { status: 422 })
  }

  // 요청자의 pdf_analysis 한도 확인 (본인 한도 소진 시 팀장 한도에서 대여)
  let payerId = guard.ctx.userId
  try {
    payerId = (await reserveUsage(guard.ctx.userId, 'pdf_analysis')).payerId
  } catch (err) {
    if (err instanceof UsageLimitError) {
      return NextResponse.json(
        { error: err.message, limitExceeded: true, check: err.check },
        { status: 429 }
      )
    }
    throw err
  }

  const body = await request.json()
  const {
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

  if (!explanationPurpose) return NextResponse.json({ error: '설명 목적을 입력해주세요' }, { status: 400 })

  const { template, version } = await getActivePrompt('ai_document')
  const pdfContent = teamFile.extracted_text.slice(0, PDF_CONTENT_LIMIT)
  const category = await resolveProductCategory(categoryId)

  let prompt = renderPrompt(template, {
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
  if (categoryAddendum) prompt = `${prompt}\n\n${categoryAddendum}`
  const fullDisclaimer = category?.riskNotice ? `${DISCLAIMER}\n${category.riskNotice}` : DISCLAIMER

  const cacheInput = {
    teamFileId: id,
    ageGroup, occupation, customerSituation, explanationPurpose,
    difficultyLevel, formatStyle, extraRequests, categoryId: category?.id ?? null,
    pdfPreview: teamFile.extracted_text.slice(0, 500),
  }

  let result
  let sections: Record<string, string>
  try {
    result = await generateWithAI(prompt, {
      feature: 'ai_document',
      userId: guard.ctx.userId,
      maxTokens: 3000,
      temperature: 0.6,
      cacheInput,
      promptVersion: version,
      forceRegenerate,
    })
    sections = parseOutputSections(result.text, fullDisclaimer)

    if (Object.keys(sections).length === 0 && result.cachedAt) {
      result = await generateWithAI(prompt, {
        feature: 'ai_document',
        userId: guard.ctx.userId,
        maxTokens: 3000,
        temperature: 0.6,
        cacheInput,
        promptVersion: version,
        forceRegenerate: true,
      })
      sections = parseOutputSections(result.text, fullDisclaimer)
    }
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      return NextResponse.json({ error: err.message, duplicate: true }, { status: 409 })
    }
    return handleApiError(err, { userId: guard.ctx.userId, area: 'ai', metadata: { feature: 'team_document' } })
  }

  if (!result.cachedAt) {
    await incrementUsage(payerId, 'pdf_analysis', {
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
    })
  }

  const afterCheck = await checkUsageLimit(guard.ctx.userId, 'pdf_analysis')

  return NextResponse.json({
    sections,
    rawText: result.text,
    cached: !!result.cachedAt,
    remaining: afterCheck.remaining,
    provider: result.provider,
    model: result.model,
    promptVersion: version,
    fileName: teamFile.original_file_name,
  })
}
