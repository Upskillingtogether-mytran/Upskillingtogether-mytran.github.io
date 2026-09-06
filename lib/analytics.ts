'use client';
import posthog from 'posthog-js';
import {
  cleanAnalyticsProperties,
  sanitizeEvent,
  type FunnelEvent,
} from './analytics-policy';
let initialized = false;
export function initializeAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;
  try {
    const url = new URL(host);
    if (
      url.protocol !== 'https:' &&
      !(
        process.env.NODE_ENV === 'development' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )
    )
      return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: {
        dom_event_allowlist: ['click'],
        element_allowlist: ['a', 'button'],
        css_selector_ignorelist: [
          '.ph-no-capture',
          '.ph-no-capture *',
          '.ph-no-autocapture',
          '[data-ph-no-autocapture]',
        ],
      },
      mask_all_text: true,
      mask_all_element_attributes: true,
      person_profiles: 'never',
      ip: false,
      cross_subdomain_cookie: false,
      disable_session_recording: true,
      disable_surveys: true,
      capture_exceptions: false,
      capture_performance: false,
      capture_heatmaps: false,
      rageclick: false,
      enable_recording_console_log: false,
      before_send: (event) => {
        const safe = sanitizeEvent(event);
        if (!safe) return null;
        safe.properties.analytics_environment =
          process.env.NEXT_PUBLIC_ANALYTICS_ENVIRONMENT || 'prototype';
        safe.properties.is_demo =
          process.env.NEXT_PUBLIC_ANALYTICS_ENVIRONMENT === 'demo';
        safe.properties.schema_version = 1;
        return safe;
      },
    });
    initialized = true;
  } catch {
    /* Analytics must never prevent a tutoring booking. */
  }
}
export function track(event: FunnelEvent, properties: Record<string, unknown>) {
  try {
    initializeAnalytics();
    if (initialized)
      posthog.capture(event, cleanAnalyticsProperties(properties));
  } catch {
    /* Booking stays usable if analytics is unavailable. */
  }
}
