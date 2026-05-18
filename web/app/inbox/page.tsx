import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { InboxApp } from './InboxApp';

export const metadata = { title: 'Inbox · ElevAIte' };

export default async function InboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/inbox');
  return <InboxApp userName={user.name ?? 'You'} userEmail={user.email ?? ''} />;
}
