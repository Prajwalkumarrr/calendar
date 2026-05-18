'use client';

// Two-pane editor for creating a scheduling link.
// Faithful port of prototype/scheduling-create.html, wired to /api/scheduling-links.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './sc.css';

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type DayHours = { enabled: boolean; start: string; end: string };

const DAY_LABELS: { d: Day; label: string }[] = [
  { d: 1, label: 'Mon' },
  { d: 2, label: 'Tue' },
  { d: 3, label: 'Wed' },
  { d: 4, label: 'Thu' },
  { d: 5, label: 'Fri' },
  { d: 6, label: 'Sat' },
  { d: 0, label: 'Sun' },
];

const DURATIONS = [15, 30, 45, 60, 90];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function SchedulingCreateForm({ userName, userInitial }: { userName: string; userInitial: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('30-min intro chat');
  const [slug, setSlug] = useState('30min');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(
    "Happy to chat about anything on your mind. I'll come prepared.",
  );
  const [duration, setDuration] = useState(30);
  const [bufferMin, setBufferMin] = useState(0);

  const [hours, setHours] = useState<Record<Day, DayHours>>({
    0: { enabled: false, start: '09:00', end: '17:00' },
    1: { enabled: true, start: '09:00', end: '17:00' },
    2: { enabled: true, start: '09:00', end: '17:00' },
    3: { enabled: true, start: '09:00', end: '17:00' },
    4: { enabled: true, start: '09:00', end: '17:00' },
    5: { enabled: true, start: '09:00', end: '17:00' },
    6: { enabled: false, start: '09:00', end: '17:00' },
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const onDayToggle = (d: Day) => {
    setHours((h) => ({ ...h, [d]: { ...h[d], enabled: !h[d].enabled } }));
  };
  const onDayTime = (d: Day, field: 'start' | 'end', v: string) => {
    setHours((h) => ({ ...h, [d]: { ...h[d], [field]: v } }));
  };

  async function save() {
    if (!title.trim()) { setError('Please give the link a name.'); return; }
    setSubmitting(true); setError(null);
    try {
      const workingHours: Record<string, { start: string; end: string }[]> = {};
      for (const d of [0, 1, 2, 3, 4, 5, 6] as Day[]) {
        const h = hours[d];
        workingHours[String(d)] = h.enabled ? [{ start: h.start, end: h.end }] : [];
      }
      const res = await fetch('/api/scheduling-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          durationMin: duration,
          description: description.trim(),
          workingHours,
          bufferMin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.push('/scheduling');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Live preview slots — mock based on duration + Mon hours, just for the visual
  const previewSlots = useMemo(() => {
    const monHours = hours[1];
    if (!monHours.enabled) return [];
    const [sh, sm] = monHours.start.split(':').map(Number);
    const [eh, em] = monHours.end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const out: string[] = [];
    for (let m = startMin; m + duration <= endMin; m += duration) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      const period = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      out.push(`${h12}:${String(mm).padStart(2, '0')} ${period}`);
      if (out.length >= 7) break;
    }
    return out;
  }, [hours, duration]);

  const publicUrl = `${typeof window !== 'undefined' ? window.location.host : 'elevaite.app'}/book/${slug || 'your-slug'}`;

  return (
    <div className="sc-shell">
      <header className="sc-topbar">
        <Link className="sc-back" href="/scheduling">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>
        <input
          className="sc-title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled link"
        />
        <span className="sc-status">
          <span className="sc-status__dot" /> Active
        </span>
        <div style={{ flex: 1 }} />
        <a
          className="sc-cta-ghost"
          href={`/book/${slug || 'your-slug'}`}
          target="_blank"
          rel="noreferrer"
        >
          Preview as invitee
        </a>
        <button className="sc-cta-primary" onClick={save} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save link'}
        </button>
      </header>

      <main className="sc-main">
        {/* LEFT — form */}
        <section className="sc-form">
          <div className="sc-form__inner">
            {/* Basics */}
            <div className="sc-section">
              <div className="sc-section__h">Basics</div>
              <div className="sc-section__card">
                <div className="sc-row">
                  <div className="sc-row__lbl">Name<small>Title invitees see.</small></div>
                  <input
                    className="sc-field"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="30-min intro chat"
                  />
                </div>
                <div className="sc-row">
                  <div className="sc-row__lbl">URL slug</div>
                  <div className="sc-slug-input">
                    <span>/book/</span>
                    <input
                      value={slug}
                      onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                      placeholder="30min"
                    />
                  </div>
                </div>
                <div className="sc-row">
                  <div className="sc-row__lbl">Description<small>Shown on the booking page.</small></div>
                  <textarea
                    className="sc-field"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Anything the invitee should know"
                  />
                </div>
              </div>
            </div>

            {/* When */}
            <div className="sc-section">
              <div className="sc-section__h">When</div>
              <div className="sc-section__card">
                <div className="sc-row">
                  <div className="sc-row__lbl">Duration</div>
                  <div className="sc-duration">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`sc-dur-btn ${duration === d ? 'on' : ''}`}
                        onClick={() => setDuration(d)}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sc-row">
                  <div className="sc-row__lbl">Working hours<small>When slots can appear.</small></div>
                  <div className="avail-grid">
                    {DAY_LABELS.map(({ d, label }) => {
                      const h = hours[d];
                      return (
                        <div key={d} style={{ display: 'contents' }}>
                          <span className={`avail-day ${!h.enabled ? 'off' : ''}`}>{label}</span>
                          {h.enabled ? (
                            <span className="avail-range">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                              <input type="time" value={h.start} onChange={(e) => onDayTime(d, 'start', e.target.value)} />
                              <span>–</span>
                              <input type="time" value={h.end} onChange={(e) => onDayTime(d, 'end', e.target.value)} />
                            </span>
                          ) : (
                            <span className="avail-range off">Off</span>
                          )}
                          <label className="switch">
                            <input type="checkbox" checked={h.enabled} onChange={() => onDayToggle(d)} />
                            <span className="switch__track" />
                            <span className="switch__thumb" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Buffers — minimal v1 */}
            <div className="sc-section">
              <div className="sc-section__h">Buffers &amp; limits</div>
              <div className="sc-section__card">
                <div className="sc-row">
                  <div className="sc-row__lbl">Buffer between events<small>Gap before next slot.</small></div>
                  <select
                    className="sc-field"
                    value={bufferMin}
                    onChange={(e) => setBufferMin(Number(e.target.value))}
                  >
                    <option value={0}>None</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <div className="sc-err">{error}</div>}
          </div>
        </section>

        {/* RIGHT — live preview */}
        <section className="sc-preview">
          <div className="sc-preview__lbl">
            <span className="sc-preview__lbl-dot" /> Live preview
          </div>

          <div className="sc-prev-card">
            <div className="sc-prev-host">
              <div className="sc-prev-host__avatar">{userInitial}</div>
              <div>
                <div className="sc-prev-host__name">Meeting with</div>
                <div className="sc-prev-host__who">{userName}</div>
              </div>
              <div className="sc-prev-host__title">{title || 'Untitled link'}</div>
              <div className="sc-prev-meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                {duration} min
              </div>
              <div className="sc-prev-meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>
                Google Meet
              </div>
              {description && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, margin: '6px 0 0' }}>
                  {description}
                </p>
              )}
            </div>

            <div className="sc-prev-pick">
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  This week
                </div>
                <div className="sc-prev-mini-month">
                  {Array.from({ length: 35 }, (_, i) => {
                    const cls =
                      i === 17 ? 'sel' :
                      [15, 16, 18, 19, 22, 23, 24].includes(i) ? 'avail' :
                      '';
                    return <span key={i} className={`sc-prev-mini-day ${cls}`} />;
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Mon</div>
                <div className="sc-prev-slots">
                  {previewSlots.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Enable Mon to see slots
                    </div>
                  ) : (
                    previewSlots.map((s, i) => (
                      <button
                        key={s}
                        type="button"
                        className={`sc-prev-slot ${i === 2 ? 'on' : ''}`}
                      >
                        {s}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="sc-prev-url">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-3)', flexShrink: 0 }}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>
            <span className="sc-prev-url__text">{publicUrl}</span>
            <button
              type="button"
              className="sc-prev-url__copy"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`)}
            >
              Copy
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
