import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { SchedulingCreateForm } from './SchedulingCreateForm';

export const metadata = { title: 'New scheduling link · ElevAIte' };

export default async function NewSchedulingLinkPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/scheduling/new');

  const userName = user.name ?? user.email ?? 'You';
  const userInitial = (user.name ?? user.email ?? 'Y').trim()[0]?.toUpperCase() ?? 'Y';

  return <SchedulingCreateForm userName={userName} userInitial={userInitial} />;
}
