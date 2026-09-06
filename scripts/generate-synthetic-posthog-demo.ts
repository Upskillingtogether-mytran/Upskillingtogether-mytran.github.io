import { tutors, type Tutor } from '../lib/tutors.ts';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const DEMO_CONFIRMATION = 'I_UNDERSTAND_THIS_WRITES_DEMO_ANALYTICS';
const VISITOR_COUNT = 150;
const EVENT_ENDPOINT = '/batch/';

type Journey = 'A' | 'B' | 'C' | 'D' | 'E';
type Device = 'Mobile' | 'Desktop' | 'Tablet';
type Source = {
  referrer: string;
  domain?: string;
  utm?: Record<string, string>;
};
type SyntheticEvent = {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
};

const journeys: Journey[] = [
  ...Array<Journey>(36).fill('A'),
  ...Array<Journey>(35).fill('B'),
  ...Array<Journey>(36).fill('C'),
  ...Array<Journey>(32).fill('D'),
  ...Array<Journey>(11).fill('E'),
];

const sources: Array<{ source: Source; weight: number }> = [
  {
    weight: 48,
    source: {
      referrer: 'https://www.facebook.com/',
      domain: 'www.facebook.com',
      utm: {
        utm_source: 'facebook',
        utm_medium: 'social',
        utm_campaign: 'local_parent_group',
      },
    },
  },
  { weight: 20, source: { referrer: '$direct' } },
  {
    weight: 17,
    source: {
      referrer: 'https://mail.example.org/',
      domain: 'mail.example.org',
      utm: {
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'school_news',
      },
    },
  },
  {
    weight: 15,
    source: {
      referrer: 'https://qr.example.org/',
      domain: 'qr.example.org',
      utm: {
        utm_source: 'flyer_qr',
        utm_medium: 'offline',
        utm_campaign: 'library_flyer',
      },
    },
  },
];

const tutorWeights = {
  A: [
    ['james', 11],
    ['emma', 7],
    ['sofia', 7],
    ['olivia', 8],
    ['marcus', 3],
  ],
  B: [
    ['james', 12],
    ['emma', 7],
    ['sofia', 6],
    ['olivia', 3],
    ['marcus', 7],
  ],
  C: [
    ['james', 13],
    ['emma', 7],
    ['sofia', 8],
    ['olivia', 3],
    ['marcus', 5],
  ],
  D: [
    ['james', 14],
    ['emma', 7],
    ['sofia', 6],
    ['olivia', 3],
    ['marcus', 2],
  ],
} as const;

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function choose<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function weighted<T>(random: () => number, values: ReadonlyArray<readonly [T, number]>): T {
  const total = values.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [value, weight] of values) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }
  return values.at(-1)![0];
}

function shuffle<T>(random: () => number, values: T[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [values[index], values[next]] = [values[next]!, values[index]!];
  }
  return values;
}

function device(random: () => number): Device {
  return weighted(random, [
    ['Mobile' as const, 64],
    ['Desktop' as const, 27],
    ['Tablet' as const, 9],
  ]);
}

function subjectFor(random: () => number, tutor: Tutor) {
  if (tutor.id === 'james')
    return weighted(random, [
      ['Algebra II', 44],
      ['Algebra I', 34],
      ['Pre-Algebra', 22],
    ]);
  if (tutor.id === 'marcus')
    return weighted(random, [
      ['Elementary Math', 45],
      ['Pre-Algebra', 30],
      ['Science', 25],
    ]);
  return tutor.subjects[0]!;
}

function sourceProperties(source: Source) {
  const params = new URLSearchParams(source.utm);
  const currentUrl = `https://abc-tutoring-dana.trandieumy2k3.chatgpt.site/${params.size ? `?${params}` : ''}`;
  return {
    $current_url: currentUrl,
    $referrer: source.referrer,
    $referring_domain: source.domain,
    ...source.utm,
  };
}

function tutorProperties(tutor: Tutor) {
  return {
    tutor_id: tutor.id,
    tutor_name: tutor.name,
    subjects: tutor.subjects,
    grade_levels: tutor.grades,
    hourly_rate: tutor.rate,
  };
}

function bookingProperties(tutor: Tutor, subject: string, grade: number, session: Date, attempt: string) {
  return {
    ...tutorProperties(tutor),
    subject,
    grade,
    session_date: session.toISOString().slice(0, 10),
    session_time: `${String(session.getUTCHours()).padStart(2, '0')}:${String(session.getUTCMinutes()).padStart(2, '0')}`,
    session_start: session.toISOString(),
    session_timezone: 'America/New_York',
    booking_attempt_id: attempt,
  };
}

function event(
  name: string,
  timestamp: Date,
  properties: Record<string, unknown>,
): SyntheticEvent {
  return { event: name, timestamp: timestamp.toISOString(), properties };
}

export function buildSyntheticEvents({
  seed = 20260906,
  runId,
}: {
  seed?: number;
  runId?: string;
} = {}) {
  const resolvedRunId = runId ?? `synthetic-${seed}`;
  const random = seeded(seed);
  const orderedJourneys = shuffle(random, [...journeys]);
  const events: SyntheticEvent[] = [];

  for (let index = 0; index < VISITOR_COUNT; index += 1) {
    const journey = orderedJourneys[index]!;
    const visitor = `synthetic_demo_${resolvedRunId}_${String(index + 1).padStart(3, '0')}`;
    const sessionId = `synthetic_session_${resolvedRunId}_${String(index + 1).padStart(3, '0')}`;
    const attempt = `synthetic_attempt_${resolvedRunId}_${String(index + 1).padStart(3, '0')}`;
    const source = weighted(random, sources.map(({ source, weight }) => [source, weight]));
    const visitorDevice = device(random);
    const startedAt = new Date(Date.UTC(2026, 7, 7 + Math.floor(random() * 28), 13 + Math.floor(random() * 7), Math.floor(random() * 55)));
    const base = {
      distinct_id: visitor,
      $device_id: visitor,
      $session_id: sessionId,
      $device_type: visitorDevice,
      $browser: visitorDevice === 'Mobile' ? 'Mobile Safari' : visitorDevice === 'Tablet' ? 'Mobile Safari' : 'Chrome',
      $os: visitorDevice === 'Desktop' ? 'Mac OS X' : 'iOS',
      data_source: 'synthetic_demo',
      analytics_environment: 'demo',
      is_demo: true,
      synthetic_run_id: resolvedRunId,
      schema_version: 1,
      ...sourceProperties(source),
    };

    if (journey === 'E') {
      const subject = choose(random, ['Elementary Math', 'Pre-Algebra', 'Algebra I', 'Algebra II', 'Science', 'Elementary Reading']);
      events.push(event('tutor_filter_applied', startedAt, { ...base, filter_type: 'subject', filter_value: subject }));
      if (random() < 0.72) events.push(event('tutor_filter_applied', new Date(startedAt.getTime() + 18_000), { ...base, filter_type: 'grade', filter_value: String(Math.floor(random() * 13)) }));
      continue;
    }

    const tutorId = weighted(random, tutorWeights[journey]);
    const tutor = tutors.find((candidate) => candidate.id === tutorId)!;
    const subject = subjectFor(random, tutor);
    const grade = choose(random, tutor.grades);
    const session = new Date(startedAt.getTime() + (2 + Math.floor(random() * 12)) * 86_400_000);
    session.setUTCHours(19 + Math.floor(random() * 3), 0, 0, 0);

    events.push(event('tutor_filter_applied', startedAt, { ...base, filter_type: 'subject', filter_value: subject }));
    events.push(event('tutor_filter_applied', new Date(startedAt.getTime() + 14_000), { ...base, filter_type: 'grade', filter_value: String(grade) }));
    events.push(event('tutor_viewed', new Date(startedAt.getTime() + 40_000), { ...base, ...tutorProperties(tutor), booking_attempt_id: attempt }));

    if (journey === 'D') continue;
    const selectedAt = new Date(startedAt.getTime() + 73_000);
    const booking = bookingProperties(tutor, subject, grade, session, attempt);
    events.push(event('time_slot_selected', selectedAt, { ...base, ...booking }));
    if (journey === 'C') continue;
    const formAt = new Date(selectedAt.getTime() + 38_000 + Math.floor(random() * 90_000));
    events.push(event('booking_form_started', formAt, { ...base, ...booking }));
    if (journey === 'B') continue;
    events.push(event('booking_completed', new Date(formAt.getTime() + 52_000 + Math.floor(random() * 180_000)), { ...base, ...booking }));
  }
  return events
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((syntheticEvent, index) => ({
      ...syntheticEvent,
      properties: {
        ...syntheticEvent.properties,
        $insert_id: `${resolvedRunId}-${String(index + 1).padStart(4, '0')}`,
      },
    }));
}

async function send(events: SyntheticEvent[]) {
  const apiKey = process.env.POSTHOG_SYNTHETIC_PROJECT_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.POSTHOG_SYNTHETIC_API_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) throw new Error('Missing the PostHog project token or ingestion host.');
  if (process.env.SYNTHETIC_DEMO_CONFIRM !== DEMO_CONFIRMATION) throw new Error('Missing the explicit synthetic-demo confirmation.');
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENVIRONMENT !== 'demo' && process.env.POSTHOG_SYNTHETIC_ALLOW_CURRENT_DEMO_PROJECT !== 'true') throw new Error('Set POSTHOG_SYNTHETIC_ALLOW_CURRENT_DEMO_PROJECT=true to confirm the current project is a demo project.');
  const destination = new URL(EVENT_ENDPOINT, host);
  for (let offset = 0; offset < events.length; offset += 100) {
    const batch = events.slice(offset, offset + 100);
    const response = await fetch(destination, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: apiKey, batch }) });
    if (!response.ok) throw new Error(`PostHog rejected batch ${offset / 100 + 1}: HTTP ${response.status}`);
  }
}

const args = new Set(process.argv.slice(2));
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const runId = process.env.SYNTHETIC_DEMO_RUN_ID ?? `assessment-${new Date().toISOString().replaceAll(/[-:.TZ]/g, '').slice(0, 14)}`;
  const events = buildSyntheticEvents({ runId });
  const summary = events.reduce<Record<string, number>>((result, current) => ({ ...result, [current.event]: (result[current.event] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ visitors: VISITOR_COUNT, events: events.length, run_id: runId, event_counts: summary, mode: args.has('--send') ? 'send' : 'dry-run' }, null, 2));
  if (args.has('--send')) await send(events);
}
