'use client';

// ⌘K command palette — faithful port of prototype/command-palette.jsx

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCalendar, IconClock, IconCommand, IconLink, IconMoon, IconPlus, IconSearch, IconSettings,
} from './Icons';

type CmdIconKind = 'plus' | 'cal' | 'moon' | 'link' | 'set' | 'event';

export type Cmd = {
  section: 'Recent' | 'Actions' | 'Events' | 'Calendars';
  id: string;
  label: string;
  hint?: string;
  kbd?: string[];
  icon: CmdIconKind;
  run?: () => void;
};

function CmdIconView({ kind }: { kind: CmdIconKind }) {
  switch (kind) {
    case 'plus': return <span className="cmdk__item-icon"><IconPlus size={15} /></span>;
    case 'cal': return <span className="cmdk__item-icon"><IconCalendar size={15} /></span>;
    case 'moon': return <span className="cmdk__item-icon"><IconMoon size={15} /></span>;
    case 'link': return <span className="cmdk__item-icon"><IconLink size={15} /></span>;
    case 'set': return <span className="cmdk__item-icon"><IconSettings size={15} /></span>;
    case 'event': return <span className="cmdk__item-icon"><IconClock size={15} /></span>;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Cmd[];
};

export function CommandPaletteProto({ open, onClose, commands }: Props) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    return q.trim()
      ? commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
      : commands;
  }, [q, commands]);

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

  // group by section
  const groups: Record<string, Cmd[]> = {};
  for (const c of filtered) {
    (groups[c.section] = groups[c.section] || []).push(c);
  }

  return (
    <div className={`cmdk-backdrop ${open ? 'cmdk-backdrop--open' : ''}`} onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk__input-wrap">
          <IconSearch size={18} style={{ color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Type a command or search…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          />
          <span className="cmdk__hint">esc to close</span>
        </div>

        <div className="cmdk__list">
          {Object.entries(groups).map(([section, items]) => (
            <div key={section}>
              <div className="cmdk__section-lbl">{section}</div>
              {items.map((c) => {
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
