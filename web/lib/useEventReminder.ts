'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const POLL_MS = 60_000;
const LS_KEY = 'elevaite_reminders_fired'; // localStorage: JSON array of "id@YYYY-MM-DD"

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2026-05-21"
}

function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const all: string[] = JSON.parse(raw ?? '[]');
    const today = todayStr();
    // Prune entries from previous days to stop localStorage growing indefinitely
    const fresh = all.filter((k) => k.endsWith(`@${today}`));
    if (fresh.length !== all.length) {
      localStorage.setItem(LS_KEY, JSON.stringify(fresh));
    }
    return new Set(fresh);
  } catch {
    return new Set();
  }
}

function saveFired(fired: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...fired]));
  } catch { /* quota — non-fatal */ }
}

export function useEventReminder() {
  const { data: session, status } = useSession();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    // Ask for browser notification permission once
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    async function check() {
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

      // Load user's reminder prefs
      let leadMin = 10;
      let remindersEnabled = true;
      try {
        const prefsRes = await fetch('/api/me/notifications');
        if (prefsRes.ok) {
          const data = await prefsRes.json();
          if (data.prefs?.reminders === false) remindersEnabled = false;
          if (typeof data.prefs?.reminderLeadMin === 'number') leadMin = data.prefs.reminderLeadMin;
        }
      } catch { /* non-fatal */ }

      if (!remindersEnabled) return;

      // Fetch today's events
      let events: { id: string; title: string; start: string; end: string; location?: string }[] = [];
      try {
        const res = await fetch(
          `/api/events?from=${dayStart.toISOString()}&to=${dayEnd.toISOString()}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        events = data.events ?? [];
      } catch { return; }

      const fired = loadFired();
      let changed = false;

      for (const ev of events) {
        const start = new Date(ev.start);
        const msUntil = start.getTime() - now.getTime();
        const minUntil = msUntil / 60_000;

        // Only fire within the lead window and not in the past
        if (minUntil < 0 || minUntil > leadMin) continue;

        const key = `${ev.id}@${todayStr()}`;
        if (fired.has(key)) continue;

        fired.add(key);
        changed = true;

        const roundedMin = Math.round(minUntil);
        const timeLabel = roundedMin <= 0 ? 'starting now' : `in ${roundedMin} min`;
        const body = `${timeLabel}${ev.location ? ` · ${ev.location}` : ''}`;

        // Browser push notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⏰ ${ev.title}`, { body, icon: '/favicon.ico', tag: key });
          } catch { /* some browsers block programmatic Notification in certain contexts */ }
        }

        // Inbox notification (server-side, shows up in /inbox)
        fetch('/api/inbox', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            kind: 'system',
            title: `Starting soon: ${ev.title}`,
            body,
            href: '/calendar',
            refId: ev.id,
          }),
        }).catch(() => {});
      }

      if (changed) saveFired(fired);
    }

    check(); // run immediately on mount / session change
    timerRef.current = setInterval(check, POLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.user, status]);
}
