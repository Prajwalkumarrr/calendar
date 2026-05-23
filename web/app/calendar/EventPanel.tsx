'use client';

import { useEffect, useState } from 'react';
import {
  IconChevronDown, IconClock, IconMapPin, IconMore, IconTrash,
  IconVideo, IconX, IconCalendar,
} from './Icons';
import { DEFAULT_CALENDARS } from './defaults';
import type { ChipColor, RecurrenceDTO } from '@/lib/events';
import { HIRING_STAGES, type HiringStage } from '@/lib/hiring-types';
import type { HiringMeta } from '@/lib/events';

const CHIP_COLORS: ChipColor[] = ['coral', 'sand', 'sage', 'slate', 'plum', 'ochre', 'rose', 'stone'];

export type PanelDraft = {
  id?: string;
  seriesId?: string;
  originalDate?: string;
  instanceIndex?: number;
  title: string;
  start: Date;
  end: Date;
  color: ChipColor;
  location?: string;
  description?: string;
  allDay?: boolean;
  recurrence?: RecurrenceDTO | null;
  hiringMeta?: HiringMeta | null;
  isStartup?: boolean;       // passed from CalendarApp when persona === 'startup'
  isNoMeetingDay?: boolean;  // true when the event falls on a configured no-meeting day
  goldenWindow?: { start: number; end: number; groupName: string; color: string } | null;
};

type RepeatPreset = 'none' | 'daily' | 'weekly' | 'weekdays';
type RecurringScope = 'this' | 'future' | 'all';

function recurrenceToPreset(r: RecurrenceDTO | null | undefined): RepeatPreset {
  if (!r) return 'none';
  if (r.freq === 'daily' && (!r.interval || r.interval === 1)) return 'daily';
  if (r.freq === 'weekly' && (!r.interval || r.interval === 1)) {
    const days = r.byWeekday;
    if (!days || days.length === 0) return 'weekly';
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'weekdays';
  }
  return 'weekly';
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

// ─── Scope picker modal ────────────────────────────────────────────────

type ScopeModalProps = {
  mode: 'edit' | 'delete';
  onConfirm: (scope: RecurringScope) => void;
  onCancel: () => void;
};

function ScopeModal({ mode, onConfirm, onCancel }: ScopeModalProps) {
  const [scope, setScope] = useState<RecurringScope>('this');
  const verb = mode === 'edit' ? 'Edit' : 'Delete';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'var(--surface-up, #fff)',
        border: '1px solid var(--hairline, rgba(0,0,0,0.1))',
        borderRadius: 14,
        padding: '24px 24px 20px',
        width: 320,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>
          {verb} recurring event
        </div>

        {(['this', 'future', 'all'] as RecurringScope[]).map((s) => (
          <label key={s} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0', cursor: 'pointer',
            borderBottom: s !== 'all' ? '1px solid var(--hairline, rgba(0,0,0,0.07))' : 'none',
          }}>
            <input
              type="radio"
              name="scope"
              value={s}
              checked={scope === s}
              onChange={() => setScope(s)}
              style={{ accentColor: 'var(--coral, #D97757)', width: 15, height: 15 }}
            />
            <span style={{ fontSize: 13.5, color: 'var(--text, #1F1E1B)' }}>
              {s === 'this' && 'Just this event'}
              {s === 'future' && 'This and following events'}
              {s === 'all' && 'All events'}
            </span>
          </label>
        ))}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--hairline, rgba(0,0,0,0.15))',
              background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--text-2, #6B6862)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(scope)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: mode === 'delete' ? '#e53e3e' : 'var(--text, #1F1E1B)',
              color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {verb}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────

export function EventPanel({ draft, open, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<ChipColor>('coral');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(true);
  const [priv, setPriv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<RepeatPreset>('none');
  const [scopeModal, setScopeModal] = useState<'edit' | 'delete' | null>(null);

  // Hiring fields (startup only)
  const [isInterview, setIsInterview] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [interviewStage, setInterviewStage] = useState<HiringStage>('screen');

  // True for any existing recurring event — base or expanded instance
  const isRecurringInstance = !!(
    draft?.id && (draft?.recurrence || draft?.seriesId)
  );

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setColor(draft.color);
    setLocation(draft.location ?? '');
    setDescription(draft.description ?? '');
    setRepeat(recurrenceToPreset(draft.recurrence));
    setError(null);
    setScopeModal(null);
    // Hiring fields
    if (draft.hiringMeta) {
      setIsInterview(true);
      setCandidateName(draft.hiringMeta.candidateName);
      setCandidateRole(draft.hiringMeta.role);
      setCandidateEmail('');
      setInterviewStage(draft.hiringMeta.stage);
    } else {
      setIsInterview(false);
      setCandidateName('');
      setCandidateRole('');
      setCandidateEmail('');
      setInterviewStage('screen');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.seriesId, draft?.start?.toISOString()]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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

  const cal = DEFAULT_CALENDARS[0];
  const dayLabel = fmtDayLabel(draft.start);

  async function executeSave(scope: RecurringScope) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setScopeModal(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim() || 'Untitled',
        start: draft.start.toISOString(),
        end: draft.end.toISOString(),
        color,
        location: location || undefined,
        description: description || undefined,
        recurrence: presetToRecurrence(repeat, draft.start),
        scope,
        originalDate: draft.originalDate ?? draft.start.toISOString(),
        hiringMeta: isInterview && candidateName.trim()
          ? { candidateName: candidateName.trim(), role: candidateRole.trim() || 'Interview', stage: interviewStage }
          : null,
      };

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

  async function executeDelete(scope: RecurringScope) {
    if (!draft) { onClose(); return; }
    const targetId = draft.seriesId ?? draft.id;
    if (!targetId) { onClose(); return; }
    setSaving(true);
    setScopeModal(null);
    try {
      const originalDate = encodeURIComponent(draft.originalDate ?? draft.start.toISOString());
      const url = `/api/events/${targetId}?scope=${scope}&originalDate=${originalDate}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    if (isRecurringInstance) {
      setScopeModal('edit');
    } else {
      executeSave('all');
    }
  }

  function handleDeleteClick() {
    if (!draft) return;
    if (isRecurringInstance) {
      setScopeModal('delete');
    } else if (draft.recurrence) {
      // base recurring event — confirm all-delete
      if (confirm('Delete this event and ALL of its repeats?')) executeDelete('all');
    } else {
      if (confirm('Delete this event?')) executeDelete('all');
    }
  }

  return (
    <>
      {scopeModal && (
        <ScopeModal
          mode={scopeModal}
          onConfirm={(scope) => scopeModal === 'edit' ? executeSave(scope) : executeDelete(scope)}
          onCancel={() => setScopeModal(null)}
        />
      )}

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

          {draft.isNoMeetingDay && (
            <div style={{
              fontSize: 11.5, marginBottom: 12, padding: '8px 12px',
              background: 'rgba(217,119,87,0.1)',
              border: '1px solid rgba(217,119,87,0.25)',
              borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--coral, #D97757)', fontSize: 12 }}>Focus Day</div>
                <div style={{ color: 'var(--text-2)', marginTop: 2, lineHeight: 1.4 }}>
                  You&apos;ve marked this day as a no-meeting day. You can still save, but consider rescheduling to protect your focus time.
                </div>
              </div>
            </div>
          )}

          {draft.goldenWindow && (() => {
            const gw = draft.goldenWindow;
            const eventH = draft.start.getHours() + draft.start.getMinutes() / 60;
            const inside = eventH >= gw.start && eventH < gw.end;
            return (
              <div style={{
                fontSize: 11.5, marginBottom: 12, padding: '6px 10px',
                background: inside ? `${gw.color}14` : 'rgba(120,120,120,0.08)',
                border: `1px solid ${inside ? gw.color + '44' : 'rgba(120,120,120,0.2)'}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{inside ? '✦' : '○'}</span>
                <span style={{ color: inside ? gw.color : 'var(--text-3)', fontWeight: 500 }}>
                  {inside
                    ? `Within ${gw.groupName} golden hours`
                    : `Outside ${gw.groupName} golden hours`}
                </span>
              </div>
            );
          })()}

          {isRecurringInstance && (
            <div style={{
              fontSize: 11.5, color: 'var(--coral, #D97757)',
              marginBottom: 12, padding: '5px 10px',
              background: 'var(--coral-subtle, rgba(217,119,87,0.08))',
              borderRadius: 6, display: 'inline-block',
            }}>
              Recurring event — changes will ask which occurrences to update
            </div>
          )}

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

          {/* ── Hiring section — startup only ── */}
          {draft.isStartup && (
            <div className="panel-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="panel-section__lbl" style={{ marginBottom: 0 }}>Interview</div>
                <button
                  type="button"
                  className="chip-toggle"
                  aria-pressed={isInterview}
                  onClick={() => setIsInterview((v) => !v)}
                  style={{ fontSize: 11.5 }}
                >
                  {isInterview ? '✓ Interview event' : 'Mark as interview'}
                </button>
              </div>

              {isInterview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    style={{
                      background: 'var(--surface-sunken)', border: '1px solid var(--hairline)',
                      borderRadius: 7, padding: '7px 10px', fontSize: 12.5,
                      color: 'var(--text)', width: '100%',
                    }}
                    placeholder="Candidate name *"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                  <input
                    style={{
                      background: 'var(--surface-sunken)', border: '1px solid var(--hairline)',
                      borderRadius: 7, padding: '7px 10px', fontSize: 12.5,
                      color: 'var(--text)', width: '100%',
                    }}
                    placeholder="Role (e.g. Frontend Engineer)"
                    value={candidateRole}
                    onChange={(e) => setCandidateRole(e.target.value)}
                  />
                  <input
                    style={{
                      background: 'var(--surface-sunken)', border: '1px solid var(--hairline)',
                      borderRadius: 7, padding: '7px 10px', fontSize: 12.5,
                      color: 'var(--text)', width: '100%',
                    }}
                    placeholder="Candidate email (optional)"
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                  />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>Stage</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {HIRING_STAGES.filter((s) => s.id !== 'rejected').map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="chip-toggle"
                          aria-pressed={interviewStage === s.id}
                          onClick={() => setInterviewStage(s.id)}
                          style={{
                            fontSize: 11.5,
                            ...(interviewStage === s.id
                              ? { background: s.color, color: '#fff', borderColor: s.color }
                              : {}),
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
          <button className="danger" onClick={handleDeleteClick} disabled={saving}>
            <IconTrash size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
            Delete
          </button>
          <button className="save" onClick={handleSaveClick} disabled={saving}>
            {saving ? 'Saving…' : draft.id ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}
