import { headers } from 'next/headers';
import { BookingFlow } from './BookingFlow';
import styles from './book.module.css';

export const metadata = { title: 'Book a time · ElevAIte' };

async function fetchLink(slug: string) {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/public/links/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.link;
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await fetchLink(slug);

  if (!link) {
    return (
      <main className={styles.notFound}>
        <h1>Link not found</h1>
        <p>This scheduling link doesn&apos;t exist or has been removed.</p>
      </main>
    );
  }

  return <BookingFlow link={link} />;
}
