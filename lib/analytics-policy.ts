import type { Tutor } from './tutors';

export const funnelEvents = [
  'tutor_filter_applied',
  'tutor_viewed',
  'time_slot_selected',
  'booking_form_started',
  'booking_completed',
] as const;
export type FunnelEvent = (typeof funnelEvents)[number];
const businessKeys = new Set([
  'filter_type',
  'filter_value',
  'tutor_id',
  'tutor_name',
  'subjects',
  'grade_levels',
  'hourly_rate',
  'subject',
  'grade',
  'session_date',
  'session_time',
  'session_start',
  'session_timezone',
  'booking_attempt_id',
  'analytics_environment',
  'is_demo',
  'schema_version',
]);
const sdkKeys = new Set([
  'token',
  'distinct_id',
  '$device_id',
  '$session_id',
  '$window_id',
  '$lib',
  '$lib_version',
  '$insert_id',
  '$time',
  '$browser',
  '$browser_version',
  '$browser_language',
  '$browser_language_prefix',
  '$os',
  '$os_version',
  '$device_type',
  '$screen_height',
  '$screen_width',
  '$viewport_height',
  '$viewport_width',
  '$host',
  '$pathname',
  '$current_url',
  '$referrer',
  '$referring_domain',
  '$initial_referrer',
  '$initial_referring_domain',
  '$initial_current_url',
  '$initial_pathname',
  '$initial_utm_source',
  '$initial_utm_medium',
  '$initial_utm_campaign',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  '$session_entry_url',
  '$session_entry_referrer',
  '$session_entry_referring_domain',
  '$session_entry_utm_source',
  '$session_entry_utm_medium',
  '$session_entry_utm_campaign',
  '$event_type',
  '$pageview_id',
  '$prev_pageview_id',
  '$prev_pageview_pathname',
  '$prev_pageview_duration',
  '$prev_pageview_max_scroll_percentage',
  '$prev_pageview_max_content_percentage',
  '$is_identified',
  '$process_person_profile',
  '$sdk_debug_current_session_duration',
  '$sdk_debug_replay_internal_buffer_length',
  '$sdk_debug_replay_internal_buffer_size',
  '$sdk_debug_retry_queue_size',
]);
const automaticEvents = new Set(['$pageview', '$pageleave', '$autocapture']);
const campaignKeys = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
]);
// Campaign labels should contain campaign names, never contact information.
function campaign(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9 _./-]{1,100}$/.test(value)
    ? value
    : undefined;
}
function cleanUrl(value: unknown, referrer = false) {
  if (typeof value !== 'string') return undefined;
  if (value === '$direct') return value;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) return undefined;
    const clean = new URL(u.origin);
    if (!referrer) {
      clean.pathname = u.pathname;
      for (const key of campaignKeys) {
        const v = campaign(u.searchParams.get(key));
        if (v) clean.searchParams.set(key, v);
      }
    }
    return clean.toString();
  } catch {
    return undefined;
  }
}
export function cleanAnalyticsProperties(properties: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!businessKeys.has(key) && !sdkKeys.has(key)) continue;
    if (key.includes('utm_')) {
      const v = campaign(value);
      if (v !== undefined) result[key] = v;
      continue;
    }
    if (key.includes('url') || key.endsWith('referrer')) {
      const v = cleanUrl(value, key.endsWith('referrer'));
      if (v !== undefined) result[key] = v;
      continue;
    }
    if (
      value === null ||
      ['string', 'number', 'boolean'].includes(typeof value)
    )
      result[key] = value;
    else if (['subjects', 'grade_levels'].includes(key) && Array.isArray(value))
      result[key] = value.filter(
        (v) => typeof v === 'string' || typeof v === 'number',
      );
  }
  return result;
}
export function sanitizeEvent<
  T extends { event: string; properties: Record<string, unknown> },
>(event: T | null): T | null {
  if (
    !event ||
    (!funnelEvents.includes(event.event as FunnelEvent) &&
      !automaticEvents.has(event.event))
  )
    return null;
  return { ...event, properties: cleanAnalyticsProperties(event.properties) };
}
export function tutorProperties(tutor: Tutor) {
  return {
    tutor_id: tutor.id,
    tutor_name: tutor.name,
    subjects: tutor.subjects,
    grade_levels: tutor.grades,
    hourly_rate: tutor.rate,
  };
}
export function bookingProperties(
  tutor: Tutor,
  subject: string,
  grade: string,
  slot: string,
  attemptId: string,
) {
  const d = new Date(slot);
  return {
    ...tutorProperties(tutor),
    subject,
    grade: grade === '' ? null : Number(grade),
    session_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    session_time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    session_start: d.toISOString(),
    session_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    booking_attempt_id: attemptId,
  };
}
