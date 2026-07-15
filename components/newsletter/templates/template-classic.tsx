import type { NewsletterTemplateProps } from './types'

// 템플릿 2 — 클래식 네이비: 보험사 공식 뉴스레터 느낌의 격식있는 스타일
export function TemplateClassic({ data }: NewsletterTemplateProps) {
  const { issueLabel, title, agentName, agentContact, avatarUrl, greeting, issues, checkPoints, cta, fontClassName, bodyFontSize } = data
  const bodyStyle = { fontSize: bodyFontSize }

  return (
    <div className={`${fontClassName} w-[800px] bg-[#fdfbf6] text-[#1c1f27]`}>
      <div className="bg-[#1e3a5f] px-16 py-10 flex items-start justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#d97a3f] uppercase mb-2 font-semibold">{issueLabel}</p>
          <h1 className="text-3xl font-bold leading-snug text-white max-w-[440px] break-keep">{title}</h1>
        </div>
        <div className="text-right shrink-0 pl-6 text-white">
          <p className="text-sm font-bold">{agentName}</p>
          <p className="text-xs text-white/70 mt-0.5">{agentContact}</p>
        </div>
      </div>

      <div className="px-16 py-10">
        <div className="leading-relaxed text-gray-700 whitespace-pre-wrap break-keep border-l-2 border-[#d97a3f] pl-5" style={bodyStyle}>
          {greeting}
        </div>

        <div className="mt-10 space-y-6">
          {issues.map((issue, i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-[#e6ddc8]">
              <p className="text-xs font-bold tracking-widest text-[#d97a3f] uppercase mb-2">Issue {i + 1}</p>
              <p className="leading-relaxed text-gray-800 whitespace-pre-wrap break-keep" style={bodyStyle}>{issue}</p>
            </div>
          ))}
        </div>

        {checkPoints && (
          <div className="mt-8 bg-[#1e3a5f]/5 rounded-lg p-6">
            <p className="text-xs font-bold tracking-widest text-[#1e3a5f] uppercase mb-2">보험 점검 포인트</p>
            <p className="leading-relaxed text-gray-800 whitespace-pre-wrap break-keep" style={bodyStyle}>{checkPoints}</p>
          </div>
        )}

        {cta && (
          <div className="mt-8 text-center py-6 border-t-2 border-b-2 border-[#1e3a5f]">
            <p className="leading-relaxed text-[#1e3a5f] font-bold whitespace-pre-wrap break-keep" style={bodyStyle}>{cta}</p>
          </div>
        )}
      </div>

      <div className="bg-[#1e3a5f] px-16 py-4 flex items-center justify-center gap-2 text-xs text-white/60">
        {avatarUrl && <img src={avatarUrl} crossOrigin="anonymous" alt="" className="h-6 w-auto max-w-[64px] object-contain rounded" />}
        {agentName} · {agentContact}
      </div>
    </div>
  )
}
