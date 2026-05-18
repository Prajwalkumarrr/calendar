'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './calendar.module.css';
import { toLocalInput, fromLocalInput } from '@/lib/date';
import type { ChipColor } from '@/lib/events';

const COLORS: ChipColor[] = ['coral', 'sand', 'sage', 'slate', 'plum', 'ochre', 'rose', 'stone'];

const swatchClass: Record<ChipColor, string> = {
  coral: styles.chipCoral,
  sand: styles.chipSand,
  sage: styles.chipSage,
  slate: styles.chipSlate,
  plum: styles.chipPlum,
  ochre: styles.chipOchre,
  rose: styles.chipRose,
  stone: styles.chipStone,
};

export type EventDraft = {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  color: ChipColor;
};

type Props = {
  draft: EventDraft;
  onClose: () => void;
  onSaved: () => void;
};

export function EventModal({ draft, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(draft.title);
  const [start, setStart] = useState(toLocalInput(draft.start));
  const [end, setEnd] = useState(toLocalInput(draft.end));
  const [color, setColor] = useState<ChipColor>(draft.color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // When the start changes, shift the end by the same delta so the duration is preserved.
  function onStartChange(next: string) {
    const oldStart = fromLocalInput(start);
    const oldEnd = fromLocalInput(end);
    const newStart = fromLocalInput(next);
    if (!isNaN(+oldStart) && !isNaN(+oldEnd) && !isNaN(+newStart)) {
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      const newEnd = new Date(newStart.getTime() + Math.max(durationMs, 5 * 60_000));
      setEnd(toLocalInput(newEnd));
    }
    setStart(next);
  }

  // If the user manually sets an end before the start, bump it to start + 15min.
  function onEndChange(next: string) {
    const s = fromLocalInput(start);
    const e = fromLocalInput(next);
    if (!isNaN(+s) && !isNaN(+e) && e <= s) {
      const bumped = new Date(s.getTime() + 15 * 60_000);
      setEnd(toLocalInput(bumped));
      return;
    }
    setEnd(next);
  }

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = JSON.stringify({
        title: title.trim() || 'Untitled',
        start: fromLocalInput(start).toISOString(),
        end: fromLocalInput(end).toISOString(),
        color,
      });
      const res = draft.id
        ? await fetch(`/api/events/${draft.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body })
        : await fetch(`/api/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft.id) return;
    if (!confirm('Delete this event?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${draft.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2 className={styles.modalH}>{draft.id ? 'Edit event' : 'New event'}</h2>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Title</span>
          <input
            ref={titleRef}
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
          />
        </label>

        <div className={`${styles.field} ${styles.timeRow}`}>
          <div>
            <span className={styles.fieldLabel}>Starts</span>
            <input
              type="datetime-local"
              className={styles.input}
              value={start}
              onChange={(e) => onStartChange(e.target.value)}
            />
          </div>
          <div>
            <span className={styles.fieldLabel}>Ends</span>
            <input
              type="datetime-local"
              className={styles.input}
              value={end}
              onChange={(e) => onEndChange(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Color</span>
          <div className={styles.colorRow}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                className={`${styles.colorSwatch} ${color === c ? styles.colorActive : ''}`}
                onClick={() => setColor(c)}
                style={{
                  background: `var(--chip-${c}-bg)`,
                  borderLeft: `4px solid var(--chip-${c}-bar)`,
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--coral-strong, #B85A3C)', fontSize: 12.5, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <div className={styles.modalFooter}>
          {draft.id && (
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={busy}>
            {busy ? 'Saving…' : draft.id ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
