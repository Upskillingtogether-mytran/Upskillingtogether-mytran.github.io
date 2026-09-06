# Dana's PostHog analytics

## Configuration

Copy `.env.example` to `.env.local` and fill in the public project ingestion token and matching API host from the project's setup page. Never use a personal PostHog API key in browser configuration. `NEXT_PUBLIC_*` values are compiled into the client bundle: changing them requires a fresh build/deployment. Missing configuration disables analytics while booking remains usable.

- `NEXT_PUBLIC_POSTHOG_KEY`: public project token.
- `NEXT_PUBLIC_POSTHOG_HOST`: normally `https://us.i.posthog.com` or `https://eu.i.posthog.com`.
- `NEXT_PUBLIC_ANALYTICS_ENVIRONMENT`: `prototype` for normal use; `demo` for deliberate demonstration traffic. All demo events carry `is_demo: true` and should be excluded from real analysis.

## Event contract (schema version 1)

| Event | When it fires | Business properties |
| --- | --- | --- |
| `tutor_filter_applied` | A subject, grade, or availability filter changes; clearing emits a change for each active filter. No event for initial defaults or unchanged values. | `filter_type`, `filter_value` (`all` means cleared; grade filter is a string, `0` is kindergarten) |
| `tutor_viewed` | A visitor intentionally opens a tutor. List impressions do not count. | `tutor_id`, `tutor_name`, `subjects`, `grade_levels`, `hourly_rate`, `booking_attempt_id` |
| `time_slot_selected` | An available time is selected. | Tutor properties plus `subject`, `grade`, `session_date`, `session_time`, `session_start`, `session_timezone`, `booking_attempt_id` |
| `booking_form_started` | The first non-empty input edit or actual subject/grade change after selecting a time. Opening, automatic focus, and validation failure alone do not count. | Same booking context available at that moment |
| `booking_completed` | Local reservation persistence succeeds. No event for failed validation, duplicate slot, storage failure, or repeated submission. | The actual booked subject, numeric grade, price, tutor, and date/time context |

`grade` is null until known, and numeric 0 means kindergarten. Subject spelling is identical across filters and bookings. The preselected subject is the chosen filter if supported, otherwise the tutor's first subject. `session_date` and `session_time` are in the visitor's timezone; `session_start` is UTC. `hourly_rate` is numeric USD. A fresh random `booking_attempt_id` is created whenever a tutor is opened and carried through all funnel stages. Changing time resets form-start tracking for that selection, without inventing a second profile view. Repeated profile views are intentional actions, not unique visitors.

## Dana's insights

Create an ordered funnel:

1. `tutor_viewed`
2. `time_slot_selected`
3. `booking_form_started`
4. `booking_completed`

Use a 24-hour conversion window initially, and hold `booking_attempt_id` constant to avoid matching a profile view to an unrelated later booking. Compare drop-off between time selection and completion; an incomplete journey is inferred from missing later events, not from an unreliable unload/abandonment event. Account for the full conversion window before calling a recent selection abandoned.

- **Tutor conversion:** break the funnel down by `tutor_id`; use `tutor_name` to label results. Compare unique converting attempts, rather than dividing unrelated all-time event totals.
- **Subject demand:** trends of `tutor_filter_applied` where `filter_type=subject` and `filter_value!=all`, broken down by `filter_value`; compare `booking_completed` broken down by `subject`. These are browsing and booking measures, not a causal comparison.
- **Grade:** completed bookings broken down by numeric `grade`; label 0 as kindergarten.
- **Price:** break down bookings/funnels by `hourly_rate` and filter by tutor, subject, or grade. Prices, profiles, and tutor mix are confounded in observational data.
- **Acquisition:** use PostHog's built-in UTM/referrer event properties. Compare `utm_source`, `utm_medium`, `utm_campaign`, `$referring_domain`, and available initial/session attribution properties. Inspect the live events to choose first-touch or current-session properties consistently.
- **Device:** break down the funnel by PostHog's `$device_type`; `$browser` and `$os` are available too. Viewport resizing in a desktop test does not turn the browser into a real mobile device.
- **Profile engagement:** compare intentional profile views and subsequent conversions. No claim that photos, biographies, or rates caused conversion; a controlled experiment is required for causality.

Filter real reports to `is_demo=false` and the intended `analytics_environment`. Device/source breakdowns should use the same environment, date range, and conversion window.

## Facebook campaign link

Append `?utm_source=facebook&utm_medium=social&utm_campaign=local_parent_group` to the deployed homepage URL. Use campaign labels, never names/emails/student information in URLs or UTM values. The SDK handles attribution; no custom traffic-source storage or device detection is implemented.

## Privacy boundary

The app never identifies visitors by parent or student information. It uses anonymous SDK IDs with `person_profiles: never` and IP-based location enrichment disabled. Session replay, surveys, exception capture, heatmaps, performance capture, and console recording are disabled. Automatic pageview/pageleave tracking and masked link/button click tracking remain enabled. Booking forms are excluded from autocapture; only explicit safe custom events describe their progress.

A `before_send` allowlist drops unknown properties, free-text/DOM payloads, `$set`/`$set_once`, and unrequested event types. URLs omit fragments and non-UTM query parameters; referrers retain only their origin. UTM values are restricted to simple campaign-label characters. Parent/student inputs are not placed in analytics context, URLs, console logs, or persistent booking records. Allowlisted business fields must continue to be sourced from the controlled tutor catalog and constrained choices.

## Verification

`node --experimental-strip-types --test tests/analytics.test.mjs` tests property sanitization, automatic attribution, unknown grades, and disallowed events.

For a local wire-payload acceptance test, start `node scripts/analytics-test-collector.mjs`, then run the development server with `NEXT_PUBLIC_POSTHOG_KEY=phc_local_acceptance_test`, `NEXT_PUBLIC_POSTHOG_HOST=http://127.0.0.1:4318`, and `NEXT_PUBLIC_ANALYTICS_ENVIRONMENT=demo`. This collector never forwards data. It writes received SDK requests to `/private/tmp/abc-posthog-acceptance.jsonl`. Use fictitious inputs and inspect the received JSON for the five events, matching attempt IDs, SDK device/campaign metadata, and absence of the input values. Stop the test server and restart with the real project configuration afterward.

For live verification, open PostHog's activity view while completing the mobile-sized Algebra II / Grade 9 flow. Check all four funnel stages, then reopen availability and confirm the booked slot is disabled. A successful ingestion HTTP response verifies acceptance; seeing the events in PostHog verifies processing. A public ingestion token cannot query the private analytics project or create insights by itself.

## Demonstration journeys

Use a separate PostHog test project or build with environment `demo`. Do not run synthetic bookings in the shared real-data project. Separate browser profiles provide separate anonymous visitors; a phone should be used for actual mobile-device classification.

- Facebook / social / local_parent_group → Algebra II / Grade 9 → James → select → edit form → complete.
- Facebook / social / local_parent_group → Science / Grade 7 → Sofia → select → leave without editing or completing.
- Direct / desktop → Elementary Reading / Grade 2 → Olivia → complete.
- newsletter / email / school_news → Elementary Math / Grade 4 → Emma → view only.

Local test bookings affect only the testing browser and origin. No automatic synthetic traffic is sent, and no simulation rewrites real availability.

## Synthetic assessment traffic

`scripts/generate-synthetic-posthog-demo.ts` generates exactly 150 anonymous, fictional visitor journeys. It sends analytics events directly to PostHog; it never loads the Site, creates a booking, marks a slot unavailable, or calls the notification integration. Every event carries `data_source: "synthetic_demo"`, `analytics_environment: "demo"`, `is_demo: true`, and a `synthetic_run_id`.

The generator is dry-run by default. Sending requires `--send`, `SYNTHETIC_DEMO_CONFIRM=I_UNDERSTAND_THIS_WRITES_DEMO_ANALYTICS`, and an explicit confirmation that the current PostHog project is a demo project. It uses 150 unique `distinct_id` and session IDs, with shared IDs inside each visitor journey. Every run gets a unique `synthetic_run_id` and deterministic `$insert_id` values; set `SYNTHETIC_DEMO_RUN_ID` only when deliberately reproducing one run. The generated source/device data are Facebook/social/local-parent-group, direct, newsletter/email/school-news, or flyer-QR/offline; Mobile is the largest device segment.

PostHog reports can exclude the data with `data_source != synthetic_demo`, or isolate one generation with `synthetic_run_id`. The intended cleanup path is to retain this clearly labelled assessment dataset in the demo project, or delete/reset that demo project when it is no longer needed.

## References

- https://posthog.com/docs/libraries/next-js
- https://posthog.com/docs/libraries/js/config
