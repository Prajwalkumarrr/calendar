'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './reschedule.css';

type Booking = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  start: string;
  end: string;
  note?: string;
  meetingUrl?: string;
  link?: { title: string; slug: string; durationMin: number };
};

type Slot = { start: string; end: string };

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtTime12(d: Date) {
  const h = d.getHours(); const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtLong(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtShort(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function localDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function monthGridStart(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const dow = first.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const out = new Date(first); out.setDate(first.getDate() + offset); out.setHours(0, 0, 0, 0);
  return out;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

type Screen = 'choice' | 'pick' | 'confirm' | 'done-reschedule' | 'done-cancel';

export function RescheduleFlow({ booking }: { booking: Booking }) {
  const [screen, setScreen] = useState<Screen>('choice');
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = booking.link?.slug;
  const durationMin = booking.link?.durationMin ?? 30;

  // Fetch slots whenever month changes
  useEffect(() => {
    if (screen !== 'pick' || !slug) return;
    setLoadingSlots(true);
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/public/links/${slug}/slots?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? {}))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [monthAnchor, screen, slug]);

  async function handleCancel() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/public/bookings/${booking.id}`, { method: 'DELETE' });
      // 409 means already cancelled — treat as success
      if (!res.ok && res.status !== 409) { setError('Could not cancel. Please try again.'); return; }
      setScreen('done-cancel');
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  async function handleReschedule() {
    if (!selectedSlot) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/public/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: selectedSlot.start, end: selectedSlot.end }),
      });
      if (!res.ok) { setError('Could not reschedule. Please try again.'); return; }
      setScreen('done-reschedule');
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  // Calendar grid
  const gridStart = monthGridStart(monthAnchor);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); cells.push(d);
  }
  const dateSlots = slots[localDateStr(selectedDate)] ?? [];

  if (screen === 'done-cancel') {
    return (
      <main className="rs-shell">
        <div className="rs-wrap rs-wrap--narrow">
          <div className="rs-card rs-card--center">
            <div className="rs-icon rs-icon--grey">✕</div>
            <h1 className="rs-h1">Booking cancelled</h1>
            <p className="rs-lede">Your meeting with <b>{booking.link?.title ?? 'the host'}</b> has been cancelled. You'll receive a confirmation email shortly.</p>
          </div>
        </div>
      </main>
    );
  }

  if (screen === 'done-reschedule' && selectedSlot) {
    return (
      <main className="rs-shell">
        <div className="rs-wrap rs-wrap--narrow">
          <div className="rs-card rs-card--center">
            <div className="rs-icon rs-icon--coral">✓</div>
            <h1 className="rs-h1">Rescheduled</h1>
            <p className="rs-lede">
              Your meeting has been moved to{' '}
              <b>{fmtShort(new Date(selectedSlot.start))} at {fmtTime12(new Date(selectedSlot.start))}</b>.
              A confirmation email is on its way.
            </p>
            <a className="rs-cta" href={`/booked/${booking.id}`}>View updated booking</a>
          </div>
        </div>
      </main>
    );
  }

  if (screen === 'confirm' && selectedSlot) {
    return (
      <main className="rs-shell">
        <div className="rs-wrap rs-wrap--narrow">
          <div className="rs-card">
            <h1 className="rs-h1" style={{ marginBottom: '4px' }}>Confirm reschedule</h1>
            <p className="rs-lede" style={{ marginBottom: '22px' }}>Moving your <b>{booking.link?.title ?? 'meeting'}</b></p>
            <div className="rs-diff">
              <div className="rs-diff__row">
                <span className="rs-diff__label">From</span>
                <span className="rs-diff__val rs-diff__val--old">{fmtShort(new Date(booking.start))} · {fmtTime12(new Date(booking.start))}</span>
              </div>
              <div className="rs-diff__row">
                <span className="rs-diff__label">To</span>
                <span className="rs-diff__val">{fmtShort(new Date(selectedSlot.start))} · {fmtTime12(new Date(selectedSlot.start))}</span>
              </div>
            </div>
            {error && <p className="rs-error">{error}</p>}
            <div className="rs-actions">
              <button className="rs-btn rs-btn--ghost" onClick={() => setScreen('pick')} disabled={submitting}>Back</button>
              <button className="rs-btn rs-btn--primary" onClick={handleReschedule} disabled={submitting}>
                {submitting ? 'Rescheduling…' : 'Confirm reschedule'}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (screen === 'pick') {
    return (
      <main className="rs-shell">
        <div className="rs-wrap">
          <button className="rs-back" onClick={() => setScreen('choice')}>← Back</button>
          <h1 className="rs-h1">Pick a new time</h1>
          <p className="rs-lede"><b>{booking.link?.title ?? 'Meeting'}</b> · {durationMin} min</p>
          <div className="rs-picker">
            <div className="rs-cal">
              <div className="rs-cal__nav">
                <button className="rs-cal__arrow" onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
                <span className="rs-cal__month">{MONTHS[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}</span>
                <button className="rs-cal__arrow" onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
              </div>
              <div className="rs-cal__grid">
                {DAYS.map(d => <div key={d} className="rs-cal__dow">{d}</div>)}
                {cells.map((cell, i) => {
                  const inMonth = cell.getMonth() === monthAnchor.getMonth();
                  const isPast = cell < today;
                  const dateKey = localDateStr(cell);
                  const hasSlots = !!(slots[dateKey]?.length);
                  const isSelected = sameDay(cell, selectedDate);
                  return (
                    <button
                      key={i}
                      className={`rs-cal__day${isSelected ? ' rs-cal__day--sel' : ''}${hasSlots ? ' rs-cal__day--avail' : ''}`}
                      disabled={isPast || !inMonth || !hasSlots}
                      onClick={() => setSelectedDate(new Date(cell))}
                    >
                      {cell.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rs-slots">
              <div className="rs-slots__date">{fmtLong(selectedDate)}</div>
              {loadingSlots && <p className="rs-slots__empty">Loading…</p>}
              {!loadingSlots && dateSlots.length === 0 && (
                <p className="rs-slots__empty">No slots available. Pick another day.</p>
              )}
              {dateSlots.map(slot => (
                <button
                  key={slot.start}
                  className={`rs-slot${selectedSlot?.start === slot.start ? ' rs-slot--sel' : ''}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {fmtTime12(new Date(slot.start))}
                </button>
              ))}
              {selectedSlot && (
                <button className="rs-btn rs-btn--primary rs-btn--full" style={{ marginTop: '16px' }}
                  onClick={() => setScreen('confirm')}>
                  Confirm new time
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Default: choice screen
  return (
    <main className="rs-shell">
      <div className="rs-wrap rs-wrap--narrow">
        <Link className="rs-brand" href="/">
          <span className="rs-brand-mark">E</span> ElevAIte
        </Link>
        <div className="rs-card">
          <h1 className="rs-h1">Manage your booking</h1>
          <p className="rs-lede">
            <b>{booking.link?.title ?? 'Meeting'}</b><br />
            {fmtLong(new Date(booking.start))} at {fmtTime12(new Date(booking.start))} · {durationMin} min
          </p>
          <div className="rs-choices">
            <button className="rs-choice" onClick={() => setScreen('pick')}>
              <span className="rs-choice__icon">↻</span>
              <div>
                <div className="rs-choice__title">Reschedule</div>
                <div className="rs-choice__sub">Move to a different time slot</div>
              </div>
            </button>
            <button className="rs-choice rs-choice--danger" onClick={() => {
              if (confirm('Are you sure you want to cancel this booking?')) handleCancel();
            }} disabled={submitting}>
              <span className="rs-choice__icon">✕</span>
              <div>
                <div className="rs-choice__title">{submitting ? 'Cancelling…' : 'Cancel booking'}</div>
                <div className="rs-choice__sub">This cannot be undone</div>
              </div>
            </button>
          </div>
          {error && <p className="rs-error">{error}</p>}
        </div>
      </div>
    </main>
  );
}
