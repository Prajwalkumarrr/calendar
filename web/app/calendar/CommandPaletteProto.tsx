'use client';

// ⌘K command palette — extends the prototype's design with live API search
// against events / scheduling links / bookings.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconCalendar, IconClock, IconCommand, IconLink, IconMoon, IconPlus, IconSearch, IconSettings,
} from './Icons';

type CmdIconKind = 'plus' | 'cal' | 'moon' | 'link' | 'set' | 'event' | 'search' | 'person';

export type Cmd = {
  section: 'Recent' | 'Actions' | 'Events' | 'Calendars' | 'Bookings' | 'Search';
  id: string;
  label: string;
  hint?: string;
  kbd?: string[];
  icon: CmdIconKind;
  run?: () => void;
};

function CmdIconView({ kind }: { kind: CmdIconKind }) {
  switch (kind) {
    case 'plus':   return <span className="cmdk__item-icon"><IconPlus size={15} /></span>;
    case 'cal':    return <span className="cmdk__item-icon"><IconCalendar size={15} /></span>;
    case 'moon':   return <span className="cmdk__item-icon"><IconMoon size={15} /></span>;
    case 'link':   return <span className="cmdk__item-icon"><IconLink size={15} /></span>;
    case 'set':    return <span className="cmdk__item-icon"><IconSettings size={15} /></span>;
    case 'event':  return <span className="cmdk__item-icon"><IconClock size={15} /></span>;
    case 'search': return <span className="cmdk__item-icon"><IconSearch size={15} /></span>;
    case 'person': return <span className="cmdk__item-icon">👤</span>;
  }
}

type SearchResults = {
  events: { id: string; title: string; start: string }[];
  links: { id: string; title: string; slug: string; durationMin: number }[];
  bookings: { id: string; inviteeName: string; inviteeEmail: string; start: string; linkTitle?: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Cmd[];
};

export function CommandPaletteProto({ open, onClose, commands }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const [remote, setRemote] = useState<SearchResults>({ events: [], links: [], bookings: [] });
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setRemote({ events: [], links: [], bookings: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Live API search — debounced
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setRemote({ events: [], links: [], bookings: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=5`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setRemote(data);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q, open]);

  // Merge static commands with live API results.
  const filtered: Cmd[] = useMemo(() => {
    const term = q.trim();
    const staticMatched = term
      ? commands.filter((c) => c.label.toLowerCase().includes(term.toLowerCase()))
      : commands;

    if (!term) return staticMatched;

    const dynamic: Cmd[] = [];

    for (const e of remote.events) {
      const d = new Date(e.start);
      dynamic.push({
        section: 'Events',
        id: `ev-${e.id}`,
        label: e.title,
        hint: d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
        icon: 'event',
        run: () => router.push('/calendar'),
      });
    }
    for (const l of remote.links) {
      dynamic.push({
        section: 'Calendars',
        id: `ln-${l.id}`,
        label: l.title,
        hint: `/book/${l.slug}`,
        icon: 'link',
        run: () => router.push(`/book/${l.slug}`),
      });
    }
    for (const b of remote.bookings) {
      dynamic.push({
        section: 'Bookings',
        id: `bk-${b.id}`,
        label: b.inviteeName,
        hint: b.linkTitle ? `${b.inviteeEmail} · ${b.linkTitle}` : b.inviteeEmail,
        icon: 'person',
        run: () => router.push(`/booked/${b.id}`),
      });
    }

    // Always offer "Search everything for…" as the last item
    const goSearch: Cmd = {
      section: 'Search',
      id: 'go-search',
      label: `Search everything for "${term}"`,
      icon: 'search',
      kbd: ['↵'],
      run: () => router.push(`/search?q=${encodeURIComponent(term)}`),
    };

    return [...staticMatched, ...dynamic, goSearch];
  }, [q, commands, remote, router]);

  useEffect(() => {
    if (idx >= filtered.length) setIdx(Math.max(0, filtered.length - 1));
  }, [filtered, idx]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(filtered.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[idx];
        if (cmd) {
          onClose();
          cmd.run?.();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered, idx, onClose]);

  // group by section, preserving the order each section first appears in
  const sectionOrder: string[] = [];
  const groups: Record<string, Cmd[]> = {};
  for (const c of filtered) {
    if (!groups[c.section]) {
      groups[c.section] = [];
      sectionOrder.push(c.section);
    }
    groups[c.section].push(c);
  }

  if (!open) return null;

  return (
    <div className="cmdk-backdrop cmdk-backdrop--open" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk__input-wrap">
          <IconSearch size={18} style={{ color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Search or run a command…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          />
          <span className="cmdk__hint">{searching ? 'Searching…' : 'esc to close'}</span>
        </div>

        <div className="cmdk__list">
          {sectionOrder.map((section) => (
            <div key={section}>
              <div className="cmdk__section-lbl">{section}</div>
              {groups[section].map((c) => {
                const i = filtered.indexOf(c);
                return (
                  <div
                    key={c.id}
                    className={`cmdk__item ${i === idx ? 'cmdk__item--selected' : ''}`}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => { onClose(); c.run?.(); }}
                  >
                    <CmdIconView kind={c.icon} />
                    <div className="cmdk__item-label">
                      {c.label}
                      {c.hint && <small>{c.hint}</small>}
                    </div>
                    <div className="cmdk__item-kbd">
                      {c.kbd && c.kbd.map((k, j) => <span className="kbd" key={j}>{k}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No matches for &quot;{q}&quot;
            </div>
          )}
        </div>

        <div className="cmdk__foot">
          <span className="cmdk__foot-item"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span className="cmdk__foot-item"><span className="kbd">↵</span> select</span>
          <span className="cmdk__foot-item"><span className="kbd">esc</span> close</span>
          <span style={{ marginLeft: 'auto' }} className="cmdk__foot-item">
            <IconCommand size={11} /> ElevAIte
          </span>
        </div>
      </div>
    </div>
  );
}
