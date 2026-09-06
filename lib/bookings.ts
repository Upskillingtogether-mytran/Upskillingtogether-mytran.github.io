import { slotsFor, slotKey, tutors } from './tutors';
import { notifyOwner } from './notifications';
export const BOOKING_PREFIX = 'abc-tutoring:booked:v1:';
export type BookingInput = {
  tutorId: string;
  slot: string;
  parentName: string;
  email: string;
  studentName: string;
  grade: string;
  subject: string;
};
export type Booking = BookingInput & { id: string };
export function readBooked(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BOOKING_PREFIX))
      keys.push(key.slice(BOOKING_PREFIX.length));
  }
  return keys;
}
export function validateBooking(input: BookingInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const tutor = tutors.find((t) => t.id === input.tutorId);
  if (!tutor) errors.general = 'Please choose a tutor.';
  if (
    !input.slot ||
    !tutor ||
    !slotsFor(tutor).includes(input.slot) ||
    new Date(input.slot) <= new Date()
  )
    errors.general = 'Please choose an available time.';
  if (!input.parentName?.trim()) errors.parentName = 'Please enter your name.';
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = 'Please enter a valid email address.';
  if (!input.studentName?.trim())
    errors.studentName = 'Please enter your child’s first name.';
  if (input.grade === '' || !tutor?.grades.includes(Number(input.grade)))
    errors.grade = 'Please choose a grade this tutor supports.';
  if (!tutor?.subjects.includes(input.subject))
    errors.subject = 'Please choose a subject this tutor teaches.';
  return errors;
}
export async function createBooking(input: BookingInput): Promise<Booking> {
  const errors = validateBooking(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const save = () => {
    const key = BOOKING_PREFIX + slotKey(input.tutorId, input.slot);
    if (localStorage.getItem(key))
      throw new Error('That time was just booked. Please choose another time.');
    const booking = {
      ...input,
      parentName: input.parentName.trim(),
      email: input.email.trim(),
      studentName: input.studentName.trim(),
      id: crypto.randomUUID(),
    };
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ id: booking.id, bookedAt: new Date().toISOString() }),
      );
    } catch {
      throw new Error(
        'Your browser couldn’t save this booking. Please allow site storage and try again.',
      );
    }
    window.dispatchEvent(new Event('abc-booking'));
    return booking;
  };
  const booking = navigator.locks
    ? await navigator.locks.request('abc-tutoring-bookings', save)
    : save();
  void notifyOwner(booking).catch(() => {
    /* A notification failure must never reverse a confirmed booking. */
  });
  return booking;
}
