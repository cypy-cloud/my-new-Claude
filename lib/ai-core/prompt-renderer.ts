import type { AiCoreFeature } from './types'
import { FEATURE_CONFIG } from './types'

export class PromptValidationError extends Error {
  constructor(public readonly missing: string[]) {
    super(`필수 입력값이 누락되었습니다: ${missing.join(', ')}`)
    this.name = 'PromptValidationError'
  }
}

export function validateVars(feature: AiCoreFeature, vars: Record<string, string>): void {
  const { requiredVars } = FEATURE_CONFIG[feature]
  const missing = requiredVars.filter((key) => !vars[key]?.trim())
  if (missing.length > 0) throw new PromptValidationError(missing)
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''),
    template
  )
}
