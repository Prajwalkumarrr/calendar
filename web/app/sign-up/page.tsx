import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { SignUpForm } from './SignUpForm';

export const metadata = { title: 'Sign up · ElevAIte' };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect('/home');
  return <SignUpForm />;
}
