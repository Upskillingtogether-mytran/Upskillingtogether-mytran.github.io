import type { Booking } from './bookings';
/** Integration boundary for part two. Call a server endpoint here; keep provider credentials on the server. No email/SMS is sent by this prototype. */
export async function notifyOwner(
  _booking: Booking,
): Promise<{ status: 'not-configured' }> {
  return { status: 'not-configured' };
}
