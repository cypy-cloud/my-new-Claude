import type { NewsletterTemplateProps } from './types'

// 템플릿 1 — 미니멀 화이트: 여백을 넉넉히 두고 얇은 라인으로만 구분하는 정갈한 스타일
export function TemplateMinimal({ data }: NewsletterTemplateProps) {
  const { issueLabel, title, agentName, agentContact, avatarUrl, greeting, issues, checkPoints, cta, fontClassName, bodyFontSize } = data
  const bodyStyle = { fontSize: bodyFontSize }

  return (
    <div className={`${fontClassName} w-[800px] bg-white text-[#1c1f27]`} style={{ padding: '56px 64px' }}>
      <div className="border-t-2 border-[#1e3a5f] pt-6 flex items-start justify-between">
        <div>
          <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">Newsletter</p>
          <h1 className="text-3xl font-bold leading-snug max-w-[440px]">{title}</h1>
        </div>
        <div className="text-right shrink-0 pl-6">
          <p className="text-sm font-semibold text-[#1e3a5f]">{issueLabel}</p>
          <p className="text-sm font-bold mt-3">{agentName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{agentContact}</p>
        </div>
      </div>

      <div className="mt-10 leading-relaxed text-gray-700 whitespace-pre-wrap" style={bodyStyle}>{greeting}</div>

      <div className="mt-10 space-y-8">
        {issues.map((issue, i) => (
          <div key={i} className="flex gap-5">
            <span className="text-4xl font-bold text-gray-200 leading-none shrink-0" style={{ minWidth: 44 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="leading-relaxed text-gray-800 whitespace-pre-wrap pt-1" style={bodyStyle}>{issue}</p>
          </div>
        ))}
      </div>

      {checkPoints && (
        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Check Point</p>
          <p className="leading-relaxed text-gray-800 whitespace-pre-wrap" style={bodyStyle}>{checkPoints}</p>
        </div>
      )}

      {cta && (
        <div className="mt-10 bg-[#f7f5f1] rounded-xl p-6 text-center">
          <p className="leading-relaxed text-[#1e3a5f] font-semibold whitespace-pre-wrap" style={bodyStyle}>{cta}</p>
        </div>
      )}

      <div className="mt-12 pt-4 border-t border-gray-200 flex items-center justify-center gap-2 text-xs text-gray-400">
        {avatarUrl && <img src={avatarUrl} crossOrigin="anonymous" alt="" className="h-6 w-auto max-w-[64px] object-contain rounded" />}
        {agentName} · {agentContact}
      </div>
    </div>
  )
}
