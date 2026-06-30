import { createClient } from '@/lib/supabase/server'

export type EventName =
  | 'signup'
  | 'login'
  | 'logout'
  | 'landing_visit'
  | 'billing_visit'
  | 'message_start'
  | 'message_complete'
  | 'script_start'
  | 'script_complete'
  | 'document_upload_start'
  | 'document_upload_complete'
  | 'document_analysis_complete'
  | 'result_download'
  | 'backup_download'
  | 'upgrade_click'
  | 'feedback_submit'
  | 'notice_view'
  | 'changelog_view'
  | 'tutorial_complete'

export type FeatureType = 'ai_message' | 'ai_script' | 'ai_document'

export interface TrackEventOptions {
  userId?: string
  featureType?: FeatureType
  pagePath?: string
  metadata?: Record<string, unknown>
}

export async function trackEvent(
  eventName: EventName,
  options: TrackEventOptions = {}
): Promise<void> {
  try {
    const supabase = await createClient()
    await (supabase as any).from('event_logs').insert({
      user_id: options.userId ?? null,
      event_name: eventName,
      feature_type: options.featureType ?? null,
      page_path: options.pagePath ?? null,
      metadata: options.metadata ?? null,
    })
  } catch {
    // Non-critical — swallow errors
  }
}

export async function trackFeatureStart(
  feature: FeatureType,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventMap: Record<FeatureType, EventName> = {
    ai_message: 'message_start',
    ai_script: 'script_start',
    ai_document: 'document_upload_start',
  }
  await trackEvent(eventMap[feature], { userId, featureType: feature, metadata })
}

export async function trackFeatureComplete(
  feature: FeatureType,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventMap: Record<FeatureType, EventName> = {
    ai_message: 'message_complete',
    ai_script: 'script_complete',
    ai_document: 'document_analysis_complete',
  }
  await trackEvent(eventMap[feature], { userId, featureType: feature, metadata })
}

export async function trackDownload(
  userId: string,
  downloadType: 'result' | 'backup',
  metadata?: Record<string, unknown>
): Promise<void> {
  const event: EventName = downloadType === 'backup' ? 'backup_download' : 'result_download'
  await trackEvent(event, { userId, metadata })
}

export async function trackUpgradeClick(
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent('upgrade_click', { userId, pagePath: '/billing', metadata })
}
