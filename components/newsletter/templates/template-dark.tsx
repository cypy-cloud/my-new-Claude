import type { NewsletterTemplateProps } from './types'

// 템플릿 5 — 다크 프리미엄: 골드 포인트의 고급스러운 다크 스타일 (프리미엄 고객용)
export function TemplateDark({ data }: NewsletterTemplateProps) {
  const { issueLabel, title, agentName, agentContact, avatarUrl, greeting, issues, checkPoints, cta, fontClassName, bodyFontSize } = data
  const bodyStyle = { fontSize: bodyFontSize }

  return (
    <div className={`${fontClassName} w-[800px] bg-[#14161c] text-[#ece9e2]`} style={{ padding: '60px 64px' }}>
      <div className="flex items-start justify-between border-b border-[#c9a24b]/40 pb-8">
        <div>
          <p className="text-xs tracking-[0.25em] text-[#c9a24b] uppercase mb-3 font-semibold">{issueLabel}</p>
          <h1 className="text-3xl font-bold leading-snug max-w-[440px]">{title}</h1>
        </div>
        <div className="text-right shrink-0 pl-6">
          <p className="text-sm font-bold text-[#c9a24b]">{agentName}</p>
          <p className="text-xs text-[#ece9e2]/60 mt-0.5">{agentContact}</p>
        </div>
      </div>

      <div className="mt-8 leading-relaxed text-[#ece9e2]/85 whitespace-pre-wrap" style={bodyStyle}>{greeting}</div>

      <div className="mt-10 space-y-7">
        {issues.map((issue, i) => (
          <div key={i} className="flex gap-5">
            <span className="text-3xl font-bold text-[#c9a24b]/50 leading-none shrink-0" style={{ minWidth: 40 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 pt-1">
              <p className="leading-relaxed text-[#ece9e2]/90 whitespace-pre-wrap" style={bodyStyle}>{issue}</p>
              <div className="h-px bg-[#c9a24b]/20 mt-5" />
            </div>
          </div>
        ))}
      </div>

      {checkPoints && (
        <div className="mt-8">
          <p className="text-xs font-bold tracking-widest text-[#c9a24b] uppercase mb-2">Check Point</p>
          <p className="leading-relaxed text-[#ece9e2]/85 whitespace-pre-wrap" style={bodyStyle}>{checkPoints}</p>
        </div>
      )}

      {cta && (
        <div className="mt-8 border border-[#c9a24b]/50 rounded-lg p-6 text-center">
          <p className="leading-relaxed text-[#c9a24b] font-semibold whitespace-pre-wrap" style={bodyStyle}>{cta}</p>
        </div>
      )}

      <div className="mt-12 pt-4 border-t border-[#c9a24b]/30 flex items-center justify-center gap-2 text-xs text-[#ece9e2]/50">
        {avatarUrl && <img src={avatarUrl} crossOrigin="anonymous" alt="" className="h-6 w-6 rounded-full object-cover" />}
        {agentName} · {agentContact}
      </div>
    </div>
  )
}
