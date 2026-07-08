"use client"

import type { EventName, FeatureType } from './track'

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/mobile/i.test(ua)) return 'mobile'
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  return 'desktop'
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari'
  if (ua.includes('Firefox')) return 'firefox'
  if (ua.includes('Edg')) return 'edge'
  return 'other'
}

export interface ClientTrackOptions {
  featureType?: FeatureType
  metadata?: Record<string, unknown>
}

export async function clientTrackEvent(
  eventName: EventName,
  options: ClientTrackOptions = {}
): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        featureType: options.featureType,
        pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        metadata: options.metadata,
        deviceType: getDeviceType(),
        browser: getBrowser(),
      }),
    })
  } catch {
    // Non-critical — swallow errors
  }
}

export async function clientTrackFeatureStart(
  feature: FeatureType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventMap: Record<FeatureType, EventName> = {
    ai_message: 'message_start',
    ai_script: 'script_start',
    ai_document: 'document_upload_start',
  }
  await clientTrackEvent(eventMap[feature], { featureType: feature, metadata })
}

export async function clientTrackFeatureComplete(
  feature: FeatureType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventMap: Record<FeatureType, EventName> = {
    ai_message: 'message_complete',
    ai_script: 'script_complete',
    ai_document: 'document_analysis_complete',
  }
  await clientTrackEvent(eventMap[feature], { featureType: feature, metadata })
}

export async function clientTrackDownload(
  downloadType: 'result' | 'backup',
  metadata?: Record<string, unknown>
): Promise<void> {
  const event: EventName = downloadType === 'backup' ? 'backup_download' : 'result_download'
  await clientTrackEvent(event, { metadata })
}

export async function clientTrackUpgradeClick(
  metadata?: Record<string, unknown>
): Promise<void> {
  await clientTrackEvent('upgrade_click', { metadata })
}
