import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { CalendarApp } from './CalendarApp';

export const metadata = { title: 'Calendar · ElevAIte' };

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/calendar');
  return <CalendarApp />;
}
