import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { isOnboarded } from '@/lib/users';
import { HomePage } from './HomePage';

export const metadata = { title: 'Home · ElevAIte' };

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/home');

  // First-time sign-in → push through onboarding before landing on /home
  const done = await isOnboarded(user.id);
  if (!done) redirect('/onboarding');

  return <HomePage userName={user.name ?? 'there'} userEmail={user.email ?? ''} />;
}
