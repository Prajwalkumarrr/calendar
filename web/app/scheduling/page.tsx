import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { SchedulingApp } from './SchedulingApp';

export const metadata = { title: 'Scheduling · ElevAIte' };

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/scheduling');
  return <SchedulingApp />;
}
