import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fileRow } = await (supabase as any)
    .from('uploaded_files')
    .select('original_file_name, extracted_text, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!fileRow) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
  if (fileRow.status === 'deleted') return NextResponse.json({ error: '삭제된 파일입니다' }, { status: 410 })
  if (!fileRow.extracted_text) return NextResponse.json({ error: '추출된 텍스트가 없습니다' }, { status: 404 })

  const baseName = fileRow.original_file_name.replace(/\.pdf$/i, '')
  const fileName = `${baseName}_추출텍스트.txt`

  return new NextResponse(fileRow.extracted_text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
