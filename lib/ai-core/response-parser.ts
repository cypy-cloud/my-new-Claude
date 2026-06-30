import type { AiCoreFeature } from './types'
import { FEATURE_CONFIG } from './types'

export function parseSections(feature: AiCoreFeature, raw: string): Record<string, string> {
  const { markers } = FEATURE_CONFIG[feature]
  const result: Record<string, string> = {}

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const nextMarker = markers[i + 1]
    const startTag = `[${marker}]`
    const start = raw.indexOf(startTag)
    if (start === -1) continue

    const contentStart = start + startTag.length
    const end = nextMarker ? raw.indexOf(`[${nextMarker}]`, contentStart) : raw.length
    result[marker] = raw.slice(contentStart, end !== -1 ? end : raw.length).trim()
  }

  return result
}

export function isParseComplete(feature: AiCoreFeature, sections: Record<string, string>): boolean {
  return Object.keys(sections).length === FEATURE_CONFIG[feature].markers.length
}
