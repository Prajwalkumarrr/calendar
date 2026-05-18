import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { TimezonesApp } from './TimezonesApp';

export const metadata = { title: 'Time zones · ElevAIte' };

export default async function TimezonesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/timezones');
  return <TimezonesApp />;
}
