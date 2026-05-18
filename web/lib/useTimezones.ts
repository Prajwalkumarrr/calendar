'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SavedTimezone = { tz: string; label: string };

const LS_KEY = 'elevaite.timezones';
const DEFAULT: SavedTimezone[] = [{ tz: 'local', label: 'Local' }];

function loadLocal(): SavedTimezone[] {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function saveLocal(list: SavedTimezone[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/**
 * User's saved timezone strip.
 * - Reads localStorage instantly
 * - Hydrates from server in the background
 * - `setTimezones` writes optimistically + PATCHes the server
 */
export function useTimezones(): [
  SavedTimezone[],
  (next: SavedTimezone[]) => Promise<void>,
  boolean,
] {
  const [list, setList] = useState<SavedTimezone[]>(() => loadLocal());
  const [saving, setSaving] = useState(false);
  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; saveLocal(list); }, [list]);

  // Hydrate from server once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/timezones');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (Array.isArray(data.timezones) && data.timezones.length > 0) {
          setList(data.timezones);
        }
      } catch {
        /* offline — keep local */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setTimezones = useCallback(async (next: SavedTimezone[]) => {
    setList(next);
    setSaving(true);
    try {
      await fetch('/api/me/timezones', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ timezones: next }),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  return [list, setTimezones, saving];
}

/**
 * Returns a parallel array of live "HH:MM" strings for each saved zone,
 * recomputed every 30s. Uses h23 cycle for consistency.
 */
export function useTzClocks(list: SavedTimezone[]): string[] {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return list.map((z) => {
    try {
      if (z.tz === 'local') {
        return now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      }
      return now.toLocaleTimeString(undefined, {
        hour: '2-digit', minute: '2-digit', timeZone: z.tz,
      });
    } catch {
      return '--:--';
    }
  });
}

/**
 * Try to derive a short offset/code string for a timezone, like "PT", "ET", "BST".
 * Falls back to "GMT+5" style when no short name is available.
 */
export function tzShortCode(tz: string, when: Date = new Date()): string {
  if (tz === 'local') return 'LT';
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' });
    const parts = fmt.formatToParts(when);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    // Take 2–4 letter codes only; "GMT+5" → "GMT+5"
    return tzPart.length > 5 ? tzPart.slice(0, 5) : tzPart;
  } catch {
    return '?';
  }
}
