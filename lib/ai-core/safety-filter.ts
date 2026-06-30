import type { SafetyWarning } from './types'

// 보험 가입 압박/불안 조장 표현 — 실제로 본문에서 제거된다 (필터링)
const RISK_EXPRESSIONS = [
  '무조건 가입',
  '안 들면 큰일',
  '지금 안 하면 손해',
  '가입 안 하면 후회',
  '오늘 안에 결정',
]

// 과장 표현 — 제거하지 않고 경고만 발생시킨다 (감지)
const EXAGGERATION_PATTERNS = [
  '무조건',
  '절대로',
  '완전 무료',
  '업계 최저',
  '업계 1위',
  '최고의 상품',
]

// 확정적 보장 표현 — 제거하지 않고 경고만 발생시킨다 (감지)
const GUARANTEE_PATTERNS = [
  '확정 보장',
  '반드시 지급',
  '확정 수익',
  '확정적으로',
  '무조건 지급',
  '100% 보장',
  '100% 지급',
]

function findMatches(text: string, patterns: string[]): string[] {
  return patterns.filter((p) => text.includes(p))
}

export function filterRiskExpressions(text: string): { text: string; removed: string[] } {
  const removed = findMatches(text, RISK_EXPRESSIONS)
  let result = text
  for (const phrase of removed) result = result.replaceAll(phrase, '')
  return { text: result, removed }
}

export function detectExaggeration(text: string, sectionKey?: string): SafetyWarning[] {
  return findMatches(text, EXAGGERATION_PATTERNS).map((phrase) => ({
    type: 'exaggeration' as const,
    phrase,
    sectionKey,
  }))
}

export function detectDefinitiveGuarantee(text: string, sectionKey?: string): SafetyWarning[] {
  return findMatches(text, GUARANTEE_PATTERNS).map((phrase) => ({
    type: 'definitive_guarantee' as const,
    phrase,
    sectionKey,
  }))
}

export function applySafetyFilter(sections: Record<string, string>): {
  sections: Record<string, string>
  warnings: SafetyWarning[]
} {
  const warnings: SafetyWarning[] = []
  const filtered: Record<string, string> = {}

  for (const [key, text] of Object.entries(sections)) {
    const { text: cleaned, removed } = filterRiskExpressions(text)
    filtered[key] = cleaned
    removed.forEach((phrase) => warnings.push({ type: 'risk_expression', phrase, sectionKey: key }))
    warnings.push(...detectExaggeration(text, key))
    warnings.push(...detectDefinitiveGuarantee(text, key))
  }

  return { sections: filtered, warnings }
}
