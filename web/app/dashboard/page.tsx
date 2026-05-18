import { redirect } from 'next/navigation';

// The dashboard now lives at /home — the real app entry.
export default function DashboardPage() {
  redirect('/home');
}
