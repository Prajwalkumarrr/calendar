'use client';

import { SessionProvider } from 'next-auth/react';
import { useEventReminder } from '@/lib/useEventReminder';
import { CmdKProvider } from '@/lib/CmdKContext';
import { JoinBanner } from '@/components/JoinBanner';

function ReminderInit() {
  useEventReminder();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CmdKProvider>
        <ReminderInit />
        {children}
        <JoinBanner />
      </CmdKProvider>
    </SessionProvider>
  );
}
