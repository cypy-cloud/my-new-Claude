import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, teamMemberGuard, isGuardError } from '@/lib/team/guard'
import { getPlanLimits, type PlanId } from '@/lib/subscription/plans'
import { incrementUsage } from '@/lib/subscription/usage'
import type { TeamRole } from '@/lib/team/types'

type PdfParseResult = { text: string }
async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return { text: result.text }
  } finally {
    await parser.destroy()
  }
}

const MAX_TEXT_LENGTH = 50_000

function calcDeleteAfter(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// GET: 팀 자료 목록 (팀원 전체 / visibility 에 따라 필터)
export async function GET() {
  const guard = await teamMemberGuard()
  if (isGuardError(guard)) return guard

  const isAdmin = (guard.ctx.role as TeamRole) === 'owner' || (guard.ctx.role as TeamRole) === 'manager'
  const admin = createAdminClient()

  // Admin client 로 조회 후 visibility 필터를 앱 레이어에서 적용
  // (RLS가 이미 처리하지만, 관리자 유무에 따라 API가 반환 범위 결정)
  let query = (admin as any)
    .from('team_files')
    .select('id, team_id, uploaded_by, original_file_name, status, visibility, summary_text, delete_after, created_at')
    .eq('team_id', guard.ctx.teamId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isAdmin) {
    query = query.eq('visibility', 'team')
  }

  const { data: files, error } = await query
  if (error) {
    console.error('[team-files.list]', error)
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 })
  }

  // 업로더 이름 보강
  const uploaderIds = [...new Set((files ?? []).map((f: any) => f.uploaded_by))]
  const { data: profiles } = uploaderIds.length > 0
    ? await (admin as any).from('profiles').select('id, full_name').in('id', uploaderIds)
    : { data: [] }
  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name ?? null]))

  const result = (files ?? []).map((f: any) => ({
    ...f,
    uploader_name: nameMap.get(f.uploaded_by) ?? null,
  }))

  return NextResponse.json({ files: result, myRole: guard.ctx.role })
}

// POST: 팀 자료 업로드 (owner/manager 전용)
export async function POST(request: NextRequest) {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const admin = createAdminClient()

  // 업로더 플랜으로 파일 크기/보관 기간 결정
  const { data: profile } = await (admin as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', guard.ctx.userId)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  const limits = getPlanLimits(planId)

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const visibility = (formData.get('visibility') as string) || 'team'

  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다' }, { status: 400 })
  }
  if (!['team', 'managers_only'].includes(visibility)) {
    return NextResponse.json({ error: '잘못된 공개 범위입니다' }, { status: 400 })
  }

  const fileSizeMb = file.size / (1024 * 1024)
  if (fileSizeMb > limits.maxFileSizeMb) {
    return NextResponse.json(
      { error: `파일 크기가 ${limits.maxFileSizeMb}MB를 초과했습니다 (현재 ${fileSizeMb.toFixed(1)}MB)` },
      { status: 400 }
    )
  }

  // DB 레코드 생성
  const { data: fileRecord, error: insertError } = await (admin as any)
    .from('team_files')
    .insert({
      team_id: guard.ctx.teamId,
      uploaded_by: guard.ctx.userId,
      original_file_name: file.name,
      status: 'processing',
      visibility,
      delete_after: calcDeleteAfter(limits.storageDays),
    })
    .select('id')
    .single()

  if (insertError || !fileRecord) {
    console.error('[team-files.upload] insert failed:', insertError)
    return NextResponse.json({ error: '파일 등록 실패' }, { status: 500 })
  }

  const fileId = fileRecord.id
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // PDF 텍스트 추출
  let extractedText: string | null = null
  let status: 'completed' | 'failed' = 'completed'
  let errorNote: string | null = null

  try {
    const parsed = await parsePdf(fileBuffer)
    const rawText = parsed.text?.trim() ?? ''
    if (!rawText || rawText.length < 20) {
      status = 'failed'
      errorNote = '텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF는 현재 지원되지 않습니다.'
    } else {
      extractedText = rawText.slice(0, MAX_TEXT_LENGTH)
    }
  } catch {
    status = 'failed'
    errorNote = 'PDF 파싱 중 오류가 발생했습니다.'
  }

  // 스토리지 업로드: teams/{team_id}/{fileId}/{filename}
  let storagePath: string | null = null
  try {
    const objectPath = `teams/${guard.ctx.teamId}/${fileId}/${file.name}`
    const { error: uploadError } = await (admin as any).storage
      .from('pdf-uploads')
      .upload(objectPath, fileBuffer, { contentType: 'application/pdf', upsert: false })
    if (!uploadError) storagePath = objectPath
  } catch {
    // 스토리지 실패는 비중요 — 텍스트 추출 결과는 DB에 보관
  }

  // DB 업데이트
  await (admin as any)
    .from('team_files')
    .update({
      status,
      extracted_text: extractedText,
      storage_path: storagePath,
      summary_text: errorNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId)

  await incrementUsage(guard.ctx.userId, 'pdf_upload')

  return NextResponse.json({
    id: fileId,
    status,
    fileName: file.name,
    fileSizeMb: parseFloat(fileSizeMb.toFixed(2)),
    visibility,
    errorMessage: errorNote,
  })
}
