"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Search, BookOpen, MessageSquare, FileText,
  Crown, Building2, Tag, ChevronRight, X, Copy, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Template {
  id: string
  title: string
  description: string | null
  category: string
  feature_type: string
  template_content: string
  variables: { key: string; label: string; required: boolean }[]
  tags: string[]
  is_premium: boolean
  insurance_companies: { name: string } | null
}

const FEATURE_TABS = [
  { value: '', label: '전체', icon: BookOpen },
  { value: 'ai_message', label: 'AI 문자/카톡', icon: MessageSquare },
  { value: 'ai_script', label: 'AI 스크립트', icon: BookOpen },
  { value: 'ai_document', label: 'AI PDF 분석', icon: FileText },
]

const CATEGORY_LABELS: Record<string, string> = {
  new_contract: '신규계약',
  renewal: '갱신',
  claim: '보험금 청구',
  follow_up: '팔로업',
  general: '일반',
  greeting: '인사',
}

const FEATURE_LABELS: Record<string, string> = {
  ai_message: 'AI 문자/카톡',
  ai_script: 'AI 스크립트',
  ai_document: 'AI PDF 분석',
}

const FEATURE_COLORS: Record<string, string> = {
  ai_message: 'bg-blue-100 text-blue-700',
  ai_script: 'bg-purple-100 text-purple-700',
  ai_document: 'bg-green-100 text-green-700',
}

function TemplateCard({
  template,
  onUse,
  onPreview,
}: {
  template: Template
  onUse: (t: Template) => void
  onPreview: (t: Template) => void
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group",
      template.is_premium ? "border-orange-200" : "border-gray-100"
    )}
      onClick={() => onPreview(template)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", FEATURE_COLORS[template.feature_type])}>
              {FEATURE_LABELS[template.feature_type]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {CATEGORY_LABELS[template.category] ?? template.category}
            </span>
            {template.is_premium && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium flex items-center gap-1">
                <Crown className="h-3 w-3" /> 프리미엄
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{template.title}</h3>
          {template.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-[#1e3a5f] transition-colors" />
      </div>

      {template.insurance_companies && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Building2 className="h-3 w-3" />
          {template.insurance_companies.name}
        </div>
      )}

      <p className="text-xs text-gray-400 line-clamp-2 bg-gray-50 rounded-lg p-2 font-mono leading-relaxed">
        {template.template_content.slice(0, 120)}
        {template.template_content.length > 120 ? '...' : ''}
      </p>

      {template.variables.length > 0 && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          <Tag className="h-3 w-3 text-gray-400" />
          {template.variables.slice(0, 3).map(v => (
            <span key={v.key} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {'{{'}{v.key}{'}}'}
            </span>
          ))}
          {template.variables.length > 3 && (
            <span className="text-xs text-gray-400">+{template.variables.length - 3}</span>
          )}
        </div>
      )}

      <Button
        size="sm"
        className="w-full mt-3 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs h-8"
        onClick={e => { e.stopPropagation(); onUse(template) }}
      >
        이 템플릿 사용하기
      </Button>
    </div>
  )
}

function PreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: Template
  onClose: () => void
  onUse: (t: Template) => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(template.template_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", FEATURE_COLORS[template.feature_type])}>
                {FEATURE_LABELS[template.feature_type]}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {CATEGORY_LABELS[template.category] ?? template.category}
              </span>
              {template.is_premium && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium flex items-center gap-1">
                  <Crown className="h-3 w-3" /> 프리미엄
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{template.title}</h2>
            {template.description && <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {template.variables.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">변수 목록</h3>
              <div className="flex flex-wrap gap-2">
                {template.variables.map(v => (
                  <div key={v.key} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-mono text-blue-700">{'{{'}{v.key}{'}}'}</span>
                    <span className="text-xs text-gray-500">= {v.label}</span>
                    {v.required && <span className="text-xs text-red-500">*필수</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">템플릿 내용</h3>
              <button
                onClick={handleCopy}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap leading-relaxed font-sans border border-gray-100">
              {template.template_content}
            </pre>
          </div>
        </div>

        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>닫기</Button>
          <Button
            className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
            onClick={() => { onUse(template); onClose() }}
          >
            이 템플릿으로 시작하기
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [featureTab, setFeatureTab] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [preview, setPreview] = useState<Template | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (featureTab) params.set('feature_type', featureTab)
    if (search) params.set('search', search)

    const res = await fetch(`/api/templates?${params}`)
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setIsPremium(data.isPremium ?? false)
    setLoading(false)
  }, [featureTab, search])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  async function handleUse(template: Template) {
    await fetch(`/api/templates/${template.id}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_type: template.feature_type }),
    })

    const routeMap: Record<string, string> = {
      ai_message: '/ai-message',
      ai_script: '/ai-script',
      ai_document: '/ai-document',
    }
    const content = encodeURIComponent(template.template_content)
    const route = routeMap[template.feature_type] ?? '/dashboard'
    toast.success('템플릿이 적용되었습니다!')
    router.push(`${route}?template=${content}&template_title=${encodeURIComponent(template.title)}`)
  }

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const key = CATEGORY_LABELS[t.category] ?? t.category
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#1e3a5f]" />
          템플릿 라이브러리
        </h1>
        <p className="text-sm text-gray-500 mt-1">자주 쓰는 문자, 스크립트, 설명자료 템플릿을 선택하여 바로 활용하세요</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="템플릿 검색..."
              className="pl-9"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">검색</Button>
          {search && (
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); setSearchInput('') }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>

      {/* 기능별 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {FEATURE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFeatureTab(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              featureTab === tab.value
                ? "bg-white text-[#1e3a5f] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {!isPremium && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">프리미엄 템플릿이 있습니다</p>
              <p className="text-xs text-orange-600">프로/프리미엄 플랜으로 업그레이드하면 모든 템플릿을 이용할 수 있어요</p>
            </div>
          </div>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
            onClick={() => router.push('/billing')}>
            업그레이드
          </Button>
        </div>
      )}

      {/* 템플릿 목록 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p>검색 결과가 없습니다</p>
        </div>
      ) : featureTab ? (
        /* 기능별 탭 선택 시: 카드 그리드 */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id} template={t} onUse={handleUse} onPreview={setPreview} />
          ))}
        </div>
      ) : (
        /* 전체 탭: 카테고리별 그룹 */
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, list]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {category}
                <Badge className="text-xs bg-gray-100 text-gray-600 border-0">{list.length}개</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map(t => (
                  <TemplateCard key={t.id} template={t} onUse={handleUse} onPreview={setPreview} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <PreviewModal template={preview} onClose={() => setPreview(null)} onUse={handleUse} />
      )}
    </div>
  )
}
