import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { SearchApp } from './SearchApp';

export const metadata = { title: 'Search · ElevAIte' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/search');
  const { q } = await searchParams;
  return <SearchApp initialQ={q ?? ''} />;
}
