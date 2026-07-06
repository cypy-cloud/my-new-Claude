import Link from "next/link"
import { ArrowLeft, Zap } from "lucide-react"

export const metadata = { title: "이용약관 | FP AI Assistant" }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-[#1e3a5f]">FP AI Assistant</span>
          </Link>
          <Link href="/signup" className="text-sm text-gray-500 hover:text-[#1e3a5f] flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> 가입 화면으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 text-gray-800 leading-relaxed">
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">이용약관</h1>
        <p className="text-sm text-gray-400 mb-8">시행일: 2026년 7월 6일 · 버전 v1.0</p>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제1조 (목적)</h2>
          <p>
            이 약관은 열린교육컨설팅（사업자등록번호 259-98-01495, 이하 &ldquo;회사&rdquo;）이 제공하는 보험설계사 전용 AI 업무 지원 서비스
            &ldquo;FP AI Assistant&rdquo;（이하 &ldquo;서비스&rdquo;）의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및
            책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제2조 (서비스의 내용)</h2>
          <p>회사는 다음과 같은 서비스를 제공합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AI 기반 고객 문자·카카오톡 메시지 생성</li>
            <li>AI 기반 상담 스크립트, 거절 극복 스크립트, 고객 성향 분석 생성</li>
            <li>AI 기반 보험 약관 PDF 설명자료, 블로그·SNS 콘텐츠, 뉴스레터 생성</li>
            <li>고객 관리, 업무 캘린더 등 부가 업무 지원 도구</li>
            <li>기타 회사가 추가로 개발하거나 제휴를 통해 제공하는 서비스</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제3조 (AI 생성 콘텐츠에 대한 안내 및 면책)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>서비스가 생성하는 문자, 스크립트, 분석, 설명자료 등 모든 결과물은 인공지능(AI)이 생성한
              <strong> 참고용 자료</strong>이며, 실제 상담·계약·법률·세무 자문을 대체하지 않습니다.</li>
            <li>이용자는 AI 생성 결과물을 실제 고객에게 전달하거나 활용하기 전, 그 내용의 정확성·적법성·최신성을
              반드시 직접 확인하고 검증할 책임이 있습니다.</li>
            <li>회사는 AI 생성 결과물의 내용으로 인해 이용자 또는 제3자에게 발생한 손해에 대해,
              회사의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
            <li>보험 상품 안내·광고에 해당할 수 있는 콘텐츠는 이용자 소속 회사의 컴플라이언스 절차 및
              관련 법령(보험업법, 금융소비자보호법 등)에 따라 이용자가 직접 검토할 책임이 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제4조 (제3자 개인정보 입력에 대한 이용자의 책임)</h2>
          <p>
            이용자는 서비스 이용 과정에서 본인 고객의 이름, 연령, 소득, 건강상태, 상담 이력 등
            <strong> 제3자의 개인정보를 직접 입력</strong>할 수 있습니다. 이 경우 이용자는:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>해당 개인(고객)으로부터 개인정보 수집·이용·제3자 제공(AI 처리 위탁 포함)에 대한
              적법한 동의를 사전에 직접 받아야 하며,</li>
            <li>그 동의 확보 및 관련 법령(개인정보보호법 등) 준수에 대한 책임은 전적으로 이용자 본인에게 있습니다.</li>
          </ul>
          <p>회사는 이용자가 입력한 제3자 정보를 이용자의 서비스 이용 목적 범위 내에서만 처리하며,
            자세한 사항은 <Link href="/privacy" className="underline text-[#1e3a5f]">개인정보처리방침</Link>을 따릅니다.</p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제5조 (요금 및 결제)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>서비스는 무료 플랜과 유료 플랜(기본/프로/프리미엄)으로 구분되며, 요금제별 이용 한도는 요금제 페이지에 안내된 바에 따릅니다.</li>
            <li>유료 플랜은 매월 자동 결제되며, 결제 수단 등록 및 해지는 설정 메뉴에서 언제든 가능합니다.</li>
            <li>플랜 다운그레이드 시 변경 사항은 현재 결제 주기가 끝나는 시점부터 적용됩니다.</li>
            <li>추가 크레딧 구매는 유료 플랜 이용자에 한해 가능하며, 구매한 크레딧은 안내된 유효기간 내에만 사용할 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제6조 (이용자의 의무)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자는 서비스를 관계 법령, 이 약관, 이용 안내 및 회사가 통지하는 사항을 준수하여 이용해야 합니다.</li>
            <li>이용자는 서비스를 이용하여 생성한 콘텐츠를 허위·과장 광고, 불법적인 보험 모집 행위 등에
              사용해서는 안 됩니다.</li>
            <li>계정 정보(이메일, 비밀번호)의 관리 책임은 이용자 본인에게 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제7조 (계약 해지 및 서비스 이용 제한)</h2>
          <p>
            이용자는 언제든지 설정 메뉴를 통해 회원 탈퇴(해지)를 요청할 수 있습니다. 회사는 이용자가 이 약관을
            위반하거나 서비스의 정상적인 운영을 방해한 경우, 사전 통지 후 서비스 이용을 제한하거나 계약을
            해지할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제8조 (약관의 변경)</h2>
          <p>
            회사는 필요한 경우 관계 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시
            서비스 내 공지 또는 이메일을 통해 사전 안내합니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">제9조 (분쟁 해결 및 관할)</h2>
          <p>
            이 약관과 관련하여 회사와 이용자 간 발생한 분쟁에 대해서는 대한민국 법을 적용하며,
            분쟁 발생 시 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">문의</h2>
          <p>이 약관에 대한 문의사항은 gocypy@gmail.com으로 연락해주시기 바랍니다.</p>
        </section>
      </main>
    </div>
  )
}
