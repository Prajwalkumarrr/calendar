'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './book.module.css';
import { WEEKDAY_SHORT, addDays, startOfDay } from '@/lib/date';

type PublicLink = {
  title: string;
  slug: string;
  durationMin: number;
  description?: string;
};

type Slot = { start: string; end: string };

function fmtSlot(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtLong(iso: string, durationMin: number) {
  const d = new Date(iso);
  const end = new Date(d.getTime() + durationMin * 60_000);
  const day = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return `${day} · ${fmtSlot(iso)}–${fmtSlot(end.toISOString())}`;
}

export function BookingFlow({ link }: { link: PublicLink }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSlots(true);
      try {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const res = await fetch(`/api/public/links/${link.slug}/slots?date=${dateStr}`);
        const data = await res.json();
        if (!cancelled) {
          setSlots(data.slots ?? []);
          setSelectedSlot(null);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedDate, link.slug]);

  async function book() {
    if (!selectedSlot) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: link.slug, startISO: selectedSlot, name, email, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.push(`/booked/${data.booking.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.left}>
        <div className={styles.brand}>
          <div className={styles.brandDot}>E</div>
          ElevAIte
        </div>
        <h1 className={styles.h}>{link.title}</h1>
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            {link.durationMin} min
          </span>
        </div>
        {link.description && <p className={styles.desc}>{link.description}</p>}
      </aside>

      <main className={styles.right}>
        {!selectedSlot ? (
          <>
            <div className={styles.section}>
              <label className={styles.label}>Pick a date</label>
              <div className={styles.dateRow}>
                {days.map((d) => {
                  const active = d.getTime() === selectedDate.getTime();
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      className={`${styles.dateBtn} ${active ? styles.dateBtnActive : ''}`}
                      onClick={() => setSelectedDate(d)}
                    >
                      <span className={styles.dayName}>{WEEKDAY_SHORT[(d.getDay() + 6) % 7]}</span>
                      <span className={styles.dayNum}>{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.section}>
              <label className={styles.label}>
                {loadingSlots ? 'Finding times…' : `Available times · ${selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`}
              </label>
              {!loadingSlots && slots.length === 0 && (
                <div className={styles.noSlots}>No open times this day. Try another date.</div>
              )}
              <div className={styles.slots}>
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    className={styles.slot}
                    onClick={() => setSelectedSlot(s.start)}
                  >
                    {fmtSlot(s.start)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.form}>
            <div className={styles.summary}>📅 {fmtLong(selectedSlot, link.durationMin)}</div>
            <label className={styles.field}>
              <span className={styles.label}>Your name</span>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Your email</span>
              <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Anything you&apos;d like to share? (optional)</span>
              <textarea className={styles.textarea} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {error && <div className={styles.err}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.btn} onClick={() => setSelectedSlot(null)} disabled={submitting}>← Back</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={book}
                disabled={submitting || !name.trim() || !email.trim()}
              >
                {submitting ? 'Booking…' : 'Confirm booking'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
