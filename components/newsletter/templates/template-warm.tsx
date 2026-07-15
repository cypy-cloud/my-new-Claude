import type { NewsletterTemplateProps } from './types'

// 템플릿 3 — 웜 코럴: 친근하고 따뜻한 느낌의 라운드 카드 스타일
export function TemplateWarm({ data }: NewsletterTemplateProps) {
  const { issueLabel, title, agentName, agentContact, avatarUrl, greeting, issues, checkPoints, cta, fontClassName, bodyFontSize } = data
  const bodyStyle = { fontSize: bodyFontSize }

  return (
    <div className={`${fontClassName} w-[800px] bg-[#fdf6ee] text-[#3a2e1f]`} style={{ padding: '56px 60px' }}>
      <div className="flex items-start justify-between">
        <div className="inline-block bg-[#d97a3f] text-white text-xs font-bold px-3 py-1.5 rounded-full">
          {issueLabel}
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-[#d97a3f]">{agentName}</p>
          <p className="text-xs text-[#8a7860] mt-0.5">{agentContact}</p>
        </div>
      </div>

      <h1 className="text-3xl font-bold leading-snug mt-6 mb-8">{title}</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm leading-relaxed text-[#5a4a35] whitespace-pre-wrap" style={bodyStyle}>
        {greeting}
      </div>

      <div className="mt-8 space-y-5">
        {issues.map((issue, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm flex gap-4">
            <span
              className="shrink-0 w-9 h-9 rounded-full bg-[#f2ddc9] text-[#d97a3f] font-bold flex items-center justify-center text-sm"
            >
              {i + 1}
            </span>
            <p className="leading-relaxed text-[#5a4a35] whitespace-pre-wrap pt-1" style={bodyStyle}>{issue}</p>
          </div>
        ))}
      </div>

      {checkPoints && (
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-[#d97a3f] mb-2">✓ 보험 점검 포인트</p>
          <p className="leading-relaxed text-[#5a4a35] whitespace-pre-wrap" style={bodyStyle}>{checkPoints}</p>
        </div>
      )}

      {cta && (
        <div className="mt-6 bg-[#d97a3f] rounded-2xl p-6 text-center">
          <p className="leading-relaxed text-white font-semibold whitespace-pre-wrap" style={bodyStyle}>{cta}</p>
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-2 text-xs text-[#8a7860]">
        {avatarUrl && <img src={avatarUrl} crossOrigin="anonymous" alt="" className="h-6 w-auto max-w-[64px] object-contain rounded" />}
        {agentName} · {agentContact}
      </div>
    </div>
  )
}
