import Link from 'next/link';
import { headers } from 'next/headers';

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

export default async function BookedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await fetchBooking(id);

  if (!booking) {
    return (
      <main style={{ padding: 80, textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Booking not found</h1>
        <p style={{ color: 'var(--text-2)' }}>This confirmation link is invalid.</p>
      </main>
    );
  }

  const start = new Date(booking.start);
  const dayLabel = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: 'var(--bg)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 16,
          padding: 36,
          boxShadow: 'var(--shadow)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'var(--coral)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 28,
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.018em', margin: '0 0 8px' }}>
          You&apos;re scheduled.
        </h1>
        <p style={{ color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.55 }}>
          A confirmation has been sent to <strong>{booking.inviteeEmail}</strong>.
        </p>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            borderRadius: 10,
            padding: 16,
            textAlign: 'left',
            marginBottom: 20,
          }}
        >
          {booking.link && (
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{booking.link.title}</div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            <div>📅 {dayLabel}</div>
            <div>🕐 {timeLabel} ({booking.link?.durationMin ?? 30} min)</div>
            <div>👤 {booking.inviteeName}</div>
          </div>
          {booking.note && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hairline)', fontSize: 13, color: 'var(--text-2)' }}>
              <em>{booking.note}</em>
            </div>
          )}
        </div>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: 8,
            color: 'var(--text)',
            textDecoration: 'none',
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          Done
        </Link>
      </div>
    </main>
  );
}
