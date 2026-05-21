'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

const POLL_MS = 20_000; // check every 20s — frequent enough for a 90s window
const BANNER_LEAD_MS = 90_000; // show banner 90s before meeting start
const LS_KEY = 'elevaite_join_dismissed';

type UpcomingMeeting = {
  id: string;
  title: string;
  start: Date;
  meetingUrl: string;
  provider?: string;
};

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    // Only keep today's dismissals
    const today = new Date().toISOString().slice(0, 10);
    const fresh = [...set].filter((k) => k.endsWith(`@${today}`));
    localStorage.setItem(LS_KEY, JSON.stringify(fresh));
  } catch {}
}

export function useJoinBanner() {
  const { data: session, status } = useSession();
  const [meeting, setMeeting] = useState<UpcomingMeeting | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function dismiss() {
    if (!meeting) return;
    const key = `${meeting.id}@${new Date().toISOString().slice(0, 10)}`;
    const d = loadDismissed();
    d.add(key);
    saveDismissed(d);
    setMeeting(null);
  }

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    async function check() {
      const now = new Date();
      const from = now.toISOString();
      const to = new Date(now.getTime() + BANNER_LEAD_MS).toISOString();

      try {
        const res = await fetch(`/api/events?from=${from}&to=${to}`);
        if (!res.ok) return;
        const { events } = await res.json();

        const dismissed = loadDismissed();
        const today = now.toISOString().slice(0, 10);

        for (const ev of events ?? []) {
          const url = ev.conferencing?.url;
          if (!url) continue;
          const start = new Date(ev.start);
          const msUntil = start.getTime() - now.getTime();
          if (msUntil < 0 || msUntil > BANNER_LEAD_MS) continue;
          const key = `${ev.id}@${today}`;
          if (dismissed.has(key)) continue;

          setMeeting({
            id: ev.id,
            title: ev.title,
            start,
            meetingUrl: url,
            provider: ev.conferencing?.provider,
          });
          return;
        }
        // No meeting in window — clear banner if it expired
        setMeeting((prev) => {
          if (!prev) return null;
          const stillInWindow = prev.start.getTime() - now.getTime() > -5000;
          return stillInWindow ? prev : null;
        });
      } catch {}
    }

    check();
    timerRef.current = setInterval(check, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.user, status]);

  return { meeting, dismiss };
}
