import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { toCSV } from '@/lib/files/csv'
import { handleApiError } from '@/lib/errors/api-error-handler'

type ExportType = 'files' | 'outputs' | 'usage' | 'errors'

const EXPORT_LABELS: Record<ExportType, string> = {
  files: '업로드파일목록',
  outputs: '생성결과물',
  usage: '사용량기록',
  errors: '에러로그',
}

async function buildCSV(supabase: any, type: ExportType): Promise<string> {
  if (type === 'files') {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('id, user_id, original_file_name, file_size_mb, status, delete_after, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    return toCSV(
      ['id', 'user_id', '파일명', '크기(MB)', '상태', '삭제예정일', '업로드일'],
      (data ?? []).map((f: { id: string; user_id: string; original_file_name: string; file_size_mb: number; status: string; delete_after: string | null; created_at: string }) => [
        f.id, f.user_id, f.original_file_name, String(f.file_size_mb), f.status, f.delete_after ?? '-', f.created_at,
      ])
    )
  }

  if (type === 'outputs') {
    const { data, error } = await supabase
      .from('generated_outputs')
      .select('id, user_id, type, title, prompt_version, is_favorite, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    return toCSV(
      ['id', 'user_id', '유형', '제목', '프롬프트버전', '즐겨찾기', '생성일'],
      (data ?? []).map((o: { id: string; user_id: string; type: string; title: string; prompt_version: string | null; is_favorite: boolean; created_at: string }) => [
        o.id, o.user_id, o.type, o.title, o.prompt_version ?? '-', String(o.is_favorite), o.created_at,
      ])
    )
  }

  if (type === 'usage') {
    const { data, error } = await supabase
      .from('usage_records')
      .select('user_id, usage_month, sms_count, script_count, pdf_upload_count, pdf_analysis_count, ai_token_input, ai_token_output, ai_cost_estimate')
      .order('usage_month', { ascending: false })
      .limit(5000)
    if (error) throw error
    return toCSV(
      ['user_id', '월', 'AI문자', 'AI스크립트', 'PDF업로드', 'PDF분석', '입력토큰', '출력토큰', '비용(USD)'],
      (data ?? []).map((r: { user_id: string; usage_month: string; sms_count: number; script_count: number; pdf_upload_count: number; pdf_analysis_count: number; ai_token_input: number; ai_token_output: number; ai_cost_estimate: number }) => [
        r.user_id, r.usage_month, String(r.sms_count), String(r.script_count), String(r.pdf_upload_count),
        String(r.pdf_analysis_count), String(r.ai_token_input), String(r.ai_token_output), r.ai_cost_estimate.toFixed(6),
      ])
    )
  }

  // errors
  const { data, error } = await supabase
    .from('error_logs')
    .select('id, user_id, area, severity, error_message, resolved, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (error) throw error
  return toCSV(
    ['id', 'user_id', '영역', '심각도', '에러메시지', '해결됨', '발생일'],
    (data ?? []).map((e: { id: string; user_id: string | null; area: string; severity: string; error_message: string; resolved: boolean; created_at: string }) => [
      e.id, e.user_id ?? '-', e.area, e.severity, e.error_message, String(e.resolved), e.created_at,
    ])
  )
}

// GET /api/admin/export?type=files|outputs|usage|errors — 관리자용 CSV 내보내기
// GET /api/admin/export?logs=1 — 최근 백업 이력 조회
export async function GET(request: NextRequest) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const supabase = createAdminClient()

  if (request.nextUrl.searchParams.get('logs') === '1') {
    const { data } = await (supabase as any)
      .from('backup_logs')
      .select('id, user_id, backup_type, status, file_path, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    return NextResponse.json({ logs: data ?? [] })
  }

  const type = request.nextUrl.searchParams.get('type') as ExportType | null
  if (!type || !EXPORT_LABELS[type]) {
    return NextResponse.json({ error: '내보낼 데이터 종류를 지정해주세요 (files, outputs, usage, errors)' }, { status: 400 })
  }

  try {
    const csv = await buildCSV(supabase, type)
    const date = new Date().toISOString().slice(0, 10)
    const fileName = `${EXPORT_LABELS[type]}_${date}.csv`

    await (supabase as any).from('backup_logs').insert({
      user_id: guard.ctx.userId,
      backup_type: 'admin_csv',
      status: 'completed',
      file_path: fileName,
    })

    return new NextResponse(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  } catch (err) {
    await (supabase as any).from('backup_logs').insert({
      user_id: guard.ctx.userId,
      backup_type: 'admin_csv',
      status: 'failed',
      file_path: null,
    })
    return handleApiError(err, { userId: guard.ctx.userId, area: 'admin', metadata: { type } })
  }
}
