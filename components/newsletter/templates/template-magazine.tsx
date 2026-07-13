import type { NewsletterTemplateProps } from './types'

// 템플릿 6 — 매거진 카드형: 잡지 스타일의 굵은 타이포와 넘버링 태그
export function TemplateMagazine({ data }: NewsletterTemplateProps) {
  const { issueLabel, title, agentName, agentContact, greeting, issues, checkPoints, cta, fontClassName } = data

  return (
    <div className={`${fontClassName} w-[800px] bg-[#f4f2ec] text-[#1c1f27]`}>
      <div className="bg-[#1c1f27] px-16 py-12">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs tracking-[0.3em] text-white/60 uppercase">Insurance Newsletter</span>
          <span className="text-xs font-bold text-[#d97a3f]">{issueLabel}</span>
        </div>
        <h1 className="text-4xl font-black leading-tight text-white">{title}</h1>
      </div>

      <div className="px-16 py-10">
        <div className="flex items-center justify-between border-b-2 border-[#1c1f27] pb-4 mb-8">
          <p className="text-sm font-bold">{agentName} 드림</p>
          <p className="text-xs text-gray-500">{agentContact}</p>
        </div>

        <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap mb-10">{greeting}</p>

        <div className="grid grid-cols-1 gap-0">
          {issues.map((issue, i) => (
            <div key={i} className="border-t border-gray-300 py-6 flex gap-6">
              <span className="text-5xl font-black text-[#d97a3f]/70 leading-none shrink-0" style={{ minWidth: 56 }}>
                {i + 1}
              </span>
              <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap pt-2">{issue}</p>
            </div>
          ))}
          <div className="border-t border-gray-300" />
        </div>

        {checkPoints && (
          <div className="mt-8 bg-white border-2 border-[#1c1f27] rounded-lg p-6">
            <p className="text-xs font-black tracking-widest uppercase mb-2">Check Point</p>
            <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">{checkPoints}</p>
          </div>
        )}

        {cta && (
          <div className="mt-6 bg-[#d97a3f] rounded-lg p-6 text-center">
            <p className="text-[15px] leading-relaxed text-white font-bold whitespace-pre-wrap">{cta}</p>
          </div>
        )}
      </div>

      <div className="bg-[#1c1f27] px-16 py-4 text-center text-xs text-white/50">
        {agentName} · {agentContact}
      </div>
    </div>
  )
}
