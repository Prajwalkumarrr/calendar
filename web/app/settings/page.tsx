import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { SettingsApp } from './SettingsApp';

export const metadata = { title: 'Settings · ElevAIte' };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/settings');
  return <SettingsApp userName={user.name ?? 'You'} userEmail={user.email ?? 'you@elevaite.so'} />;
}
