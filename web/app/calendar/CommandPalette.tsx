'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './calendar.module.css';

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  icon?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
};

export function CommandPalette({ open, onClose, actions }: Props) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.label} ${a.hint ?? ''}`.toLowerCase().includes(q),
    );
  }, [query, actions]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(Math.max(0, filtered.length - 1));
  }, [filtered, highlight]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = filtered[highlight];
        if (sel) { onClose(); sel.run(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered, highlight, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.cmdScrim}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.cmdModal} role="dialog" aria-label="Command palette">
        <div className={styles.cmdInputWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            className={styles.cmdInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
          />
          <kbd className={styles.cmdKbd}>esc</kbd>
        </div>
        <div className={styles.cmdList}>
          {filtered.length === 0 && (
            <div className={styles.cmdEmpty}>No matches.</div>
          )}
          {filtered.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={[styles.cmdItem, i === highlight ? styles.cmdItemActive : ''].join(' ')}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => { onClose(); a.run(); }}
            >
              <span className={styles.cmdItemIcon}>{a.icon ?? '·'}</span>
              <span className={styles.cmdItemLabel}>{a.label}</span>
              {a.hint && <span className={styles.cmdItemHint}>{a.hint}</span>}
              {a.shortcut && <kbd className={styles.cmdKbd}>{a.shortcut}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
