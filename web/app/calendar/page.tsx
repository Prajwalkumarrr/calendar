import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isOnboarded } from '@/lib/users';
import { CalendarApp } from './CalendarApp';

export const metadata = { title: 'Calendar · ElevAIte' };

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/calendar');

  // First-time sign-in → run through onboarding first
  const done = await isOnboarded(user.id);
  if (!done) redirect('/onboarding');

  return <CalendarApp />;
}
