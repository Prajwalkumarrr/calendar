import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';

/**
 * Smart root: signed-in users go to the app home, everyone else sees the
 * marketing landing page (served as static HTML from /public/landing.html).
 */
export default async function Root() {
  const user = await getCurrentUser();
  if (user) redirect('/home');
  redirect('/landing.html');
}
