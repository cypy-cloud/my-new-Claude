import Link from "next/link"
import { ArrowLeft, Zap } from "lucide-react"

export const metadata = { title: "개인정보처리방침 | FP AI Assistant" }

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-8">시행일: 2026년 7월 8일 · 버전 v1.1</p>

        <p className="mb-8">
          열린교육컨설팅（사업자등록번호 259-98-01495, 이하 &ldquo;회사&rdquo;）은 「개인정보보호법」 등 관계 법령을 준수하며,
          이용자의 개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">1. 수집하는 개인정보 항목</h2>
          <p className="font-medium">가. 회원(이용자) 정보</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>필수: 이름, 이메일, 연락처, 비밀번호(암호화 저장 · 소셜 로그인 이용 시 제외)</li>
            <li>선택: 소속(법인/GA명), 주력 보험사</li>
            <li>결제 시: 결제수단 정보（PG사를 통해 처리되며 회사는 카드 전체 번호를 저장하지 않습니다）</li>
            <li>자동 수집: 서비스 이용 기록, 접속 로그, 기기 정보, 쿠키</li>
          </ul>
          <p className="font-medium mt-3">나. 이용자가 서비스에 입력하는 제3자(고객) 정보</p>
          <p>
            이용자가 AI 문자·스크립트·성향분석·고객관리 등 기능을 사용하며 직접 입력하는 고객의 이름,
            연령대, 성별, 직업, 소득 수준, 가족 상황, 건강 상태, 상담 이력 등. 이 정보는 이용자의
            요청에 따라 서비스 제공（AI 결과물 생성, 고객 관리）목적으로만 처리되며, 해당 정보에 대한
            수집·이용 동의 확보 책임은 <Link href="/terms" className="underline text-[#1e3a5f]">이용약관</Link> 제4조에 따라 이용자에게 있습니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 가입 의사 확인, 본인 확인, 계정 관리</li>
            <li>AI 기반 콘텐츠 생성 서비스 제공 및 품질 개선</li>
            <li>요금제 결제, 이용 한도 관리, 크레딧 관리</li>
            <li>공지사항 전달, 문의 응대, 부정 이용 방지</li>
            <li>서비스 이용 통계 분석 및 개선</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">3. 개인정보의 처리 위탁 (AI 처리 및 인프라)</h2>
          <p>회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left">수탁업체</th>
                  <th className="border px-3 py-2 text-left">위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2">Anthropic, PBC</td>
                  <td className="border px-3 py-2">AI 콘텐츠 생성을 위한 입력 데이터 처리(응답 생성 목적으로만 일시 처리)</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Supabase, Inc.</td>
                  <td className="border px-3 py-2">데이터베이스 및 인증 인프라 운영</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Vercel Inc.</td>
                  <td className="border px-3 py-2">서비스 호스팅 및 배포 인프라 운영</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">포트원(주)</td>
                  <td className="border px-3 py-2">결제 처리 대행(PG 연동)</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">한국결제네트웍스(주)</td>
                  <td className="border px-3 py-2">카드 결제 승인 및 정산(PG사)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">4. 개인정보의 국외 이전</h2>
          <p>
            회사는 서비스 제공을 위해 아래와 같이 개인정보를 국외로 이전하고 있습니다. AI 콘텐츠 생성,
            데이터베이스·인증, 호스팅은 각각 해외 사업자의 서버를 통해 처리되며, 이 정보는 서비스 제공
            목적으로만 사용되고 별도로 보관되지 않습니다（AI 응답 생성 등 처리 완료 즉시 파기 또는
            회사의 자체 데이터베이스로만 저장）.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left">이전받는 자</th>
                  <th className="border px-3 py-2 text-left">이전 국가</th>
                  <th className="border px-3 py-2 text-left">이전 항목</th>
                  <th className="border px-3 py-2 text-left">이전 목적 및 방법</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2">Anthropic, PBC</td>
                  <td className="border px-3 py-2">미국</td>
                  <td className="border px-3 py-2">이용자가 AI 기능 실행 시 입력한 텍스트（고객 정보 등 포함 가능）</td>
                  <td className="border px-3 py-2">AI 응답 생성을 위해 네트워크를 통해 실시간 전송, 응답 생성 목적 외 보관하지 않음</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Supabase, Inc.</td>
                  <td className="border px-3 py-2">미국（서비스 리전: 싱가포르 등 아시아 소재 데이터센터 이용 가능）</td>
                  <td className="border px-3 py-2">회원 정보, 이용자가 입력한 고객 정보 등 서비스 이용 데이터 전체</td>
                  <td className="border px-3 py-2">데이터베이스·인증 인프라 운영을 위해 네트워크를 통해 상시 저장·처리</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Vercel Inc.</td>
                  <td className="border px-3 py-2">미국</td>
                  <td className="border px-3 py-2">서비스 접속·이용 과정에서 발생하는 통신 데이터</td>
                  <td className="border px-3 py-2">서비스 호스팅 및 배포 인프라 운영을 위해 네트워크를 통해 상시 처리</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            위 수탁업체의 개인정보 보유·이용 기간은 본 방침 제3조·제4조에 따른 회사의 위탁 목적 및
            보유기간과 동일합니다. 이용자는 국외 이전에 동의하지 않을 권리가 있으나, AI 콘텐츠 생성 등
            서비스의 핵심 기능은 위 이전 없이는 제공이 불가능하므로 동의하지 않을 경우 서비스 이용이
            제한될 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">5. 개인정보의 보유 및 이용 기간</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관)</li>
            <li>이용자가 업로드한 PDF 원본 파일: 서비스 내 안내된 보관 기간 경과 후 자동 삭제</li>
            <li>전자상거래 등에서의 소비자보호에 관한 법률에 따른 계약/결제 기록: 5년</li>
            <li>통신비밀보호법에 따른 접속 로그: 3개월</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">6. 이용자의 권리와 행사 방법</h2>
          <p>
            이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수 있으며,
            설정 메뉴 또는 아래 문의처를 통해 요청할 수 있습니다. 회원 탈퇴를 통해 언제든 동의를 철회할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">7. 개인정보의 파기</h2>
          <p>
            회사는 개인정보 보유기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.
            전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제합니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">8. 쿠키의 설치·운영 및 거부</h2>
          <p>
            회사는 이용자에게 맞춤화된 서비스를 제공하기 위해 쿠키를 사용할 수 있습니다. 이용자는 웹브라우저
            설정에서 쿠키 저장을 거부할 수 있으며, 이 경우 로그인 유지 등 서비스 일부 이용에 어려움이
            있을 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">9. 개인정보보호책임자</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>성명: 임현수</li>
            <li>이메일: gocypy@gmail.com</li>
            <li>연락처: 010-3949-1525</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">10. 고지의 의무</h2>
          <p>
            이 개인정보처리방침의 내용이 추가·삭제 및 수정이 있을 시에는 시행 최소 7일 전에
            서비스 내 공지사항 또는 이메일을 통해 고지합니다.
          </p>
        </section>
      </main>
    </div>
  )
}
