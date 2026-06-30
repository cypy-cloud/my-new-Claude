import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackEvent } from '@/lib/analytics/track'
import { toCSV } from '@/lib/files/csv'
const JSZip = require('jszip') as new () => import('jszip')

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 80)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const zip = new JSZip()

  // ── 1. Generated outputs (문자카톡 / 상담스크립트 / 고객설명자료) ──────────
  const { data: outputs } = await (supabase as any)
    .from('generated_outputs')
    .select('id, type, title, output_text, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const folderMap: Record<string, string> = {
    sms: '문자카톡',
    script: '상담스크립트',
    pdf_explanation: '고객설명자료',
  }

  for (const out of (outputs ?? [])) {
    const folder = folderMap[out.type] ?? '기타'
    const date = out.created_at.slice(0, 10)
    const fname = `${sanitizeFilename(out.title)}_${date}.txt`
    zip.folder(folder)?.file(fname, out.output_text ?? '')
  }

  // ── 2. Uploaded files — extracted text + original PDF (if not expired) ──
  const { data: uploadedFiles } = await (supabase as any)
    .from('uploaded_files')
    .select('id, original_file_name, file_size_mb, status, extracted_text, storage_path, delete_after, created_at')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  const now = new Date()

  // Extracted summaries
  for (const f of (uploadedFiles ?? [])) {
    if (f.extracted_text) {
      const fname = `${sanitizeFilename(f.original_file_name.replace(/\.pdf$/i, ''))}_추출텍스트.txt`
      zip.folder('추출요약본')?.file(fname, f.extracted_text)
    }
  }

  // Original PDFs — only if not expired and storage_path exists
  const pdfFiles = (uploadedFiles ?? []).filter((f: { delete_after: string | null; storage_path: string | null; status: string }) => {
    if (!f.storage_path || f.status === 'deleted') return false
    if (!f.delete_after) return true
    return new Date(f.delete_after) > now
  })

  for (const f of pdfFiles) {
    try {
      const { data: fileData, error } = await (supabase as any).storage
        .from('pdf-uploads')
        .download(f.storage_path)
      if (!error && fileData) {
        const arrayBuffer = await (fileData as Blob).arrayBuffer()
        zip.folder('원본PDF')?.file(sanitizeFilename(f.original_file_name), arrayBuffer)
      }
    } catch { /* skip unavailable files */ }
  }

  // ── 3. 업로드파일목록.csv ──────────────────────────────────────────────────
  const fileListRows = (uploadedFiles ?? []).map((f: {
    original_file_name: string; file_size_mb: number; status: string
    delete_after: string | null; created_at: string
  }) => [
    f.original_file_name,
    `${f.file_size_mb.toFixed(2)}MB`,
    f.status,
    f.delete_after ? f.delete_after.slice(0, 10) : '-',
    f.created_at.slice(0, 10),
  ])
  zip.file('업로드파일목록.csv', toCSV(
    ['파일명', '크기', '상태', '삭제예정일', '업로드일'],
    fileListRows
  ))

  // ── 4. 사용량기록.csv ─────────────────────────────────────────────────────
  const { data: usageRows } = await (supabase as any)
    .from('usage_records')
    .select('usage_month, sms_count, script_count, pdf_upload_count, pdf_analysis_count, ai_token_input, ai_token_output, ai_cost_estimate')
    .eq('user_id', user.id)
    .order('usage_month', { ascending: false })

  const usageCsvRows = (usageRows ?? []).map((r: {
    usage_month: string; sms_count: number; script_count: number
    pdf_upload_count: number; pdf_analysis_count: number
    ai_token_input: number; ai_token_output: number; ai_cost_estimate: number
  }) => [
    r.usage_month,
    String(r.sms_count),
    String(r.script_count),
    String(r.pdf_upload_count),
    String(r.pdf_analysis_count),
    String(r.ai_token_input),
    String(r.ai_token_output),
    r.ai_cost_estimate.toFixed(6),
  ])
  zip.file('사용량기록.csv', toCSV(
    ['월', 'AI문자', 'AI스크립트', 'PDF업로드', 'PDF분석', '입력토큰', '출력토큰', '비용(USD)'],
    usageCsvRows
  ))

  // ── Generate ZIP ──────────────────────────────────────────────────────────
  const zipBuffer: Buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer

  await trackEvent('backup_download', { userId: user.id, metadata: {
    outputCount: (outputs ?? []).length,
    fileCount: (uploadedFiles ?? []).length,
  }})

  const date = new Date().toISOString().slice(0, 10)
  const fileName = `FP_AI_백업_${date}.zip`

  await (supabase as any).from('backup_logs').insert({
    user_id: user.id,
    backup_type: 'user_zip',
    status: 'completed',
    file_path: fileName,
  })

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
