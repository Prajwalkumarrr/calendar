import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { HomePage } from './HomePage';

export const metadata = { title: 'Home · ElevAIte' };

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/home');
  return <HomePage userName={user.name ?? 'there'} userEmail={user.email ?? ''} />;
}
