'use client';
import { useEffect, useState, useRef } from 'react';
import { initializeAnalytics, track } from '@/lib/analytics';
import { tutorProperties, bookingProperties } from '@/lib/analytics-policy';
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Clock3,
  CalendarDays,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import {
  tutors,
  subjects,
  gradeLabel,
  slotsFor,
  slotKey,
  dateText,
  timeText,
  type Tutor,
} from '@/lib/tutors';
import {
  createBooking,
  readBooked,
  validateBooking,
  type Booking,
} from '@/lib/bookings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function Picker({
  id,
  label,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="field">
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v ?? '')}
        items={options}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="picker"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((o) => (
            <SelectItem className="picker-item" value={o.value} key={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
const photoUrl = (t: Tutor) =>
  `https://images.unsplash.com/${t.photo}?w=200&h=200&fit=crop&crop=faces`;
const gradeRange = (t: Tutor) =>
  `Grades ${t.grades[0] === 0 ? 'K' : t.grades[0]}–${t.grades.at(-1)}`;
const blankForm = {
  parentName: '',
  email: '',
  studentName: '',
  grade: '',
  subject: '',
};
export default function Home() {
  const [subject, setSubject] = useState('all'),
    [grade, setGrade] = useState('all'),
    [availableOnly, setAvailableOnly] = useState(false);
  const [booked, setBooked] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState('');
  const [selected, setSelected] = useState<Tutor | null>(null),
    [slot, setSlot] = useState(''),
    [step, setStep] = useState<'time' | 'form' | 'done'>('time');
  const [form, setForm] = useState(blankForm),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const attemptId = useRef('');
  const formStarted = useRef(false);
  const submitting = useRef(false);
  const currentFilters = useRef({
    subject: 'all',
    grade: 'all',
    availability: false,
  });
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    initializeAnalytics();
  }, []);
  function applyFilter(
    type: 'subject' | 'grade' | 'availability',
    value: string | boolean,
  ) {
    if (currentFilters.current[type] === value) return;
    if (type === 'subject') {
      currentFilters.current.subject = String(value);
      setSubject(String(value));
    }
    if (type === 'grade') {
      currentFilters.current.grade = String(value);
      setGrade(String(value));
    }
    if (type === 'availability') {
      currentFilters.current.availability = Boolean(value);
      setAvailableOnly(Boolean(value));
    }
    track('tutor_filter_applied', { filter_type: type, filter_value: value });
  }
  function clearFilters() {
    applyFilter('subject', 'all');
    applyFilter('grade', 'all');
    applyFilter('availability', false);
  }
  function startForm(next = form) {
    if (formStarted.current || !selected || !slot) return;
    formStarted.current = true;
    track(
      'booking_form_started',
      bookingProperties(
        selected,
        next.subject,
        next.grade,
        slot,
        attemptId.current,
      ),
    );
  }

  const lastTutorButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const refresh = () => {
      try {
        setBooked(readBooked());
        setStorageError('');
      } catch {
        setStorageError(
          'Your browser is blocking saved bookings. Please allow site storage to book a session.',
        );
      }
      setSchedule(Object.fromEntries(tutors.map((t) => [t.id, slotsFor(t)])));
      setReady(true);
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('abc-booking', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('abc-booking', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    modalRef.current?.scrollTo({ top: 0 });
    if (step !== 'time') modalRef.current?.focus();
  }, [step]);
  const available = (t: Tutor) =>
    (schedule[t.id] ?? []).filter(
      (s) => new Date(s) > new Date() && !booked.includes(slotKey(t.id, s)),
    );
  const results = tutors.filter(
    (t) =>
      (subject === 'all' || t.subjects.includes(subject)) &&
      (grade === 'all' || t.grades.includes(Number(grade))) &&
      (!availableOnly || available(t).length > 0),
  );
  function openTutor(t: Tutor) {
    attemptId.current = crypto.randomUUID();
    formStarted.current = false;
    track('tutor_viewed', {
      ...tutorProperties(t),
      booking_attempt_id: attemptId.current,
    });
    setSelected(t);
    setSlot('');
    setStep('time');
    setErrors({});
    setConfirmation(null);
    setForm({
      ...blankForm,
      subject:
        subject !== 'all' && t.subjects.includes(subject)
          ? subject
          : t.subjects[0],
      grade: grade !== 'all' && t.grades.includes(Number(grade)) ? grade : '',
    });
  }
  function close() {
    setSelected(null);
    requestAnimationFrame(() => lastTutorButton.current?.focus());
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy || submitting.current) return;
    const input = { ...form, tutorId: selected.id, slot };
    const invalid = validateBooking(input);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() =>
        modalRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const booking = await createBooking(input);
      track(
        'booking_completed',
        bookingProperties(
          selected,
          booking.subject,
          booking.grade,
          booking.slot,
          attemptId.current,
        ),
      );
      setBooked(readBooked());
      setConfirmation(booking);
      setStep('done');
    } catch (e) {
      setErrors({
        general:
          e instanceof Error
            ? e.message
            : 'We couldn’t save your booking. Please try again.',
      });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'find_tutors',
      title: 'Find tutors',
      description:
        'Filter the visible tutor list by subject and grade and return matching tutors with available one-hour slots. Does not book a session.',
      inputSchema: {
        type: 'object',
        properties: {
          subject: { type: 'string', enum: subjects },
          grade: { type: 'integer', minimum: 0, maximum: 12 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        if (!input || typeof input !== 'object')
          throw new Error('Provide filter options.');
        const p = input as { subject?: string; grade?: number };
        if (p.subject !== undefined && !subjects.includes(p.subject))
          throw new Error('Unsupported subject.');
        if (
          p.grade !== undefined &&
          (!Number.isInteger(p.grade) || p.grade < 0 || p.grade > 12)
        )
          throw new Error('Grade must be 0–12.');
        applyFilter('subject', p.subject ?? 'all');
        applyFilter('grade', p.grade === undefined ? 'all' : String(p.grade));
        applyFilter('availability', false);
        document.getElementById('tutors')?.scrollIntoView();
        const reserved = readBooked();
        return tutors
          .filter(
            (t) =>
              (!p.subject || t.subjects.includes(p.subject)) &&
              (p.grade === undefined || t.grades.includes(p.grade)),
          )
          .map((t) => ({
            id: t.id,
            name: t.name,
            rate: t.rate,
            subjects: t.subjects,
            slots: slotsFor(t).filter(
              (s) => !reserved.includes(slotKey(t.id, s)),
            ),
          }));
      },
    };
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          ABC <span>Tutoring</span>
        </a>
        <a className="nav-link" href="#tutors">
          Find a tutor <ArrowRight size={16} />
        </a>
      </header>
      <main>
        <section className="intro">
          <div className="intro-content">
            <p className="eyebrow">A LITTLE SUPPORT. A LOT OF POSSIBILITY.</p>
            <h1>
              Find the right tutor
              <br />
              for <em>your child.</em>
            </h1>
            <p className="intro-copy">
              Personalized, one-hour sessions in math, science, and reading.
              Friendly tutors who help your child grow in confidence, one step
              at a time.
            </p>
            <a className="primary" href="#tutors">
              Find a Tutor <ArrowRight size={18} />
            </a>
            <p className="intro-note">
              <Clock3 size={16} /> One hour, focused on your child
            </p>
          </div>
          <div className="intro-aside">
            <span className="aside-mark">ABC</span>
            <p>
              Small steps.
              <br />
              Big “I get it!” moments.
            </p>
            <span>Learning feels better with a little help.</span>
          </div>
        </section>
        <section className="tutors-section" id="tutors">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LET’S FIND A GOOD FIT</p>
              <h2>Find a Tutor</h2>
            </div>
            <p>Real support for their next step.</p>
          </div>
          <div className="filters">
            <div className="filter-icon">
              <SlidersHorizontal size={20} />
            </div>
            <Picker
              id="subject-filter"
              label="Subject"
              value={subject}
              onChange={(v) => applyFilter('subject', v)}
              options={[
                { value: 'all', label: 'All subjects' },
                ...subjects.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Picker
              id="grade-filter"
              label="Student grade"
              value={grade}
              onChange={(v) => applyFilter('grade', v)}
              options={[
                { value: 'all', label: 'All grades' },
                ...Array.from({ length: 13 }, (_, i) => ({
                  value: String(i),
                  label: gradeLabel(i),
                })),
              ]}
            />
            <label className="check-label">
              <Checkbox
                checked={availableOnly}
                onCheckedChange={(v) => applyFilter('availability', v)}
                disabled={!ready}
              />{' '}
              Has available sessions
            </label>
          </div>
          <div className="results-line">
            <p role="status">
              {results.length} {results.length === 1 ? 'tutor' : 'tutors'}
              {subject !== 'all' || grade !== 'all'
                ? results.length === 1
                  ? ' matches your search'
                  : ' match your search'
                : ' ready to help'}
            </p>
            {(subject !== 'all' || grade !== 'all' || availableOnly) && (
              <button className="text-button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            <span>One-hour sessions · No account needed</span>
          </div>
          {storageError && (
            <p role="alert" className="error-banner">
              {storageError}
            </p>
          )}
          <div className="tutor-grid">
            {results.map((t) => {
              const next = available(t)[0];
              return (
                <article className="tutor-card" key={t.id}>
                  <div className={`card-top ${t.accent}`}>
                    <img
                      src={photoUrl(t)}
                      alt={t.name}
                      width={68}
                      height={68}
                    />
                    <div>
                      <h3>{t.name}</h3>
                      <p>{gradeRange(t)}</p>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="subject-tags">
                      {t.subjects.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    <p className="bio">{t.bio}</p>
                    <p className="availability">
                      <CalendarDays size={16} />
                      {!ready
                        ? 'Checking availability…'
                        : next
                          ? `Next: ${new Date(next).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeText(next)}`
                          : 'No available sessions'}
                    </p>
                    <div className="card-bottom">
                      <p>
                        <strong>${t.rate}</strong>
                        <span> / hour</span>
                      </p>
                      <button
                        className="secondary"
                        aria-label={`View and book ${t.name}`}
                        onClick={(e) => {
                          lastTutorButton.current = e.currentTarget;
                          openTutor(t);
                        }}
                      >
                        View & Book <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {results.length === 0 && (
            <div className="empty-state">
              <BookOpen size={30} />
              <h3>No tutors match just yet</h3>
              <p>Try another subject or grade to see more options.</p>
              <button className="secondary" onClick={clearFilters}>
                Show all tutors
              </button>
            </div>
          )}
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          ABC <span>Tutoring</span>
        </a>
        <p>One child. One hour. A step forward.</p>
        <small>Prototype · Fictional tutors and sample availability</small>
      </footer>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) close();
        }}
      >
        <DialogContent
          ref={modalRef}
          className="booking-dialog"
          showCloseButton={!busy}
        >
          {selected && (
            <>
              {step === 'time' && (
                <>
                  <div className="detail-profile">
                    <img src={photoUrl(selected)} alt={selected.name} />
                    <div>
                      <p className="eyebrow">MEET YOUR TUTOR</p>
                      <DialogTitle className="dialog-title">
                        {selected.name}
                      </DialogTitle>
                      <p>
                        {gradeRange(selected)} <span>·</span>{' '}
                        <strong>${selected.rate} / hour</strong>
                      </p>
                    </div>
                  </div>
                  <div className="subject-tags">
                    {selected.subjects.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <DialogDescription className="detail-bio">
                    {selected.bio}
                  </DialogDescription>
                  <div className="time-heading">
                    <h3>Choose a time</h3>
                    <span>1-hour sessions</span>
                  </div>
                  <p className="timezone">
                    Times shown in{' '}
                    {Intl.DateTimeFormat()
                      .resolvedOptions()
                      .timeZone.replaceAll('_', ' ')}
                    .
                  </p>
                  <div className="dates">
                    {Array.from(
                      new Set(
                        (schedule[selected.id] ?? []).map((s) => dateText(s)),
                      ),
                    ).map((day) => (
                      <div className="date-group" key={day}>
                        <h4>{day}</h4>
                        <div className="slots">
                          {(schedule[selected.id] ?? [])
                            .filter((s) => dateText(s) === day)
                            .map((s) => {
                              const taken =
                                booked.includes(slotKey(selected.id, s)) ||
                                new Date(s) <= new Date();
                              return (
                                <button
                                  key={s}
                                  disabled={taken || !!storageError}
                                  aria-pressed={slot === s}
                                  className={`time-slot ${slot === s ? 'selected' : ''}`}
                                  onClick={() => {
                                    formStarted.current = false;
                                    track(
                                      'time_slot_selected',
                                      bookingProperties(
                                        selected,
                                        form.subject,
                                        form.grade,
                                        s,
                                        attemptId.current,
                                      ),
                                    );
                                    setSlot(s);
                                    setStep('form');
                                    setErrors({});
                                  }}
                                >
                                  {timeText(s)}
                                  {taken && <small>Booked</small>}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!ready && <p role="status">Loading available times…</p>}
                  {ready && available(selected).length === 0 && (
                    <p className="empty-state">
                      All listed times are booked. Please try another tutor.
                    </p>
                  )}
                  <p className="prototype-note">
                    Sample schedule · Bookings are saved only in this browser.
                  </p>
                </>
              )}
              {step === 'form' && (
                <>
                  <button
                    className="back-button"
                    onClick={() => setStep('time')}
                  >
                    <ArrowLeft size={16} /> Change time
                  </button>
                  <DialogTitle className="dialog-title">
                    Let’s book your session
                  </DialogTitle>
                  <DialogDescription>
                    Just a few details, and you’re all set.
                  </DialogDescription>
                  <div className="booking-summary">
                    <strong>{selected.name}</strong>
                    <span>{dateText(slot)}</span>
                    <span>
                      {timeText(slot)} –{' '}
                      {timeText(
                        new Date(
                          new Date(slot).getTime() + 3600000,
                        ).toISOString(),
                      )}
                    </span>
                    <span>
                      One hour · ${selected.rate} ·{' '}
                      {Intl.DateTimeFormat()
                        .resolvedOptions()
                        .timeZone.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <form
                    onSubmit={submit}
                    noValidate
                    className="booking-form ph-no-capture ph-no-autocapture"
                  >
                    <div className="form-fields">
                      {(
                        [
                          {
                            name: 'parentName',
                            label: 'Parent name',
                            type: 'text',
                            auto: 'name',
                          },
                          {
                            name: 'email',
                            label: 'Parent email',
                            type: 'email',
                            auto: 'email',
                          },
                          {
                            name: 'studentName',
                            label: 'Student first name',
                            type: 'text',
                            auto: 'off',
                          },
                        ] as const
                      ).map((f) => (
                        <div className="field" key={f.name}>
                          <label htmlFor={f.name}>{f.label}</label>
                          <input
                            id={f.name}
                            type={f.type}
                            autoComplete={f.auto}
                            required
                            maxLength={f.name === 'email' ? 254 : 80}
                            value={form[f.name]}
                            onChange={(e) => {
                              if (e.target.value.trim()) startForm();
                              setForm({ ...form, [f.name]: e.target.value });
                            }}
                            aria-invalid={!!errors[f.name]}
                            aria-describedby={
                              errors[f.name] ? `${f.name}-error` : undefined
                            }
                          />
                          {errors[f.name] && (
                            <p className="field-error" id={`${f.name}-error`}>
                              {errors[f.name]}
                            </p>
                          )}
                        </div>
                      ))}
                      <Picker
                        id="student-grade"
                        label="Student grade"
                        value={form.grade}
                        onChange={(v) => {
                          const next = { ...form, grade: v };
                          if (v !== form.grade) startForm(next);
                          setForm(next);
                        }}
                        options={[
                          { value: '', label: 'Choose a grade' },
                          ...selected.grades.map((g) => ({
                            value: String(g),
                            label: gradeLabel(g),
                          })),
                        ]}
                        error={errors.grade}
                      />
                      <Picker
                        id="booking-subject"
                        label="Subject"
                        value={form.subject}
                        onChange={(v) => {
                          const next = { ...form, subject: v };
                          if (v !== form.subject) startForm(next);
                          setForm(next);
                        }}
                        options={selected.subjects.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                        error={errors.subject}
                      />
                    </div>
                    {errors.general && (
                      <p className="error-banner" role="alert">
                        {errors.general}
                      </p>
                    )}
                    <p className="prototype-note">
                      Prototype booking only. No payment is collected and no
                      email or text is sent.
                    </p>
                    <button
                      className="primary confirm-button"
                      type="submit"
                      disabled={busy || !!storageError}
                    >
                      {busy
                        ? 'Saving your session…'
                        : `Confirm booking · $${selected.rate}`}{' '}
                      {!busy && <ArrowRight size={17} />}
                    </button>
                  </form>
                </>
              )}
              {step === 'done' && confirmation && (
                <div className="confirmation">
                  <div className="success-icon">
                    <Check size={32} />
                  </div>
                  <p className="eyebrow">YOU’RE ALL SET</p>
                  <DialogTitle className="dialog-title">
                    Your tutoring session is booked!
                  </DialogTitle>
                  <DialogDescription>
                    A little support is on the calendar.
                  </DialogDescription>
                  <dl>
                    <div>
                      <dt>Tutor</dt>
                      <dd>{selected.name}</dd>
                    </div>
                    <div>
                      <dt>Subject</dt>
                      <dd>{confirmation.subject}</dd>
                    </div>
                    <div>
                      <dt>Date</dt>
                      <dd>{dateText(confirmation.slot)}</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{timeText(confirmation.slot)}</dd>
                    </div>
                    <div>
                      <dt>Session</dt>
                      <dd>One hour · ${selected.rate}</dd>
                    </div>
                  </dl>
                  <p className="timezone">
                    {Intl.DateTimeFormat()
                      .resolvedOptions()
                      .timeZone.replaceAll('_', ' ')}
                  </p>
                  <p className="prototype-note">
                    Saved in this browser. This is a sample booking; no email or
                    text has been sent.
                  </p>
                  <button className="primary confirm-button" onClick={close}>
                    Back to tutors <ArrowRight size={17} />
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
