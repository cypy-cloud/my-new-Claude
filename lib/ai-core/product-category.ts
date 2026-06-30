import { createClient } from '@/lib/supabase/server'

export interface ProductCategoryContext {
  id: string
  name: string
  description: string | null
  riskNotice: string | null
}

// Looks up an active product category by id. Returns null when categoryId is
// missing or doesn't match an active row (graceful fallback — no category info applied).
export async function resolveProductCategory(categoryId: string | undefined | null): Promise<ProductCategoryContext | null> {
  if (!categoryId) return null

  try {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('product_categories')
      .select('id, name, description, risk_notice')
      .eq('id', categoryId)
      .eq('is_active', true)
      .maybeSingle()

    if (!data) return null

    return {
      id: data.id,
      name: data.name,
      description: data.description ?? null,
      riskNotice: data.risk_notice ?? null,
    }
  } catch {
    return null
  }
}

// Prompt addendum injected so the model is aware of the structured product category
// (in addition to whatever free-text product field the feature's own form collects).
export function buildProductCategoryAddendum(category: ProductCategoryContext | null): string {
  if (!category) return ''

  const parts = [`[보험상품 카테고리: ${category.name}]`]
  if (category.description) parts.push(`- 카테고리 설명: ${category.description}`)
  if (category.riskNotice) parts.push(`- 카테고리 유의사항: ${category.riskNotice}`)
  return parts.join('\n')
}
