'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './search.css';

type EventHit = { type: 'event'; id: string; title: string; start: string; end: string; location?: string; color: string };
type LinkHit = { type: 'link'; id: string; title: string; slug: string; durationMin: number };
type BookingHit = { type: 'booking'; id: string; inviteeName: string; inviteeEmail: string; start: string; end: string; linkTitle?: string };
type Filter = 'all' | 'events' | 'links' | 'bookings';

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const needle = q.toLowerCase();
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(needle, i);
  while (idx >= 0) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(<mark className="sr-mark" key={`${idx}-m`}>{text.slice(idx, idx + needle.length)}</mark>);
    i = idx + needle.length;
    idx = lower.indexOf(needle, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

export function SearchApp({ initialQ = '' }: { initialQ?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [filter, setFilter] = useState<Filter>('all');
  const [events, setEvents] = useState<EventHit[]>([]);
  const [links, setLinks] = useState<LinkHit[]>([]);
  const [bookings, setBookings] = useState<BookingHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced fetch
  useEffect(() => {
    if (!q.trim()) {
      setEvents([]); setLinks([]); setBookings([]); setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events ?? []);
          setLinks(data.links ?? []);
          setBookings(data.bookings ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  const showEvents = filter === 'all' || filter === 'events';
  const showLinks = filter === 'all' || filter === 'links';
  const showBookings = filter === 'all' || filter === 'bookings';

  const total = useMemo(
    () => (showEvents ? events.length : 0) + (showLinks ? links.length : 0) + (showBookings ? bookings.length : 0),
    [events, links, bookings, showEvents, showLinks, showBookings],
  );

  return (
    <div className="sr-shell">
      <div className="sr-wrap">
        <Link href="/home" className="sr-back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>

        <div className="sr-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            className="sr-input"
            placeholder="Search events, bookings, scheduling links…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') router.push('/home'); }}
            autoComplete="off"
          />
        </div>

        <div className="sr-filters">
          <button className={`sr-filter ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
            All {total > 0 && `(${total})`}
          </button>
          <button className={`sr-filter ${filter === 'events' ? 'on' : ''}`} onClick={() => setFilter('events')}>
            Events {events.length > 0 && `(${events.length})`}
          </button>
          <button className={`sr-filter ${filter === 'links' ? 'on' : ''}`} onClick={() => setFilter('links')}>
            Scheduling links {links.length > 0 && `(${links.length})`}
          </button>
          <button className={`sr-filter ${filter === 'bookings' ? 'on' : ''}`} onClick={() => setFilter('bookings')}>
            Bookings {bookings.length > 0 && `(${bookings.length})`}
          </button>
        </div>

        {loading && <div className="sr-loading">Searching…</div>}

        {!loading && q.trim() && total === 0 && (
          <div className="sr-empty">
            No matches for <strong>&quot;{q}&quot;</strong>.
          </div>
        )}

        {!q.trim() && (
          <div className="sr-empty">
            Type to search across your events, bookings, and scheduling links.
            <div className="sr-empty__hint">
              Tip: press <kbd>⌘</kbd><kbd>K</kbd> anywhere for a quick command palette.
            </div>
          </div>
        )}

        {showEvents && events.length > 0 && (
          <>
            <div className="sr-section-lbl">Events</div>
            {events.map((e) => (
              <Link
                key={e.id}
                href="/calendar"
                className="sr-item"
                onClick={() => { /* router-pushed to calendar; future: pre-open this event */ }}
              >
                <div className="sr-item__icon sr-item__icon--event">📅</div>
                <div className="sr-item__body">
                  <div className="sr-item__title">{highlight(e.title, q)}</div>
                  <div className="sr-item__sub">{e.location ? `· ${e.location}` : ''}</div>
                </div>
                <span className="sr-item__when">{fmtWhen(e.start)}</span>
                <svg className="sr-item__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ))}
          </>
        )}

        {showLinks && links.length > 0 && (
          <>
            <div className="sr-section-lbl">Scheduling links</div>
            {links.map((l) => (
              <Link key={l.id} href={`/book/${l.slug}`} className="sr-item">
                <div className="sr-item__icon sr-item__icon--link">🔗</div>
                <div className="sr-item__body">
                  <div className="sr-item__title">{highlight(l.title, q)}</div>
                  <div className="sr-item__sub">/book/{l.slug}</div>
                </div>
                <span className="sr-item__when">{l.durationMin} min</span>
                <svg className="sr-item__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ))}
          </>
        )}

        {showBookings && bookings.length > 0 && (
          <>
            <div className="sr-section-lbl">Bookings</div>
            {bookings.map((b) => (
              <Link key={b.id} href={`/booked/${b.id}`} className="sr-item">
                <div className="sr-item__icon sr-item__icon--booking">👤</div>
                <div className="sr-item__body">
                  <div className="sr-item__title">{highlight(b.inviteeName, q)}</div>
                  <div className="sr-item__sub">
                    {highlight(b.inviteeEmail, q)}{b.linkTitle ? ` · ${b.linkTitle}` : ''}
                  </div>
                </div>
                <span className="sr-item__when">{fmtWhen(b.start)}</span>
                <svg className="sr-item__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
