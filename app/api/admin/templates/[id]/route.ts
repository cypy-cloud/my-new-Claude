import { NextRequest, NextResponse } from 'next/server'
import { adminGuard, isGuardError } from '@/lib/auth/middleware-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const { id } = await params
  const body = await request.json()
  const {
    title, description, category, feature_type,
    insurance_company_id, template_content, variables,
    tags, is_public, is_premium, is_active, sort_order
  } = body

  const { data, error } = await (createAdminClient() as any)
    .from('content_templates')
    .update({
      title, description, category, feature_type,
      insurance_company_id: insurance_company_id || null,
      template_content, variables, tags,
      is_public, is_premium, is_active, sort_order,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await adminGuard('admin')
  if (isGuardError(guard)) return guard

  const { id } = await params

  const { error } = await (createAdminClient() as any)
    .from('content_templates')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
