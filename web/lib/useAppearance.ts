'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'regular' | 'comfy';
  accent: string;
  chipStyle: 'fill' | 'tinted' | 'outline';
  weekStart: 'mon' | 'sun' | 'sat';
  timeFormat: '12' | '24';
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: 'light',
  density: 'regular',
  accent: '#D97757',
  chipStyle: 'tinted',
  weekStart: 'mon',
  timeFormat: '24',
};

const LS_KEY = 'elevaite.appearance';

function loadLocal(): AppearancePrefs {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // Migrate old "elevaite.theme" key
      const oldTheme = localStorage.getItem('elevaite.theme') as 'light' | 'dark' | null;
      if (oldTheme) return { ...DEFAULT_APPEARANCE, theme: oldTheme };
      return DEFAULT_APPEARANCE;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_APPEARANCE, ...parsed };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function saveLocal(prefs: AppearancePrefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private mode — ignore */
  }
}

function apply(prefs: AppearancePrefs) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Theme — 'system' follows prefers-color-scheme
  const effective = prefs.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : prefs.theme;
  root.dataset.theme = effective;

  // Density
  root.dataset.density = prefs.density;

  // Accent color override
  root.style.setProperty('--coral', prefs.accent);
}

/**
 * Single source of truth for visual preferences.
 * - Loads from localStorage instantly (no flicker)
 * - Syncs with server in the background, updates if newer
 * - Optimistic write: caller's setPref applies immediately, then writes to server
 *
 * Returns [prefs, setPref, isSaving].
 */
export function useAppearance(): [
  AppearancePrefs,
  <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => Promise<void>,
  boolean,
] {
  const [prefs, setPrefs] = useState<AppearancePrefs>(() => loadLocal());
  const [saving, setSaving] = useState(false);
  const prefsRef = useRef(prefs);

  // Apply on mount + every change
  useEffect(() => {
    apply(prefs);
    saveLocal(prefs);
    prefsRef.current = prefs;
  }, [prefs]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (prefs.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply(prefsRef.current);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs.theme]);

  // Hydrate from server on mount (once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/appearance');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const server = data.prefs as AppearancePrefs;
        // Only update if server differs from local — avoids needless re-render
        const same = (Object.keys(server) as (keyof AppearancePrefs)[]).every(
          (k) => server[k] === prefsRef.current[k],
        );
        if (!same) setPrefs(server);
      } catch {
        /* offline — keep local */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setPref = useCallback(
    async <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => {
      // Optimistic — update local + apply immediately
      setPrefs((p) => ({ ...p, [key]: value }));
      setSaving(true);
      try {
        await fetch('/api/me/appearance', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        });
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return [prefs, setPref, saving];
}
