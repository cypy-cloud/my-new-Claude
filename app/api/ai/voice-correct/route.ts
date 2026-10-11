import { NextRequest, NextResponse } from 'next/server'

// Vercel 기본 타임아웃(Pro 기준 무설정 시 15초) 방어 (2026-07-21 AI 기능 재검토로 발견)
export const maxDuration = 240

export async function POST(req: NextRequest) {
  try {
    const { rawText, context } = await req.json()
    if (!rawText) return NextResponse.json({ corrected: '' })

    const { purpose = '', productField = '', tone = '' } = context ?? {}

    const prompt = `당신은 보험설계사 AI 어시스턴트입니다. 다음은 음성 인식으로 입력된 텍스트입니다. 발음 오류, 어색한 표현, 잘못된 단어를 보험 업계 문맥에 맞게 자연스럽게 교정해주세요.

맥락 정보:
- 메시지 목적: ${purpose || '미지정'}
- 상품 분야: ${productField || '미지정'}
- 말투: ${tone || '친근체'}

음성 인식 원문: "${rawText}"

규칙:
1. 원문의 핵심 내용과 의도를 유지하세요
2. 보험 전문 용어를 올바르게 교정하세요 (암보험, 실손, 종신보험 등)
3. 숫자나 금액 표현을 명확하게 수정하세요
4. 교정된 텍스트만 출력하세요 (설명 없이)`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 300,
        // Haiku 5.5는 적응형 사고가 기본 on이고 사고 토큰이 max_tokens를 같이 소모한다 —
        // 300처럼 작은 예산에서는 사고에 밀려 교정 텍스트가 통째로 잘릴 수 있어 꺼둔다
        // (2026-10-11 Haiku 4.5→5.5 전환 중 확인).
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error('AI 호출 실패')

    const data = await response.json()
    // content[0]을 그대로 쓰면 thinking 블록이 섞여 있을 때 엉뚱한 블록을 읽을 수 있어
    // type으로 명시적으로 찾는다 (Anthropic 마이그레이션 가이드 권고사항).
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
    const corrected = textBlock?.text?.trim() ?? rawText

    return NextResponse.json({ corrected })
  } catch {
    return NextResponse.json({ error: '음성 보정 실패' }, { status: 500 })
  }
}
