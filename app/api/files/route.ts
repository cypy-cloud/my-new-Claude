import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/errors/logger'

// GET /api/files — list user's uploaded files
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('uploaded_files')
    .select('id, original_file_name, file_size_mb, status, summary_text, delete_after, created_at')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    await logError(error, { userId: user.id, area: 'database', severity: 'medium' })
    const detail = process.env.NODE_ENV === 'development' ? error.message : undefined
    return NextResponse.json({ error: '조회에 실패했습니다', detail }, { status: 500 })
  }

  return NextResponse.json({ files: data ?? [] })
}

// DELETE /api/files?id=xxx — soft delete a file
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  const { data: fileRow } = await (supabase as any)
    .from('uploaded_files')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Remove from storage if exists (best effort)
  if (fileRow?.storage_path) {
    try {
      await (supabase as any).storage.from('pdf-uploads').remove([fileRow.storage_path])
    } catch { /* non-critical */ }
  }

  // Soft delete
  const { error } = await (supabase as any)
    .from('uploaded_files')
    .update({ status: 'deleted', extracted_text: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
