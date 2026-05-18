'use client';

// Public booking flow — faithful port of prototype/book.html with real API hooks.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './book.css';

type PublicLink = {
  title: string;
  slug: string;
  durationMin: number;
  description?: string;
  hostName?: string;
  hostInitial?: string;
};

type Slot = { start: string; end: string };

function pad(n: number) { return String(n).padStart(2, '0'); }

function fmtTime12(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

function fmtSlotTime(iso: string) {
  return fmtTime12(new Date(iso));
}

function fmtLongDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function fmtSummaryDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function monthGridStart(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const dow = first.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const out = new Date(first);
  out.setDate(first.getDate() + offset);
  out.setHours(0, 0, 0, 0);
  return out;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookingFlow({ link }: { link: PublicLink }) {
  const router = useRouter();
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [availableByDate, setAvailableByDate] = useState<Record<string, Slot[]>>({});
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cells = useMemo(() => {
    const start = monthGridStart(monthAnchor);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthAnchor]);

  // Prefetch available slots for every day in the visible month, in parallel.
  useEffect(() => {
    let cancelled = false;
    async function loadMonth() {
      setLoadingMonth(true);
      try {
        const promises = cells
          .filter((d) => d.getMonth() === monthAnchor.getMonth() && d >= today)
          .map(async (d) => {
            const dateStr = localDateStr(d);
            const res = await fetch(`/api/public/links/${link.slug}/slots?date=${dateStr}`);
            if (!res.ok) return [dateStr, [] as Slot[]] as const;
            const data = await res.json();
            return [dateStr, (data.slots ?? []) as Slot[]] as const;
          });
        const results = await Promise.all(promises);
        if (!cancelled) {
          const map: Record<string, Slot[]> = {};
          for (const [k, v] of results) map[k] = v;
          setAvailableByDate(map);
        }
      } finally {
        if (!cancelled) setLoadingMonth(false);
      }
    }
    loadMonth();
    return () => { cancelled = true; };
  }, [monthAnchor, link.slug, cells, today]);

  // When the user picks a different date, ensure we have its slots loaded (covers next-month overflow)
  useEffect(() => {
    const key = localDateStr(selectedDate);
    if (availableByDate[key] !== undefined) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/public/links/${link.slug}/slots?date=${key}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setAvailableByDate((prev) => ({ ...prev, [key]: data.slots ?? [] }));
    })();
    return () => { cancelled = true; };
  }, [selectedDate, link.slug, availableByDate]);

  function pickDate(d: Date) {
    setSelectedDate(d);
    setSelectedSlot(null);
  }

  async function confirm() {
    if (!selectedSlot) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: link.slug,
          startISO: selectedSlot,
          name,
          email,
          note: [phone ? `Phone: ${phone}` : null, note].filter(Boolean).join('\n\n'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.push(`/booked/${data.booking.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  const selectedKey = localDateStr(selectedDate);
  const slotsForSelected = availableByDate[selectedKey] ?? [];
  const selectedSlotDate = selectedSlot ? new Date(selectedSlot) : null;

  return (
    <div className="pb-shell">
      {/* Left column — host info */}
      <aside className="pb-left">
        <Link href="/" className="pb-brand">
          <span className="pb-brand-mark">E</span> ElevAIte
        </Link>
        <div className="pb-host">
          <div className="pb-host__avatar">{link.hostInitial ?? 'H'}</div>
          <div>
            <div className="pb-host__name">Meeting with</div>
            <div className="pb-host__who">{link.hostName ?? 'Your host'}</div>
            <div className="pb-host__role">via ElevAIte</div>
          </div>
        </div>
        <h1 className="pb-title">{link.title}</h1>
        <div className="pb-meta">
          <div className="pb-meta__row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {link.durationMin} minutes
          </div>
          <div className="pb-meta__row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>
            Conference link sent on confirmation
          </div>
          <div className="pb-meta__row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            Times shown in your local time zone
          </div>
        </div>
        {link.description && <p className="pb-desc">{link.description}</p>}
        <div className="pb-foot">
          <div>Powered by <Link href="/">ElevAIte</Link></div>
          <div style={{ marginTop: 4 }}>
            Want this for your own meetings?{' '}
            <Link href="/sign-in" style={{ color: 'var(--coral)' }}>Get it free →</Link>
          </div>
        </div>
      </aside>

      {/* Right column */}
      <main className="pb-right">
        {step === 1 ? (
          <>
            {/* Calendar */}
            <div>
              <div className="pb-cal-head">
                <h2>{MONTHS[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}</h2>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="pb-cal-nav"
                    onClick={() => {
                      const next = new Date(monthAnchor); next.setMonth(monthAnchor.getMonth() - 1);
                      if (next < new Date(today.getFullYear(), today.getMonth(), 1)) return;
                      setMonthAnchor(next);
                    }}
                    disabled={monthAnchor.getFullYear() === today.getFullYear() && monthAnchor.getMonth() === today.getMonth()}
                    aria-label="Previous month"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <button
                    className="pb-cal-nav"
                    onClick={() => {
                      const next = new Date(monthAnchor); next.setMonth(monthAnchor.getMonth() + 1);
                      setMonthAnchor(next);
                    }}
                    aria-label="Next month"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              </div>

              <div className="month-grid">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="month-grid__hd">{d}</div>
                ))}
                {cells.map((d) => {
                  const inMonth = d.getMonth() === monthAnchor.getMonth();
                  const isPast = d < today;
                  const key = localDateStr(d);
                  const hasSlots = (availableByDate[key]?.length ?? 0) > 0;
                  const isSelected = sameDay(d, selectedDate);
                  const cls = [
                    'month-grid__d',
                    inMonth && !isPast ? 'curr' : '',
                    hasSlots && !isPast ? 'avail' : '',
                    isSelected ? 'sel' : '',
                  ].filter(Boolean).join(' ');
                  return (
                    <button
                      key={d.toISOString()}
                      className={cls}
                      onClick={() => pickDate(d)}
                      disabled={isPast}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="pb-tz">
                Time zone
                <div className="pb-tz-sel">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            </div>

            {/* Slots */}
            <div>
              <h2 className="pb-slots-h">{fmtLongDate(selectedDate)}</h2>
              <div className="pb-slots">
                {loadingMonth && slotsForSelected.length === 0 && (
                  <div className="pb-no-slots">Loading available times…</div>
                )}
                {!loadingMonth && slotsForSelected.length === 0 && (
                  <div className="pb-no-slots">No open times this day. Try another date.</div>
                )}
                {slotsForSelected.map((s) => {
                  const isSelected = selectedSlot === s.start;
                  if (isSelected) {
                    return (
                      <div key={s.start} className="pb-slot-row">
                        <button className="pb-slot" disabled>{fmtSlotTime(s.start)}</button>
                        <button className="pb-confirm-btn" onClick={() => setStep(2)}>Confirm →</button>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={s.start}
                      type="button"
                      className="pb-slot"
                      onClick={() => setSelectedSlot(s.start)}
                    >
                      {fmtSlotTime(s.start)}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* STEP 2 — details */
          <div className="pb-step2" style={{ gridColumn: '1 / -1' }}>
            <button className="pb-back" onClick={() => setStep(1)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              Back to time selection
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 16px' }}>
              Enter your details
            </h2>

            <div className="pb-summary">
              <div className="pb-summary__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </div>
              <div>
                <div className="pb-summary__time">
                  {selectedSlotDate
                    ? `${fmtTime12(selectedSlotDate)} – ${fmtTime12(new Date(selectedSlotDate.getTime() + link.durationMin * 60_000))}`
                    : ''}
                </div>
                <div className="pb-summary__date">
                  {selectedSlotDate ? fmtSummaryDate(selectedSlotDate) : ''}
                </div>
              </div>
              <button className="pb-summary__edit" onClick={() => setStep(1)}>Change</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); confirm(); }}>
              <label className="pb-field">
                <span className="pb-field__lbl">Full name *</span>
                <input
                  type="text" required autoFocus
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Linnea Park"
                />
              </label>
              <label className="pb-field">
                <span className="pb-field__lbl">Email *</span>
                <input
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="linnea@stanford.edu"
                />
              </label>
              <label className="pb-field">
                <span className="pb-field__lbl">
                  Phone <small>optional · for SMS reminders</small>
                </span>
                <input
                  type="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0123"
                />
              </label>
              <label className="pb-field">
                <span className="pb-field__lbl">
                  What would you like to talk about? <small>optional</small>
                </span>
                <textarea
                  rows={4}
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Quick context so I can come prepared…"
                  style={{ resize: 'vertical' }}
                />
              </label>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', margin: '6px 0 14px', lineHeight: 1.5 }}>
                By confirming, you agree to ElevAIte&apos;s{' '}
                <Link href="/terms" style={{ color: 'var(--text-2)' }}>Terms</Link> and{' '}
                <Link href="/privacy" style={{ color: 'var(--text-2)' }}>Privacy Policy</Link>.
              </div>
              {error && <div className="pb-err">{error}</div>}
              <button
                type="submit"
                className="pb-submit"
                disabled={submitting || !name.trim() || !email.trim()}
              >
                {submitting ? 'Scheduling…' : 'Schedule meeting →'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
