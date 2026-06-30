import { createAdminClient } from '@/lib/supabase/admin'

export { ORIGINAL_DELETED_NOTICE } from './constants'

const STORAGE_BUCKET = 'pdf-uploads'

export interface ExpiredFile {
  id: string
  storage_path: string | null
  original_file_name: string
}

// delete_after 기준 삭제 대상 조회 — 보관 기간이 지났고 아직 원본이 정리되지 않은 파일
export async function getExpiredFiles(): Promise<ExpiredFile[]> {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('uploaded_files')
    .select('id, storage_path, original_file_name')
    .not('delete_after', 'is', null)
    .lte('delete_after', new Date().toISOString())
    .not('status', 'in', '("deleted","original_expired")')

  if (error) throw error
  return data ?? []
}

// 스토리지 원본 삭제 (storage_path가 없으면 아무 작업도 하지 않음)
export async function deleteOriginalFile(storagePath: string | null): Promise<void> {
  if (!storagePath) return
  const supabase = createAdminClient()
  await (supabase as any).storage.from(STORAGE_BUCKET).remove([storagePath])
}

// DB 상태를 original_expired로 변경 — extracted_text / summary_text / 생성 결과물은 그대로 유지
export async function markFileAsDeleted(fileId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('uploaded_files')
    .update({
      status: 'original_expired',
      storage_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId)

  if (error) throw error
}

export interface CleanupResult {
  checked: number
  deleted: number
  failed: number
}

// 만료 대상을 조회하여 원본 스토리지 삭제 + DB 상태 변경까지 일괄 수행
// 관리자 수동 정리 버튼과 추후 cron job 양쪽에서 그대로 재사용 가능한 구조
export async function cleanupExpiredFiles(): Promise<CleanupResult> {
  const expired = await getExpiredFiles()
  let deleted = 0
  let failed = 0

  for (const file of expired) {
    try {
      await deleteOriginalFile(file.storage_path)
      await markFileAsDeleted(file.id)
      deleted++
    } catch {
      failed++
    }
  }

  return { checked: expired.length, deleted, failed }
}
