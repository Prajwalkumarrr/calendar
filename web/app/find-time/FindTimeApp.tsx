'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './find-time.css';

type Member = { userId: string; name?: string; email?: string; role: string };
type Workspace = { id: string; name: string; role: string };
type Slot = { start: string; end: string; conflicts: string[] };

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function FindTimeApp({ currentUserId, currentUserName }: { currentUserId: string; currentUserName: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([currentUserId]));
  const [duration, setDuration] = useState(30);
  const [workdayStart, setWorkdayStart] = useState('09:00');
  const [workdayEnd, setWorkdayEnd] = useState('17:00');
  const [horizonDays, setHorizonDays] = useState(7);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/workspaces');
      if (!res.ok) return;
      const data = await res.json();
      const list: Workspace[] = data.workspaces ?? [];
      setWorkspaces(list);
      if (list[0]) setActiveWs(list[0]);
    })();
  }, []);

  // Load members of active workspace
  useEffect(() => {
    if (!activeWs) { setMembers([]); return; }
    (async () => {
      const res = await fetch(`/api/workspaces/${activeWs.id}/members`);
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
    })();
  }, [activeWs]);

  function toggleMember(userId: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      // always keep current user selected
      if (!next.has(currentUserId)) next.add(currentUserId);
      return next;
    });
  }

  async function search() {
    setSearching(true);
    setError(null);
    setSlots([]);
    try {
      const from = new Date(); from.setHours(0, 0, 0, 0);
      const to = new Date(from); to.setDate(from.getDate() + horizonDays);
      const res = await fetch('/api/find-time', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          memberIds: Array.from(selectedIds),
          durationMin: duration,
          from: from.toISOString(),
          to: to.toISOString(),
          workdayStart, workdayEnd,
          weekdaysOnly: true,
          stepMin: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to find times');
      setSlots(data.slots ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  // Group slots by day, preserving sort order within day
  const grouped = useMemo(() => {
    const byDay: Record<string, { day: Date; slots: Slot[] }> = {};
    for (const s of slots) {
      const d = new Date(s.start);
      d.setHours(0, 0, 0, 0);
      const k = dayKey(d);
      if (!byDay[k]) byDay[k] = { day: d, slots: [] };
      byDay[k].slots.push(s);
    }
    return Object.values(byDay).sort((a, b) => a.day.getTime() - b.day.getTime());
  }, [slots]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.userId, m] as const)), [members]);

  return (
    <div className="ft-shell">
      <div className="ft-wrap">
        <Link href="/home" className="ft-back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>

        <h1 className="ft-h">Find a time</h1>
        <p className="ft-sub">
          Pick teammates and a duration. We&apos;ll search for slots when everyone is free.
        </p>

        <div className="ft-card">
          <div className="ft-card__h">Workspace</div>
          {workspaces.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              You&apos;re not in a workspace yet. <Link href="/settings#workspace" style={{ color: 'var(--coral)' }}>Create one</Link> to invite teammates.
            </p>
          ) : (
            <select
              className="ft-select"
              value={activeWs?.id ?? ''}
              onChange={(e) => setActiveWs(workspaces.find((w) => w.id === e.target.value) ?? null)}
              style={{ width: 'auto', minWidth: 240 }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>

        {activeWs && (
          <div className="ft-card">
            <div className="ft-card__h">Who&apos;s coming?</div>
            <div className="ft-members">
              {members.map((m) => {
                const on = selectedIds.has(m.userId);
                const initial = (m.name ?? m.email ?? '?').trim()[0]?.toUpperCase() ?? '?';
                return (
                  <button
                    key={m.userId}
                    type="button"
                    className={`ft-member ${on ? 'on' : ''}`}
                    onClick={() => toggleMember(m.userId)}
                  >
                    <span className="ft-member__avatar">{initial}</span>
                    {m.userId === currentUserId ? `${m.name ?? currentUserName} (you)` : (m.name ?? m.email)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="ft-card">
          <div className="ft-card__h">Window</div>
          <div className="ft-controls">
            <div className="ft-control">
              <span className="ft-control__lbl">Duration</span>
              <select className="ft-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>
            <div className="ft-control">
              <span className="ft-control__lbl">Search horizon</span>
              <select className="ft-select" value={horizonDays} onChange={(e) => setHorizonDays(Number(e.target.value))}>
                <option value={3}>Next 3 days</option>
                <option value={7}>Next 7 days</option>
                <option value={14}>Next 14 days</option>
                <option value={30}>Next 30 days</option>
              </select>
            </div>
            <div className="ft-control">
              <span className="ft-control__lbl">Earliest start</span>
              <input className="ft-input" type="time" value={workdayStart} onChange={(e) => setWorkdayStart(e.target.value)} />
            </div>
            <div className="ft-control">
              <span className="ft-control__lbl">Latest end</span>
              <input className="ft-input" type="time" value={workdayEnd} onChange={(e) => setWorkdayEnd(e.target.value)} />
            </div>
          </div>

          <button className="ft-search-btn" onClick={search} disabled={searching || selectedIds.size === 0}>
            {searching ? 'Searching…' : 'Find times'}
          </button>
          {error && <div className="ft-err">{error}</div>}
        </div>

        {slots.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '20px 4px 0', letterSpacing: '-0.01em' }}>
              {slots.filter((s) => s.conflicts.length === 0).length} slots work for everyone
            </h2>
            {grouped.map(({ day, slots: daySlots }) => (
              <div key={dayKey(day)}>
                <div className="ft-day-h">{fmtDay(day)}</div>
                {daySlots.map((s) => {
                  const dStart = new Date(s.start);
                  const dEnd = new Date(s.end);
                  const conflicts = s.conflicts.length;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      className={`ft-slot ${conflicts === 0 ? 'best' : 'has-conflicts'}`}
                      onClick={() => {
                        // Future: pre-open event panel; for now, log
                        console.log('Pick slot', s);
                      }}
                    >
                      <span className="ft-slot__time">
                        {fmtTime(dStart)} – {fmtTime(dEnd)}
                      </span>
                      {conflicts === 0 ? (
                        <span className="ft-slot__pill">All free</span>
                      ) : (
                        <span className="ft-slot__pill">
                          {conflicts} conflict{conflicts > 1 ? 's' : ''}
                          {conflicts <= 2 && ` (${s.conflicts.map((id) => {
                            const m = memberById.get(id);
                            return (m?.name ?? m?.email ?? 'someone').split(' ')[0];
                          }).join(', ')})`}
                        </span>
                      )}
                      <svg className="ft-slot__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {slots.length === 0 && searching === false && (
          <div className="ft-empty">Pick the people and a duration, then click <strong>Find times</strong>.</div>
        )}
      </div>
    </div>
  );
}
