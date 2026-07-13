import type { NewsletterTemplateProps } from './types'

// 템플릿 4 — 매거진 그리드형: 기관 뉴스레터처럼 헤더 배너 + 2단 그리드 구조의 정식 레이아웃
export function TemplateMagazineGrid({ data }: NewsletterTemplateProps) {
  const { issueLabel, title, agentName, agentContact, greeting, issues, checkPoints, cta, fontClassName, bodyFontSize } = data
  const [issue1, issue2, issue3] = issues
  const bodyStyle = { fontSize: bodyFontSize }

  return (
    <div className={`${fontClassName} w-[800px] bg-white text-[#1c1f27]`}>
      {/* 헤더 배너 */}
      <div className="relative overflow-hidden bg-[#dbeafe] px-12 pt-10 pb-8">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(circle at 85% 20%, #93c5fd 0%, transparent 45%), radial-gradient(circle at 95% 70%, #bfdbfe 0%, transparent 40%)',
        }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-[#1e3a5f] uppercase">FP AI Assistant</p>
            <h1 className="text-4xl font-black leading-none text-[#1e3a5f] mt-1">NEWS<br />LETTER</h1>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black text-[#1e3a5f] leading-none">
              {(issueLabel.match(/(\d+)\s*월/)?.[1] ?? issueLabel.match(/\d+/)?.[0] ?? '01').padStart(2, '0')}
            </p>
            <div className="h-px w-16 bg-[#1e3a5f]/40 ml-auto my-1.5" />
            <p className="text-xs font-bold text-[#1e3a5f]">{agentName}</p>
            <p className="text-[11px] text-[#1e3a5f]/70">{issueLabel}</p>
          </div>
        </div>
      </div>

      {/* 메인 기사 */}
      <div className="px-12 py-8 border-b border-gray-200">
        <h2 className="text-xl font-bold leading-snug mb-3">{title}</h2>
        <p className="leading-relaxed text-gray-600 whitespace-pre-wrap" style={bodyStyle}>{greeting}</p>
      </div>

      {/* 2단 그리드 */}
      <div className="px-12 py-8 grid grid-cols-2 gap-6">
        {issue1 && (
          <div>
            <p className="text-xs font-bold text-[#d97a3f] mb-2">이슈 01</p>
            <p className="leading-relaxed text-gray-700 whitespace-pre-wrap" style={bodyStyle}>{issue1}</p>
          </div>
        )}
        {issue2 && (
          <div>
            <p className="text-xs font-bold text-[#d97a3f] mb-2">이슈 02</p>
            <p className="leading-relaxed text-gray-700 whitespace-pre-wrap" style={bodyStyle}>{issue2}</p>
          </div>
        )}
      </div>

      {issue3 && (
        <div className="px-12 pb-8">
          <div className="border-t border-gray-200 pt-6">
            <p className="text-xs font-bold text-[#d97a3f] mb-2">이슈 03</p>
            <p className="leading-relaxed text-gray-700 whitespace-pre-wrap" style={bodyStyle}>{issue3}</p>
          </div>
        </div>
      )}

      {checkPoints && (
        <div className="mx-12 mb-6 bg-[#f7f5f1] rounded-lg p-6">
          <p className="text-xs font-bold tracking-widest text-[#1e3a5f] uppercase mb-2">보험 점검 포인트</p>
          <p className="leading-relaxed text-gray-700 whitespace-pre-wrap" style={bodyStyle}>{checkPoints}</p>
        </div>
      )}

      {cta && (
        <div className="mx-12 mb-10 bg-[#1e3a5f] rounded-lg p-5 text-center">
          <p className="leading-relaxed text-white font-semibold whitespace-pre-wrap" style={bodyStyle}>{cta}</p>
        </div>
      )}

      {/* 푸터 */}
      <div className="bg-[#f7f5f1] px-12 py-5 border-t border-gray-200">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span><b className="text-gray-700">발행</b> {agentName}</span>
          <span><b className="text-gray-700">연락처</b> {agentContact}</span>
        </div>
      </div>
    </div>
  )
}
