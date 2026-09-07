# ABC Tutoring — part one

Mobile-first tutoring search and booking prototype. Built with React, Vinext, and the installed Base UI/Shadcn components.

Link: https://abc-tutoring-dana.trandieumy2k3.chatgpt.site/

## Local development

`npm install` then `npm run dev`. `npm run build` produces the Sites Worker output. `npx tsc --noEmit` checks types.

## Implemented

- Five fictional tutor profiles with real stock portraits, different subjects, grades, rates, and schedules.
- Combined subject/grade filters, optional availability filter, and an empty state.
- Accessible tutor dialog, dated one-hour slots, minimal validated parent/student form, and confirmation.
- Browser-local reserved slot keys, checked again during submission. Web Locks serializes booking writes across tabs where available. Storage events refresh availability in other tabs.
- Contact/student details stay in memory; only reservation identifiers and timestamps are persisted. No payments, emails, or texts are sent.
- `lib/notifications.ts` is the isolated notification integration boundary for part two.
- A feature-detected `find_tutors` WebMCP tool shares the visible filter state.
- PostHog analytics track tutor filters, intentional profile views, time selection, meaningful booking-form starts, and completed bookings without sending parent or student information. See [the analytics guide](docs/analytics.md).

## Prototype boundaries for part two

Schedules are fictional and generated for the next 14 days in the visitor's timezone. For production, use Dana's actual timezone and availability data, a shared transactional reservation database, and a server-side notification provider. Local bookings do not synchronize across browsers/devices and are lost if site storage is cleared. The private hosted prototype is owner-only until access is changed intentionally.

## Validation performed

- Production build and TypeScript checks.
- Mobile flow at 390px: combined filters, required fields, invalid email, valid booking, confirmation, reload, booked slot disabled.
- Subject and grade picker interactions, empty state, and clear filters.
- 320px phone and desktop layout checks, image loading, horizontal overflow checks.
- WebMCP valid filter input and invalid subject rejection.
- PostHog event privacy and attribution tests, production bundle verification, and a live ingestion check with a clearly marked non-personal test event.

## Photo sources

Stock portraits represent fictional tutors, not the people pictured.

- Emma: Hiki App — https://unsplash.com/photos/a-woman-with-a-smile-on-her-face-lh9_ATRPKJQ
- James: Sigmund — https://unsplash.com/photos/man-in-black-jacket-smiling-a19OVaa2rzA
- Sofia: Jonathan Borba — https://unsplash.com/photos/a-smiling-woman-in-a-white-blouse-standing-in-front-of-a-blue-wall-idGAcLY_WCs
- Olivia: Brooke Cagle — https://unsplash.com/photos/a-woman-smiling-and-posing-VIpzYdCJNgs
- Marcus: Abubakar Isa — https://unsplash.com/photos/a-man-in-a-colorful-shirt-standing-in-front-of-a-green-wall-vYObirnS57Q
