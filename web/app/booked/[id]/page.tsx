import Link from 'next/link';
import { headers } from 'next/headers';
import './booked.css';

export const metadata = { title: "You're scheduled · ElevAIte" };

type Booking = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  start: string;
  end: string;
  note?: string;
  link?: { title: string; durationMin: number };
};

async function fetchBooking(id: string): Promise<Booking | null> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/public/bookings/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.booking;
}

function fmtTime12(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default async function BookedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await fetchBooking(id);

  if (!booking) {
    return (
      <main style={{ padding: 80, textAlign: 'center', fontFamily: 'Geist, sans-serif' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Booking not found</h1>
        <p style={{ color: 'var(--text-2)' }}>This confirmation link is invalid.</p>
      </main>
    );
  }

  const start = new Date(booking.start);
  const end = new Date(booking.end);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dayLabel = start.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeRange = `${fmtTime12(start)} – ${fmtTime12(end)} · ${tz}`;
  const linkTitle = booking.link?.title ?? 'Meeting';
  const durationMin = booking.link?.durationMin ?? Math.round((end.getTime() - start.getTime()) / 60_000);

  return (
    <main className="booked-shell">
      <div className="booked__bloom" />
      <div className="bd-wrap">
        <Link className="bd-brand" href="/">
          <span className="bd-brand-mark">E</span> ElevAIte
        </Link>
        <div className="bd-card">
          <div className="check-circ">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="bd-h1">You&apos;re scheduled.</h1>
          <p className="bd-lede">
            A confirmation is on its way to <b>{booking.inviteeEmail}</b>.
          </p>

          <div className="bd-details">
            <div className="bd-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
              <div className="bd-row__main">
                <div className="bd-row__lbl">When</div>
                <div className="bd-row__val">{dayLabel}</div>
                <div className="bd-row__sub">{timeRange}</div>
              </div>
            </div>
            <div className="bd-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <div className="bd-row__main">
                <div className="bd-row__lbl">Duration</div>
                <div className="bd-row__val">{durationMin} minutes</div>
              </div>
            </div>
            <div className="bd-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>
              <div className="bd-row__main">
                <div className="bd-row__lbl">Meeting</div>
                <div className="bd-row__val">{linkTitle}</div>
                <div className="bd-row__sub">Conference link sent via email</div>
              </div>
            </div>
            <div className="bd-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" /><circle cx="10" cy="7" r="4" /></svg>
              <div className="bd-row__main">
                <div className="bd-row__lbl">Booked by</div>
                <div className="bd-row__val">{booking.inviteeName}</div>
                <div className="bd-row__sub">{booking.inviteeEmail}</div>
              </div>
            </div>
            {booking.note && (
              <div className="bd-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                <div className="bd-row__main">
                  <div className="bd-row__lbl">Note</div>
                  <div className="bd-row__val" style={{ fontWeight: 400, whiteSpace: 'pre-line' }}>{booking.note}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bd-email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
            <span>We sent a calendar invite to your email.</span>
          </div>

          <div className="bd-btns">
            <Link className="bd-btn" href={`/reschedule/${booking.id}`}>Reschedule</Link>
            <Link className="bd-btn" href={`/reschedule/${booking.id}`} style={{ color: 'var(--text-3)' }}>Cancel</Link>
          </div>

          <div className="bd-add-cal">
            <small>Add to:</small>
            <a className="add-cal-btn" href="#"><span className="add-cal-btn__dot" style={{ background: '#4285F4' }} /> Google</a>
            <a className="add-cal-btn" href="#"><span className="add-cal-btn__dot" style={{ background: '#000' }} /> Apple</a>
            <a className="add-cal-btn" href="#"><span className="add-cal-btn__dot" style={{ background: '#0078d4' }} /> Outlook</a>
            <a className="add-cal-btn" href="#">.ics</a>
          </div>
        </div>
        <div className="bd-footnote">
          Powered by <Link href="/">ElevAIte</Link> · Want this for yourself?{' '}
          <Link href="/sign-in" style={{ color: 'var(--coral)' }}>Get the calendar.</Link>
        </div>
      </div>
    </main>
  );
}
