import { headers } from 'next/headers';
import { RescheduleFlow } from './RescheduleFlow';

export const metadata = { title: 'Reschedule or Cancel · ElevAIte' };

async function fetchBooking(id: string) {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/public/bookings/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.booking ?? null;
}

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await fetchBooking(id);

  if (!booking) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Booking not found</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>This booking link may be invalid or already cancelled.</p>
        </div>
      </main>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Already cancelled</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>This booking was already cancelled.</p>
        </div>
      </main>
    );
  }

  return <RescheduleFlow booking={booking} />;
}
