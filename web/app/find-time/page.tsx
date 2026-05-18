import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { FindTimeApp } from './FindTimeApp';

export const metadata = { title: 'Find a time · ElevAIte' };

export default async function FindTimePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/find-time');
  return <FindTimeApp currentUserId={user.id} currentUserName={user.name ?? 'You'} />;
}
