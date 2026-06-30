import { NextResponse } from 'next/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { getExpiredFiles, cleanupExpiredFiles } from '@/lib/files/cleanup'

// GET: 삭제 대상(만료된 원본 PDF) 개수 조회
export async function GET() {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const expired = await getExpiredFiles()
  return NextResponse.json({ expiredCount: expired.length })
}

// POST: 관리자 수동 정리 — 만료된 원본 PDF를 스토리지에서 삭제하고 상태를 변경
export async function POST() {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const result = await cleanupExpiredFiles()
  return NextResponse.json(result)
}
