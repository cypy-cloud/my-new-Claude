export type RiskLevel = 'low' | 'medium' | 'high'
export type IssueSeverity = 'warning' | 'danger'

export interface SafetyIssue {
  category: string
  categoryLabel: string
  severity: IssueSeverity
  flaggedText: string
  explanation: string
  suggestion: string
}

interface DetectionRule {
  category: string
  categoryLabel: string
  severity: IssueSeverity
  patterns: RegExp[]
  explanation: string
  suggestion: string
}

const RULES: DetectionRule[] = [
  {
    category: 'guaranteed_coverage',
    categoryLabel: '확정적 보장 표현',
    severity: 'danger',
    patterns: [
      /반드시\s*(보장|지급|받으실)/,
      /무조건\s*(보장|지급|됩니다)/,
      /100\s*%\s*(보장|지급)/,
      /절대\s*(보장|안전|손해\s*없)/,
      /확실히\s*보장/,
      /보장해\s*드립니다/,
      /보장됩니다/,
      /완벽하게\s*보장/,
    ],
    explanation: '확정적 보장 표현은 금융소비자보호법 위반 소지가 있습니다.',
    suggestion: '"조건에 따라 지급될 수 있습니다" 또는 "약관 기준으로 검토됩니다"로 대체하세요.',
  },
  {
    category: 'guaranteed_return',
    categoryLabel: '확정 수익률 표현',
    severity: 'danger',
    patterns: [
      /\d+(\.\d+)?\s*%\s*(의\s*)?(수익|이익|이자)\s*보장/,
      /원금\s*보장/,
      /확정\s*(금리|이율|수익률|수익)/,
      /이율\s*보장/,
      /수익률\s*보장/,
      /이자\s*보장/,
    ],
    explanation: '확정 수익률 제시는 자본시장법 위반 소지가 있습니다.',
    suggestion: '"과거 실적 기준 참고값이며 미래 수익을 보장하지 않습니다"라는 문구를 추가하세요.',
  },
  {
    category: 'claim_guarantee',
    categoryLabel: '보험금 지급 보장',
    severity: 'danger',
    patterns: [
      /보험금.{0,15}(반드시|무조건|꼭).{0,10}(받|지급)/,
      /반드시.{0,10}보험금/,
      /보험금\s*지급\s*보장/,
      /꼭\s*지급/,
      /보험금을\s*드립니다/,
    ],
    explanation: '보험금 지급은 약관 심사 후 결정되므로 사전 보장 표현은 부적절합니다.',
    suggestion: '"약관 조건 충족 시 보험금이 지급됩니다"로 수정하세요.',
  },
  {
    category: 'fear_inducing',
    categoryLabel: '과도한 불안 조장',
    severity: 'warning',
    patterns: [
      /지금\s*(당장\s*)?(안\s*하시면|하지\s*않으시면|가입\s*안\s*하시면)/,
      /나중에\s*(후회|큰일|문제가\s*생)/,
      /큰일\s*(납니다|날\s*수\s*있)/,
      /최악의\s*경우/,
      /가족이\s*(위험|고생|힘들)/,
      /돌이킬\s*수\s*없/,
      /평생\s*후회/,
    ],
    explanation: '과도한 불안 조장은 소비자의 합리적 판단을 방해할 수 있습니다.',
    suggestion: '긍정적인 보장 혜택 중심으로 표현을 전환하세요.',
  },
  {
    category: 'medical_legal_claim',
    categoryLabel: '의료/법률 단정 표현',
    severity: 'danger',
    patterns: [
      /의학적으로\s*(확인|보장|증명|입증)/,
      /법적으로\s*(보장|확인|보호|인정)/,
      /치료가\s*(됩니다|가능합니다|됩니다)/,
      /완치\s*(됩니다|가능|됩니다)/,
      /법률상\s*보장/,
      /의사가\s*(인정|확인)/,
    ],
    explanation: '의료/법률적 단정 표현은 전문가 영역으로 보험 설계사가 사용할 수 없습니다.',
    suggestion: '"의사/법률 전문가와 상담하시기 바랍니다"로 수정하세요.',
  },
  {
    category: 'competitor_comparison',
    categoryLabel: '특정 회사 과장 비교',
    severity: 'warning',
    patterns: [
      /타사\s*(대비|보다)\s*(월등|훨씬|압도|더\s*좋)/,
      /업계\s*(최고|1위|최저|유일)/,
      /(삼성|한화|교보|현대|롯데|흥국|동양|AIA|메트라이프|신한|KB|NH)\s*(보다|대비|와\s*비교)/,
      /경쟁사\s*(대비|보다)\s*(우수|좋은|저렴)/,
    ],
    explanation: '특정 회사와의 비교 광고는 금융광고 규정에 저촉될 수 있습니다.',
    suggestion: '구체적인 회사명 비교를 삭제하거나 "업계 평균 기준" 등 중립적 표현으로 수정하세요.',
  },
  {
    category: 'false_claim',
    categoryLabel: '허위 가능성 표현',
    severity: 'danger',
    patterns: [
      /모든\s*(질병|사고|상해|치료)\s*(보장|보상|처리)/,
      /전액\s*(보상|지급|보장|환급)/,
      /완전\s*무료/,
      /어떤.{0,8}(경우에도|상황에도)\s*(보장|지급)/,
      /예외\s*없이\s*(보장|지급)/,
    ],
    explanation: '모든/전액/완전 등의 표현은 실제 약관과 다를 수 있어 허위 표시 소지가 있습니다.',
    suggestion: '"주요 질병 기준" 또는 "약관 규정 범위 내에서" 등 조건을 명시하세요.',
  },
  {
    category: 'misleading',
    categoryLabel: '고객 오해 가능 표현',
    severity: 'warning',
    patterns: [
      /무료로\s*(가입|제공|보장|이용)/,
      /공짜로/,
      /조건\s*없이\s*(가입|보장|지급)/,
      /심사\s*없이/,
      /누구나\s*(가입|보장|이용)/,
      /거절\s*없이/,
      /묻지도\s*따지지도\s*않고/,
    ],
    explanation: '오해를 유발할 수 있는 표현은 민원 및 분쟁의 원인이 됩니다.',
    suggestion: '실제 가입 조건과 절차를 명확히 안내하는 문구로 수정하세요.',
  },
]

export function checkSafety(text: string): { riskLevel: RiskLevel; issues: SafetyIssue[] } {
  const issues: SafetyIssue[] = []

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern)
      if (match) {
        issues.push({
          category: rule.category,
          categoryLabel: rule.categoryLabel,
          severity: rule.severity,
          flaggedText: match[0],
          explanation: rule.explanation,
          suggestion: rule.suggestion,
        })
        break
      }
    }
  }

  const hasDanger = issues.some(i => i.severity === 'danger')
  const hasWarning = issues.some(i => i.severity === 'warning')
  const riskLevel: RiskLevel = hasDanger ? 'high' : hasWarning ? 'medium' : 'low'

  return { riskLevel, issues }
}
