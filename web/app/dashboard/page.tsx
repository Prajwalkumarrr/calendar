import { redirect } from 'next/navigation';

// The dashboard now lives at /calendar — the real week view.
export default function DashboardPage() {
  redirect('/calendar');
}
