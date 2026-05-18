import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { OnboardingFlow } from './OnboardingFlow';

export const metadata = { title: 'Welcome · ElevAIte' };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?callbackUrl=/onboarding');
  return <OnboardingFlow userEmail={user.email ?? 'you@elevaite.so'} />;
}
