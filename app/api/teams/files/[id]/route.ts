import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamAdminGuard, isGuardError } from '@/lib/team/guard'

// DELETE: 팀 자료 삭제 (owner/manager 전용, 소프트 삭제 + 스토리지 정리)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await teamAdminGuard()
  if (isGuardError(guard)) return guard

  const { id } = await params
  const admin = createAdminClient()

  const { data: file } = await (admin as any)
    .from('team_files')
    .select('id, team_id, storage_path, status')
    .eq('id', id)
    .eq('team_id', guard.ctx.teamId)
    .maybeSingle()

  if (!file) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
  if (file.status === 'deleted') return NextResponse.json({ error: '이미 삭제된 파일입니다' }, { status: 410 })

  // 스토리지에서 원본 삭제 (비중요)
  if (file.storage_path) {
    try {
      await (admin as any).storage.from('pdf-uploads').remove([file.storage_path])
    } catch {
      // 스토리지 실패는 무시, DB 상태만 업데이트
    }
  }

  const { error } = await (admin as any)
    .from('team_files')
    .update({
      status: 'deleted',
      extracted_text: null,
      storage_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[team-files.delete]', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
