'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTimezones, useTzClocks, tzShortCode, type SavedTimezone } from '@/lib/useTimezones';
import './timezones.css';

// A curated set of popular cities for quick-add suggestions.
const POPULAR: { label: string; tz: string }[] = [
  { label: 'Palo Alto / SF', tz: 'America/Los_Angeles' },
  { label: 'New York', tz: 'America/New_York' },
  { label: 'Chicago', tz: 'America/Chicago' },
  { label: 'Denver', tz: 'America/Denver' },
  { label: 'Toronto', tz: 'America/Toronto' },
  { label: 'Mexico City', tz: 'America/Mexico_City' },
  { label: 'São Paulo', tz: 'America/Sao_Paulo' },
  { label: 'London', tz: 'Europe/London' },
  { label: 'Paris', tz: 'Europe/Paris' },
  { label: 'Berlin', tz: 'Europe/Berlin' },
  { label: 'Madrid', tz: 'Europe/Madrid' },
  { label: 'Rome', tz: 'Europe/Rome' },
  { label: 'Amsterdam', tz: 'Europe/Amsterdam' },
  { label: 'Stockholm', tz: 'Europe/Stockholm' },
  { label: 'Dubai', tz: 'Asia/Dubai' },
  { label: 'Mumbai', tz: 'Asia/Kolkata' },
  { label: 'Bangalore', tz: 'Asia/Kolkata' },
  { label: 'Singapore', tz: 'Asia/Singapore' },
  { label: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { label: 'Shanghai', tz: 'Asia/Shanghai' },
  { label: 'Tokyo', tz: 'Asia/Tokyo' },
  { label: 'Seoul', tz: 'Asia/Seoul' },
  { label: 'Sydney', tz: 'Australia/Sydney' },
  { label: 'Melbourne', tz: 'Australia/Melbourne' },
  { label: 'Auckland', tz: 'Pacific/Auckland' },
  { label: 'UTC', tz: 'UTC' },
];

const MAX = 8;

export function TimezonesApp() {
  const [list, setTimezones, saving] = useTimezones();
  const clocks = useTzClocks(list);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queryLower = query.trim().toLowerCase();
  const existingTz = useMemo(() => new Set(list.map((z) => z.tz)), [list]);
  const suggestions = useMemo(() => {
    if (queryLower.length === 0) return [] as { label: string; tz: string }[];
    return POPULAR.filter((p) =>
      !existingTz.has(p.tz) &&
      (p.label.toLowerCase().includes(queryLower) || p.tz.toLowerCase().includes(queryLower)),
    ).slice(0, 10);
  }, [queryLower, existingTz]);

  function changeLabel(i: number, label: string) {
    const next = list.map((z, idx) => (idx === i ? { ...z, label } : z));
    setTimezones(next);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setTimezones(next);
  }
  function remove(i: number) {
    if (list.length <= 1) {
      setError('Keep at least one zone.');
      return;
    }
    setError(null);
    setTimezones(list.filter((_, idx) => idx !== i));
  }
  function add(tz: string, label?: string) {
    setError(null);
    if (list.length >= MAX) {
      setError(`At most ${MAX} zones.`);
      return;
    }
    if (existingTz.has(tz)) {
      setError(`${tz} is already in your strip.`);
      return;
    }
    const name = label ?? tz.split('/').pop() ?? 'Zone';
    setTimezones([...list, { tz, label: name }]);
    setQuery('');
  }

  return (
    <div className="tz-shell">
      <div className="tz-wrap">
        <Link href="/home" className="tz-back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Back to home
        </Link>

        <h1 className="tz-h">Time zones</h1>
        <p className="tz-sub">
          Shown in the strip on your calendar and home sidebars. Up to {MAX} zones · drag to reorder.
        </p>

        <div className="tz-card">
          {list.length === 0 ? (
            <div className="tz-empty">No zones yet. Add one below.</div>
          ) : (
            list.map((z, i) => (
              <div className="tz-row" key={`${z.tz}-${i}`}>
                <span className="tz-grip">⋮⋮</span>
                <span className="tz-offset">{tzShortCode(z.tz)}</span>
                <input
                  className="tz-label-input"
                  value={z.label}
                  onChange={(e) => changeLabel(i, e.target.value)}
                  maxLength={40}
                />
                <span className="tz-time">{clocks[i]}</span>
                <button
                  className="tz-move-btn"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  title="Move up"
                >▲</button>
                <button
                  className="tz-move-btn"
                  onClick={() => move(i, 1)}
                  disabled={i === list.length - 1}
                  aria-label="Move down"
                  title="Move down"
                >▼</button>
                <button
                  className="tz-del-btn"
                  onClick={() => remove(i)}
                  disabled={list.length <= 1}
                  aria-label="Remove"
                  title="Remove"
                  style={{ gridColumn: '6' }}
                >×</button>
              </div>
            ))
          )}
        </div>

        <div className="tz-card">
          <div className="tz-add">
            <input
              type="text"
              placeholder="Search a city or IANA name (e.g. Tokyo, America/New_York)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={list.length >= MAX}
            />
            <button
              onClick={() => add(query.trim(), undefined)}
              disabled={!query.trim() || list.length >= MAX}
              title="Add custom IANA name"
            >
              + Add
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="tz-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.tz}
                  type="button"
                  className="tz-suggestion"
                  onClick={() => add(s.tz, s.label)}
                >
                  <span>{s.label}</span>
                  <span className="tz-suggestion__tz">{s.tz}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="tz-err">{error}</div>}

        <div className="tz-foot">
          <span>{list.length} / {MAX} zones</span>
          {saving && <span className="tz-foot__saving">Saving…</span>}
        </div>
      </div>
    </div>
  );
}
