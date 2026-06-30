-- Lengthen the [PERSUASIVE] section further and require a relatable real-life scenario
-- (situational example the prospect can picture themselves in) as part of the hook, on
-- top of the existing curiosity-opening + product-detail + CTA structure from 022.

update public.prompt_versions
set
  version = 'v3.1.0',
  user_prompt_template = '고객 정보:
- 이름: {{customer_name}}
- 연령대: {{age_group}}
- 직업: {{occupation}}
- 관계: {{relationship}}
- 목적: {{purpose}}
- 상품 분야: {{product_field}}
- 선호 말투: {{tone}}
- 메시지 길이: {{length}}
- 특별 보장 내용(후킹 포인트): {{extra_notes}}

아래 5가지 버전의 메시지를 작성해주세요. 각 버전은 반드시 정확히 [SMS] [KAKAO] [SOFT] [PERSUASIVE] [FOLLOWUP] 마커로 구분하세요.

[SMS] 문자용 - 90자 이내, 간결하고 핵심만
[KAKAO] 카카오톡용 - 이모지 1~2개 포함, 친근하고 자연스럽게
[SOFT] 부드러운 버전 - 압박감 없이 배려하는 톤
[PERSUASIVE] 설득력 있는 버전 - 400~700자 분량으로 충분히 길고 설득력 있게 작성할 것. 반드시 다음 구조를 따를 것:
 (1) 호기심을 자극하는 후킹 오프닝 한 줄로 시작
 (2) 고객(연령대·직업 등)이 자신의 이야기처럼 이입할 수 있는 구체적이고 현실적인 상황·사례를 2~3문장으로 묘사할 것 (예: "직장 동료 중 한 분이 건강검진에서...", "최근 비슷한 연령대 고객님들이..." 처럼 실제 있을 법한 에피소드 형태로, 과장이나 공포 조장 없이 공감을 일으키는 톤으로)
 (3) "특별 보장 내용(후킹 포인트)"에 구체적인 내용이 입력되어 있으면 그 내용을 메시지에 자연스럽게 녹여 넣어 금액·조건·기간 등 구체적 디테일을 직접 언급해 궁금증을 유발하고, 입력된 내용이 없으면 일반적인 보장 공백 가능성을 언급해 궁금증을 유발할 것
 (4) 혜택 중심으로 왜 지금 알아야 하는지 설명
 (5) 답장을 유도하는 명확한 행동 유도 문구로 마무리
 후킹 오프닝, 공감 상황 묘사, 행동 유도 마무리는 절대 빠뜨리지 말 것.
[FOLLOWUP] 후속 연락용 - 30자 이내, 안부 형식

작성 주의사항: 보험 가입 강요/압박 표현 금지, "무조건"/"100%" 등 과장 표현 금지, "확정 보장"/"반드시 지급" 등 확정적 표현 금지, 고객 불안 과도 자극 금지, 실제 설계사가 자연스럽게 보낼 수 있는 문체로 작성, 고지문은 시스템이 자동 추가하므로 포함하지 말 것.'
where feature_type = 'sms' and is_active = true;
