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
        <p className="text-sm text-gray-400 mb-8">시행일: 2026년 7월 6일 · 버전 v1.0</p>

        <p className="mb-8">
          [회사명/사업자명]（이하 &ldquo;회사&rdquo;）은 「개인정보보호법」 등 관계 법령을 준수하며,
          이용자의 개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">1. 수집하는 개인정보 항목</h2>
          <p className="font-medium">가. 회원(이용자) 정보</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>필수: 이름, 이메일, 비밀번호(암호화 저장)</li>
            <li>선택: 연락처, 소속(법인/GA명), 주력 보험사</li>
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
                  <td className="border px-3 py-2">토스페이먼츠(주)</td>
                  <td className="border px-3 py-2">결제 처리</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">4. 개인정보의 보유 및 이용 기간</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관)</li>
            <li>이용자가 업로드한 PDF 원본 파일: 서비스 내 안내된 보관 기간 경과 후 자동 삭제</li>
            <li>전자상거래 등에서의 소비자보호에 관한 법률에 따른 계약/결제 기록: 5년</li>
            <li>통신비밀보호법에 따른 접속 로그: 3개월</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">5. 이용자의 권리와 행사 방법</h2>
          <p>
            이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수 있으며,
            설정 메뉴 또는 아래 문의처를 통해 요청할 수 있습니다. 회원 탈퇴를 통해 언제든 동의를 철회할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">6. 개인정보의 파기</h2>
          <p>
            회사는 개인정보 보유기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.
            전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제합니다.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">7. 개인정보보호책임자</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>성명: [담당자명]</li>
            <li>이메일: [고객센터 이메일]</li>
            <li>연락처: [연락처]</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">8. 고지의 의무</h2>
          <p>
            이 개인정보처리방침의 내용이 추가·삭제 및 수정이 있을 시에는 시행 최소 7일 전에
            서비스 내 공지사항 또는 이메일을 통해 고지합니다.
          </p>
        </section>
      </main>
    </div>
  )
}
