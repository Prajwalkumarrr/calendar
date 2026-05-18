'use client';

import { useEffect, useState } from 'react';

/**
 * Polls the inbox endpoint for the unread notification count.
 * Refreshes every 30s and also on window focus.
 */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await fetch('/api/inbox?unread=1');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setCount(data.unreadCount ?? 0);
      } catch {
        /* ignore */
      }
    }
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return count;
}
