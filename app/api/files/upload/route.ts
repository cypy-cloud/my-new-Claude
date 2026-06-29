import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, type PlanId } from '@/lib/subscription/plans'
import { incrementUsage } from '@/lib/subscription/usage'
import { trackEvent } from '@/lib/analytics/track'
import { logError } from '@/lib/errors/logger'
type PdfParseResult = { text: string; numpages: number }
async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return { text: result.text, numpages: result.pages.length }
  } finally {
    await parser.destroy()
  }
}

const MAX_TEXT_LENGTH = 50_000

function calcDeleteAfter(storageDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + storageDays)
  return d.toISOString()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  // Get user plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  const planId = (profile?.plan_type as PlanId) ?? 'free'
  const limits = getPlanLimits(planId)

  // Check monthly upload count
  const month = new Date().toISOString().slice(0, 7)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usageRow } = await (supabase as any)
    .from('usage_records')
    .select('pdf_upload_count')
    .eq('user_id', user.id)
    .eq('usage_month', month)
    .maybeSingle()

  const currentUploadCount = usageRow?.pdf_upload_count ?? 0
  if (currentUploadCount >= limits.pdfUploadLimit) {
    return NextResponse.json(
      { error: `이번 달 PDF 업로드 한도(${limits.pdfUploadLimit}개)를 초과했습니다. 요금제를 업그레이드해주세요.`, limitExceeded: true },
      { status: 429 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

  // Validate type
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다' }, { status: 400 })
  }

  // Validate size
  const fileSizeMb = file.size / (1024 * 1024)
  if (fileSizeMb > limits.maxFileSizeMb) {
    return NextResponse.json(
      { error: `파일 크기가 ${limits.maxFileSizeMb}MB를 초과했습니다 (현재 ${fileSizeMb.toFixed(1)}MB)` },
      { status: 400 }
    )
  }

  // Create DB record with processing status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fileRecord, error: insertError } = await (supabase as any)
    .from('uploaded_files')
    .insert({
      user_id: user.id,
      original_file_name: file.name,
      file_size_mb: parseFloat(fileSizeMb.toFixed(3)),
      file_type: 'pdf',
      status: 'processing',
      delete_after: calcDeleteAfter(limits.storageDays),
    })
    .select('id')
    .single()

  if (insertError || !fileRecord) {
    await logError(insertError, { userId: user.id, area: 'upload', severity: 'high', metadata: { fileName: file.name } })
    return NextResponse.json({ error: '파일 등록에 실패했습니다' }, { status: 500 })
  }

  const fileId = fileRecord.id

  // Extract text from PDF in-memory (no storage needed for extracted text flow)
  let extractedText: string | null = null
  let status: 'completed' | 'failed' = 'completed'
  let errorNote: string | null = null

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parsePdf(buffer)
    const rawText = parsed.text?.trim() ?? ''

    if (!rawText || rawText.length < 20) {
      // Scanned PDF — no extractable text
      status = 'failed'
      errorNote = '텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF는 현재 지원되지 않습니다.'
    } else {
      extractedText = rawText.slice(0, MAX_TEXT_LENGTH)
    }
  } catch (parseErr) {
    status = 'failed'
    errorNote = 'PDF 파싱 중 오류가 발생했습니다. 파일이 손상되었거나 암호화된 PDF일 수 있습니다.'
    await logError(parseErr, { userId: user.id, area: 'upload', severity: 'medium', metadata: { fileName: file.name, fileId } })
  }

  // Upload original PDF to Supabase Storage (best effort)
  let storagePath: string | null = null
  try {
    const storageBucket = 'pdf-uploads'
    const objectPath = `${user.id}/${fileId}/${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: uploadError } = await (supabase as any).storage
      .from(storageBucket)
      .upload(objectPath, buffer, { contentType: 'application/pdf', upsert: false })
    if (!uploadError) storagePath = objectPath
  } catch {
    // non-critical — continue without storage
  }

  // Update DB record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('uploaded_files')
    .update({
      status,
      extracted_text: extractedText,
      storage_path: storagePath,
      summary_text: errorNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId)

  // Increment usage (even on text extraction failure — file was processed)
  await incrementUsage(user.id, 'pdf_upload')
  await trackEvent('document_upload_complete', {
    userId: user.id,
    featureType: 'ai_document',
    metadata: { fileName: file.name, fileSizeMb, status },
  })

  return NextResponse.json({
    id: fileId,
    status,
    extractedText: status === 'completed' ? extractedText : null,
    errorMessage: errorNote,
    fileName: file.name,
    fileSizeMb,
    deleteAfter: calcDeleteAfter(limits.storageDays),
  })
}
