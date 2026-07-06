import { NextRequest, NextResponse } from 'next/server'

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error('AI 호출 실패')

    const data = await response.json()
    const corrected = data.content?.[0]?.text?.trim() ?? rawText

    return NextResponse.json({ corrected })
  } catch {
    return NextResponse.json({ error: '음성 보정 실패' }, { status: 500 })
  }
}
