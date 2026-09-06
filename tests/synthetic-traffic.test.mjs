import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyntheticEvents } from '../scripts/generate-synthetic-posthog-demo.ts';

test('synthetic traffic creates 150 unique anonymous visitors with safe event properties', () => {
  const events = buildSyntheticEvents({ seed: 9, runId: 'test-run' });
  const visitorIds = new Set(events.map((event) => event.properties.distinct_id));
  assert.equal(visitorIds.size, 150);
  assert.ok(events.length > 500);
  for (const event of events) {
    assert.equal(event.properties.data_source, 'synthetic_demo');
    assert.equal(event.properties.analytics_environment, 'demo');
    assert.equal(event.properties.is_demo, true);
    assert.equal(event.properties.synthetic_run_id, 'test-run');
    assert.ok(!JSON.stringify(event).match(/parentName|studentName|@/i));
  }
});

test('completed synthetic funnels preserve the tutor and booking context', () => {
  const events = buildSyntheticEvents({ seed: 20260906, runId: 'test-run' });
  const completed = events.filter((event) => event.event === 'booking_completed');
  assert.equal(completed.length, 36);
  for (const event of completed) {
    assert.ok(event.properties.tutor_id);
    assert.equal(typeof event.properties.hourly_rate, 'number');
    assert.equal(typeof event.properties.grade, 'number');
    assert.match(String(event.properties.session_start), /^2026-/);
    assert.ok(event.properties.booking_attempt_id);
  }
});
