'use client';

import { useEffect, useState } from 'react';
import { HIRING_STAGES, type CandidateDTO, type HiringStage } from '@/lib/hiring-types';
import type { EventDTO } from '@/lib/events';

const STAGE_COLORS: Record<HiringStage, string> = {
  screen:    '#748AA6',
  technical: '#997594',
  founder:   '#C49746',
  offer:     '#7E9C7A',
  rejected:  '#A19D94',
};

// ─── Add Candidate Modal ───────────────────────────────────────────────

function AddCandidateModal({
  onAdd,
  onClose,
}: {
  onAdd: (c: CandidateDTO) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<HiringStage>('screen');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/hiring/candidates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role: role.trim(), email: email.trim() || undefined, stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add candidate');
      onAdd(data.candidate);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--hairline-strong)',
        borderRadius: 14, padding: '28px 28px 22px', width: 360,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, letterSpacing: '-0.01em' }}>
          Add candidate
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            autoFocus
            required
            placeholder="Full name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="Role (e.g. Frontend Engineer) *"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Starting stage</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {HIRING_STAGES.filter((s) => s.id !== 'rejected').map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11.5, cursor: 'pointer',
                    border: `1px solid ${stage === s.id ? s.color : 'var(--border)'}`,
                    background: stage === s.id ? s.color : 'transparent',
                    color: stage === s.id ? '#fff' : 'var(--text-2)',
                    fontWeight: stage === s.id ? 600 : 400,
                    transition: 'all 120ms ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: '#e53e3e' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={saving || !name.trim() || !role.trim()} style={primaryBtnStyle}>
              {saving ? 'Adding…' : 'Add candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Candidate Card ────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  interviews,
  onStageChange,
  onDelete,
}: {
  candidate: CandidateDTO;
  interviews: EventDTO[];
  onStageChange: (id: string, stage: HiringStage) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = STAGE_COLORS[candidate.stage];
  const initials = candidate.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  async function moveStage(stage: HiringStage) {
    setMenuOpen(false);
    const res = await fetch(`/api/hiring/candidates/${candidate.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) onStageChange(candidate.id, stage);
  }

  async function remove() {
    setMenuOpen(false);
    if (!confirm(`Remove ${candidate.name} from pipeline?`)) return;
    const res = await fetch(`/api/hiring/candidates/${candidate.id}`, { method: 'DELETE' });
    if (res.ok) onDelete(candidate.id);
  }

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--hairline-strong)',
      borderRadius: 10, padding: '12px 14px',
      position: 'relative', cursor: 'default',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: color, color: '#fff',
          display: 'grid', placeItems: 'center',
          fontSize: 12, fontWeight: 700,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {candidate.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 1 }}>
            {candidate.role}
          </div>
          {candidate.email && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {candidate.email}
            </div>
          )}
        </div>

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{ color: 'var(--text-3)', padding: '0 2px', lineHeight: 1, fontSize: 16, marginTop: -2 }}
        >
          ···
        </button>
      </div>

      {/* Days in stage */}
      <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-3)' }}>
        Added {Math.floor((Date.now() - new Date(candidate.createdAt).getTime()) / 86_400_000)} days ago
      </div>

      {/* Scheduled interviews */}
      {interviews.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid var(--hairline)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {interviews.map((ev) => {
            const d = new Date(ev.start);
            const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-2)' }}>
                <span style={{ fontSize: 11 }}>📅</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 36, right: 8, zIndex: 20,
          background: 'var(--bg)', border: '1px solid var(--hairline-strong)',
          borderRadius: 9, boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
          padding: '4px 0', minWidth: 160,
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', padding: '6px 12px 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Move to
          </div>
          {HIRING_STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => moveStage(s.id)}
              disabled={s.id === candidate.stage}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px', fontSize: 12.5,
                color: s.id === candidate.stage ? 'var(--text-3)' : 'var(--text)',
                background: 'none', border: 'none', cursor: s.id === candidate.stage ? 'default' : 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              {s.label}
              {s.id === candidate.stage && ' ✓'}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--hairline)', margin: '4px 0' }} />
          <button
            onClick={remove}
            style={{
              display: 'block', width: '100%', padding: '7px 12px',
              fontSize: 12.5, color: '#e53e3e', background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            Remove from pipeline
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Pipeline View ────────────────────────────────────────────────

export function HiringPipeline({ onClose }: { onClose: () => void }) {
  const [candidates, setCandidates] = useState<CandidateDTO[]>([]);
  const [interviewEvents, setInterviewEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 90 * 86_400_000);
    Promise.all([
      fetch('/api/hiring/candidates').then((r) => r.json()),
      fetch(`/api/events?from=${now.toISOString()}&to=${future.toISOString()}`).then((r) => r.json()),
    ])
      .then(([cd, ev]) => {
        setCandidates(cd.candidates ?? []);
        const allEvents: EventDTO[] = ev.events ?? [];
        setInterviewEvents(allEvents.filter((e) => e.hiringMeta?.candidateId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function interviewsFor(candidateId: string) {
    return interviewEvents
      .filter((e) => e.hiringMeta?.candidateId === candidateId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  function handleAdd(c: CandidateDTO) {
    setCandidates((prev) => [c, ...prev]);
  }

  function handleStageChange(id: string, stage: HiringStage) {
    setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, stage } : c));
  }

  function handleDelete(id: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  const byStage = (stage: HiringStage) => candidates.filter((c) => c.stage === stage);
  const totalActive = candidates.filter((c) => c.stage !== 'rejected').length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {showAdd && <AddCandidateModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      {/* Header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', borderBottom: '1px solid var(--hairline-strong)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          ← Back
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--hairline-strong)' }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Hiring Pipeline</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 10 }}>{totalActive} active candidate{totalActive !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'var(--coral)', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          + Add candidate
        </button>
      </div>

      {/* Stage summary bar */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--hairline-strong)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        {HIRING_STAGES.map((s) => {
          const count = byStage(s.id).length;
          return (
            <div key={s.id} style={{
              flex: 1, padding: '8px 16px', textAlign: 'center',
              borderRight: '1px solid var(--hairline)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? s.color : 'var(--text-3)' }}>{count}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Loading pipeline…
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', gap: 0, overflow: 'hidden',
        }}>
          {HIRING_STAGES.map((s) => {
            const cols = byStage(s.id);
            return (
              <div key={s.id} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                borderRight: '1px solid var(--hairline)',
                overflow: 'hidden',
              }}>
                {/* Column header */}
                <div style={{
                  padding: '12px 14px 8px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: `2px solid ${s.color}`,
                  flexShrink: 0,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{s.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: cols.length > 0 ? '#fff' : 'var(--text-3)',
                    background: cols.length > 0 ? s.color : 'var(--surface-sunken)',
                    padding: '1px 7px', borderRadius: 20,
                  }}>{cols.length}</span>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cols.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 24 }}>
                      No candidates
                    </div>
                  ) : (
                    cols.map((c) => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        interviews={interviewsFor(c.id)}
                        onStageChange={handleStageChange}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-sunken)', border: '1px solid var(--hairline)',
  borderRadius: 8, padding: '8px 11px', fontSize: 13,
  color: 'var(--text)', width: '100%',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'transparent',
  fontSize: 13, cursor: 'pointer', color: 'var(--text-2)',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'var(--coral)', color: '#fff',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
