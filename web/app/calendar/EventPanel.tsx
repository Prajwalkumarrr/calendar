'use client';

// Right-slide event detail panel — faithful port of prototype/event-panel.jsx,
// wired to the real /api/events backend.

import { useEffect, useState } from 'react';
import {
  IconChevronDown, IconClock, IconMapPin, IconMore, IconPlus, IconTrash,
  IconVideo, IconX, IconCalendar,
} from './Icons';
import { DEFAULT_CALENDARS } from './defaults';
import type { ChipColor, EventDTO, RecurrenceDTO } from '@/lib/events';

const CHIP_COLORS: ChipColor[] = ['coral', 'sand', 'sage', 'slate', 'plum', 'ochre', 'rose', 'stone'];

export type PanelDraft = {
  id?: string;
  seriesId?: string;  // if editing an expanded instance, use this id for PATCH/DELETE
  title: string;
  start: Date;
  end: Date;
  color: ChipColor;
  location?: string;
  description?: string;
  allDay?: boolean;
  recurrence?: RecurrenceDTO | null;
};

type RepeatPreset = 'none' | 'daily' | 'weekly' | 'weekdays';

function recurrenceToPreset(r: RecurrenceDTO | null | undefined): RepeatPreset {
  if (!r) return 'none';
  if (r.freq === 'daily' && (!r.interval || r.interval === 1)) return 'daily';
  if (r.freq === 'weekly' && (!r.interval || r.interval === 1)) {
    const days = r.byWeekday;
    if (!days || days.length === 0) return 'weekly';
    // 1,2,3,4,5 = Mon-Fri
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'weekdays';
  }
  return 'weekly'; // anything custom → render as weekly preset for now
}

function presetToRecurrence(p: RepeatPreset, start: Date): RecurrenceDTO | null {
  switch (p) {
    case 'none': return null;
    case 'daily': return { freq: 'daily', interval: 1 };
    case 'weekly': return { freq: 'weekly', interval: 1, byWeekday: [start.getDay()] };
    case 'weekdays': return { freq: 'weekly', interval: 1, byWeekday: [1, 2, 3, 4, 5] };
  }
}

function describeRecurrence(r: RecurrenceDTO | null | undefined, start: Date): string {
  if (!r) return 'Does not repeat';
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][start.getDay()];
  if (r.freq === 'daily') return r.interval > 1 ? `Every ${r.interval} days` : 'Daily';
  if (r.freq === 'weekly') {
    const days = r.byWeekday ?? [];
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays (Mon–Fri)';
    if (days.length === 0 || (days.length === 1 && days[0] === start.getDay())) {
      return r.interval > 1 ? `Every ${r.interval} weeks on ${dayName}` : `Weekly on ${dayName}`;
    }
    const names = days.sort().map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
    return r.interval > 1 ? `Every ${r.interval} weeks on ${names}` : `Weekly on ${names}`;
  }
  if (r.freq === 'monthly') return r.interval > 1 ? `Every ${r.interval} months` : 'Monthly';
  if (r.freq === 'yearly') return r.interval > 1 ? `Every ${r.interval} years` : 'Yearly';
  return 'Custom';
}

type Props = {
  draft: PanelDraft | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function fmtRange(start: Date, end: Date): string {
  const f = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };
  return `${f(start)} – ${f(end)}`;
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function durationMin(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

const AVATAR_BGS = [
  'linear-gradient(135deg, #D97757, #C28699)',
  'linear-gradient(135deg, #88A188, #B89968)',
  'linear-gradient(135deg, #7A8DA8, #9A7B98)',
  'linear-gradient(135deg, #C8A057, #D97757)',
  'linear-gradient(135deg, #B89968, #88A188)',
];

export function EventPanel({ draft, open, onClose, onSaved }: Props) {
  // Hooks always run regardless of draft (rules of hooks)
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<ChipColor>('coral');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(true);
  const [priv, setPriv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<RepeatPreset>('none');

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setColor(draft.color);
    setLocation(draft.location ?? '');
    setDescription(draft.description ?? '');
    setRepeat(recurrenceToPreset(draft.recurrence));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.seriesId, draft?.start?.toISOString()]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!draft) {
    return (
      <>
        <div className={`panel-backdrop ${open ? 'panel-backdrop--open' : ''}`} onClick={onClose} />
        <div className={`panel ${open ? 'panel--open' : ''}`} />
      </>
    );
  }

  const cal = DEFAULT_CALENDARS[0]; // TODO: real calendar selection in next pass
  const dayLabel = fmtDayLabel(draft.start);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: title.trim() || 'Untitled',
        start: draft.start.toISOString(),
        end: draft.end.toISOString(),
        color,
        location: location || undefined,
        description: description || undefined,
        recurrence: presetToRecurrence(repeat, draft.start),
      };
      // When editing an expanded instance, the panel's `id` is synthetic ("baseId@N").
      // Use seriesId (the real Mongo id) for PATCH.
      const targetId = draft.seriesId ?? draft.id;
      const res = targetId
        ? await fetch(`/api/events/${targetId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/events', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft) { onClose(); return; }
    const targetId = draft.seriesId ?? draft.id;
    if (!targetId) { onClose(); return; }
    const msg = draft.recurrence
      ? 'Delete this recurring event and ALL of its repeats?'
      : 'Delete this event?';
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${targetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={`panel-backdrop ${open ? 'panel-backdrop--open' : ''}`}
        onClick={onClose}
      />
      <div className={`panel ${open ? 'panel--open' : ''}`}>
        <div className="panel__hd">
          <div className="panel__hd-tag">
            <span
              className="panel__hd-tag-dot"
              style={{ background: `var(--chip-${color}-bar)` }}
            />
            {cal.name}
          </div>
          <button className="icon-btn" title="More"><IconMore /></button>
          <button className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX /></button>
        </div>

        <div className="panel__body">
          <input
            className="panel__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled event"
            autoFocus={!draft.id}
          />

          <div className="panel-row">
            <IconClock className="panel-row__icon" />
            <div style={{ flex: 1 }}>
              <div className="panel-row__value panel-row__value--mono">
                {fmtRange(draft.start, draft.end)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                {dayLabel} · {durationMin(draft.start, draft.end)} min
              </div>
            </div>
            <button className="chip-toggle" aria-pressed={!!draft.allDay}>All day</button>
          </div>

          <div className="panel-row">
            <IconMapPin className="panel-row__icon" />
            <input
              className="panel-row__value"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              style={{
                background: 'transparent', border: 0, outline: 'none',
                fontSize: 13, color: 'var(--text)', flex: 1,
              }}
            />
            <button className="chip-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconVideo size={11} /> Add call <IconChevronDown size={11} />
            </button>
          </div>

          <div className="panel-row">
            <IconCalendar className="panel-row__icon" />
            <div className="panel-row__value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className="cal-account__swatch"
                style={{ background: `var(--chip-${cal.color}-bar)` }}
              />
              {cal.name}
              <IconChevronDown size={12} />
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section__lbl">Repeat</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {([
                { v: 'none', l: 'Never' },
                { v: 'daily', l: 'Daily' },
                { v: 'weekly', l: 'Weekly' },
                { v: 'weekdays', l: 'Weekdays' },
              ] as { v: RepeatPreset; l: string }[]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  className="chip-toggle"
                  aria-pressed={repeat === o.v}
                  onClick={() => setRepeat(o.v)}
                >
                  {o.l}
                </button>
              ))}
            </div>
            {repeat !== 'none' && (
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {describeRecurrence(presetToRecurrence(repeat, draft.start), draft.start)}
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="panel-section__lbl">Notes</div>
            <textarea
              className="panel__notes"
              placeholder="Add a description, agenda, or links…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="panel-section">
            <div className="panel-section__lbl">Color</div>
            <div className="color-row">
              {CHIP_COLORS.map((c) => (
                <button
                  key={c}
                  className="color-swatch"
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  style={{ background: `var(--chip-${c}-bar)` }}
                />
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section__lbl">Availability</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="chip-toggle" aria-pressed={busy} onClick={() => setBusy(true)}>Busy</button>
              <button className="chip-toggle" aria-pressed={!busy} onClick={() => setBusy(false)}>Free</button>
              <button className="chip-toggle" aria-pressed={priv} onClick={() => setPriv(!priv)}>
                Private
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              margin: '12px 0', padding: '10px 12px',
              background: 'var(--coral-subtle)',
              color: 'var(--coral-strong, var(--coral))',
              borderRadius: 8, fontSize: 12.5,
            }}>{error}</div>
          )}
        </div>

        <div className="panel__foot">
          <button className="danger" onClick={remove} disabled={saving}>
            <IconTrash size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
            Delete
          </button>
          <button className="save" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : draft.id ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}
