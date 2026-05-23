'use client';

// Settings — faithful port of prototype/settings.html
// 7 tabs in URL hash: #profile · #accounts · #notifications · #appearance · #keyboard · #billing · #workspace

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import './settings.css';
import { useAppearance } from '@/lib/useAppearance';

type TabId = 'profile' | 'accounts' | 'notifications' | 'appearance' | 'keyboard' | 'billing' | 'workspace';

const TABS: { id: TabId; label: string; section: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'profile',       label: 'Profile',            section: 'Account',   icon: <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></Icon> },
  { id: 'accounts',      label: 'Calendar accounts',  section: 'Account',   icon: <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon> },
  { id: 'notifications', label: 'Notifications',      section: 'Account',   icon: <Icon><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" /></Icon>, badge: 2 },
  { id: 'appearance',    label: 'Appearance',         section: 'Customize', icon: <Icon><circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2a10 10 0 1 0 0 20 4 4 0 0 0 0-8 4 4 0 1 1 4-4 10 10 0 0 0-4-8z" /></Icon> },
  { id: 'keyboard',      label: 'Keyboard shortcuts', section: 'Customize', icon: <Icon><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M6 10v0M10 10v0M14 10v0M18 10v0M6 14v0M18 14v0M9 17h6" /></Icon> },
  { id: 'billing',       label: 'Account & billing',  section: 'Plan',      icon: <Icon><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 11h18" /></Icon> },
  { id: 'workspace',     label: 'Workspace',          section: 'Team',      icon: <Icon><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></Icon> },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ss-switch">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="ss-switch__track" />
      <span className="ss-switch__thumb" />
    </label>
  );
}

function Seg<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: ({ v: T; l: string } | string)[];
  onChange: (v: T) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 2, width: 0 });
  useEffect(() => {
    const wrapEl = wrap.current; if (!wrapEl) return;
    const active = wrapEl.querySelector(`button[data-v="${value}"]`) as HTMLElement | null;
    if (active) setPill({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, options]);

  const opts = options.map((o) => (typeof o === 'string' ? { v: o as T, l: o } : o));
  return (
    <div className="seg" ref={wrap}>
      <span className="seg__pill" style={pill} />
      {opts.map((o) => (
        <button
          key={o.v}
          data-v={o.v}
          className={value === o.v ? 'on' : ''}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({ title, sub, on, onChange }: { title: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="switch-row">
      <div className="switch-row__txt">
        <h4>{title}</h4>
        {sub && <p>{sub}</p>}
      </div>
      <Switch on={on} onChange={onChange} />
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <div className="form-row__lbl">
        {label}
        {sub && <small>{sub}</small>}
      </div>
      <div className="form-row__control">{children}</div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────

function Profile({ userName, userEmail }: { userName: string; userEmail: string }) {
  // Server profile (snapshot of what's in Mongo)
  const [serverProfile, setServerProfile] = useState<{
    displayName: string;
    bio: string;
    handle: string;
    timezone: string;
  } | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState(userName);
  const [bio, setBio] = useState('');
  const [handle, setHandle] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Load profile on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok || cancelled) { setLoading(false); return; }
        const data = await res.json();
        const p = data.profile;
        if (!cancelled) {
          const snap = {
            displayName: p.displayName ?? p.name ?? userName,
            bio: p.bio ?? '',
            handle: p.handle ?? '',
            timezone: p.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
          setServerProfile(snap);
          setDisplayName(snap.displayName);
          setBio(snap.bio);
          setHandle(snap.handle);
          setTimezone(snap.timezone);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userName]);

  const dirty =
    !!serverProfile &&
    (displayName !== serverProfile.displayName ||
      bio !== serverProfile.bio ||
      handle !== serverProfile.handle ||
      timezone !== serverProfile.timezone);

  function discard() {
    if (!serverProfile) return;
    setDisplayName(serverProfile.displayName);
    setBio(serverProfile.bio);
    setHandle(serverProfile.handle);
    setTimezone(serverProfile.timezone);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, bio, handle, timezone }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'handle_taken'
          ? `The handle “${handle}” is taken. Try another.`
          : data.error === 'invalid_handle'
            ? 'Handle must be 3–30 chars: lowercase letters, numbers, dashes.'
            : data.error === 'invalid_bio'
              ? 'Bio must be 280 characters or fewer.'
              : `Could not save (${data.error ?? `HTTP ${res.status}`})`;
        throw new Error(msg);
      }
      const p = data.profile;
      const snap = {
        displayName: p.displayName ?? p.name ?? userName,
        bio: p.bio ?? '',
        handle: p.handle ?? '',
        timezone: p.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      setServerProfile(snap);
      setDisplayName(snap.displayName);
      setBio(snap.bio);
      setHandle(snap.handle);
      setTimezone(snap.timezone);
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const userInitial = (userName?.[0] ?? userEmail?.[0] ?? 'U').toUpperCase();
  const previewUrl = handle ? `/book/${handle}/<your-slug>` : '/book/<your-slug>';

  return (
    <>
      <h1 className="ss-page-h">Profile</h1>
      <p className="ss-page-sub">
        How you appear inside ElevAIte and on your scheduling pages.{' '}
        {loading && <span style={{ color: 'var(--text-3)' }}>· Loading…</span>}
        {!loading && savedAt && Date.now() - savedAt < 5000 && (
          <span style={{ color: 'var(--coral)' }}>· Saved ✓</span>
        )}
      </p>

      <div className="ss-card">
        <Row label="Display name">
          <input
            className="field-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
        </Row>
        <Row label="Profile photo" sub="Pulled from your sign-in provider.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #9A7B98, #D97757)',
              color: '#fff', fontWeight: 600, fontSize: 22,
              display: 'grid', placeItems: 'center',
            }}>
              {userInitial}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Sync from Google · upload coming soon
            </span>
          </div>
        </Row>
        <Row label="Email" sub="Your sign-in email and where notifications go.">
          <input className="field-input" value={userEmail} disabled />
        </Row>
        <Row label="Bio" sub="Shown on your public booking page. 280 chars max.">
          <textarea
            className="field-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What people should know before booking you…"
            maxLength={280}
            disabled={loading}
            style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'flex-end' }}>
            {bio.length}/280
          </span>
        </Row>
        <Row label="Booking-page handle" sub={`Your URL preview: ${previewUrl}`}>
          <div style={{ display: 'flex' }}>
            <span style={{
              padding: '10px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRight: 0,
              borderRadius: '8px 0 0 8px',
              fontFamily: '"Geist Mono", monospace',
              fontSize: 13, color: 'var(--text-3)',
              display: 'flex', alignItems: 'center',
              whiteSpace: 'nowrap',
            }}>
              /book/
            </span>
            <input
              className="field-input"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="your-handle"
              disabled={loading}
              style={{ borderRadius: '0 8px 8px 0', fontFamily: '"Geist Mono", monospace' }}
            />
          </div>
        </Row>
        <Row label="Time zone" sub="Used to render booking slots in your local time on the host side.">
          <select
            className="field-input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={loading}
          >
            {[
              timezone, // keep user's current TZ if it's not in the list
              'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
              'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
              'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Dubai',
              'Australia/Sydney', 'UTC',
            ]
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
          </select>
        </Row>
      </div>

      {error && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--coral-subtle)',
          color: 'var(--coral-strong, var(--coral))',
          borderRadius: 8,
          fontSize: 12.5,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="cta-ghost" onClick={discard} disabled={!dirty || saving}>
          Discard
        </button>
        <button className="cta-primary" onClick={save} disabled={!dirty || saving || loading}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--hairline)' }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Session</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 14 }}>
          Signed in as <strong style={{ color: 'var(--text-2)' }}>{userEmail}</strong>
        </p>
        <button
          className="cta-ghost"
          style={{ color: 'var(--coral)', borderColor: 'var(--coral)', opacity: 0.85 }}
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </button>
      </div>
    </>
  );
}

function Accounts({ userEmail }: { userEmail: string }) {
  return (
    <>
      <h1 className="ss-page-h">Calendar accounts</h1>
      <p className="ss-page-sub">Manage the calendars ElevAIte syncs with. We never store event data on our servers.</p>

      <div className="acct">
        <div className="acct__provider">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="acct__email">{userEmail}</div>
          <div className="acct__type">Google Calendar · primary account · last synced just now</div>
        </div>
        <span className="acct__pill">Connected</span>
        <button className="acct__btn">Manage</button>
      </div>

      <div className="acct">
        <div className="acct__provider" style={{ background: '#000' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.05 12.04c0-2.94 2.42-4.36 2.53-4.42-1.38-2.02-3.53-2.3-4.3-2.33-1.83-.19-3.57 1.08-4.5 1.08-.92 0-2.35-1.05-3.86-1.02-1.99.03-3.82 1.15-4.84 2.93-2.07 3.58-.53 8.87 1.49 11.78 1 1.43 2.18 3.02 3.72 2.97 1.5-.06 2.06-.96 3.86-.96s2.31.96 3.88.93c1.6-.03 2.61-1.44 3.6-2.88 1.13-1.66 1.6-3.27 1.63-3.36-.04-.01-3.13-1.2-3.16-4.76zM14.83 4.42c.83-1 1.39-2.4 1.24-3.79-1.2.05-2.65.8-3.5 1.8-.77.88-1.44 2.31-1.26 3.67 1.33.1 2.69-.68 3.52-1.68z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="acct__email">Apple iCloud</div>
          <div className="acct__type">Not connected · coming soon</div>
        </div>
        <button className="acct__btn" disabled>Connect</button>
      </div>

      <div className="acct">
        <div className="acct__provider" style={{ background: '#0078d4' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
            <path d="M2 4h10v6H2zm0 7h10v6H2zm11-7h9v6h-9zm0 7h9v6h-9z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="acct__email">Microsoft Outlook</div>
          <div className="acct__type">Not connected · coming soon</div>
        </div>
        <button className="acct__btn" disabled>Connect</button>
      </div>

      <div className="danger-zone">
        <h3>Sync settings</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.5 }}>
          How aggressively ElevAIte fetches from your providers.
        </p>
        <Seg
          value="real-time"
          options={[{ v: 'real-time', l: 'Real-time' }, { v: 'minute', l: 'Every minute' }, { v: '5min', l: 'Every 5 min' }]}
          onChange={() => {}}
        />
      </div>
    </>
  );
}

type Prefs = {
  desktop: boolean; email: boolean; mobile: boolean; sms: boolean;
  reminders: boolean; reminderLeadMin: number; digest: boolean;
  invites: boolean; rsvp: boolean; cancel: boolean; reschedule: boolean; bookings: boolean;
  slack: boolean; linear: boolean;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function FocusDays() {
  const [days, setDays] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/me/no-meeting')
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? []))
      .catch(() => setDays([]));
  }, []);

  async function toggle(day: number) {
    if (!days) return;
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setDays(next);
    setSaving(true);
    try {
      const res = await fetch('/api/me/no-meeting', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ days: next }),
      });
      const data = await res.json();
      if (res.ok) { setDays(data.days); setSavedAt(Date.now()); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ss-card">
      <div className="ss-card__h">Focus Days (No-Meeting Days)</div>
      <p className="ss-card__sub" style={{ color: 'var(--text-3)', fontSize: 12 }}>
        Pick days that are off-limits for meetings. The calendar will highlight them and warn you on
        those days. External booking pages will hide slots entirely.{' '}
        {saving && <span style={{ color: 'var(--text-3)' }}>Saving…</span>}
        {!saving && savedAt && Date.now() - savedAt < 3000 && <span style={{ color: 'var(--coral)' }}>Saved ✓</span>}
      </p>
      {days === null ? (
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {DAY_LABELS.map((label, i) => {
            const on = days.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  fontWeight: on ? 600 : 400,
                  border: `1px solid ${on ? 'var(--coral)' : 'var(--border)'}`,
                  background: on ? 'var(--coral-subtle, rgba(217,119,87,0.12))' : 'transparent',
                  color: on ? 'var(--coral)' : 'var(--text-2)',
                  transition: 'all 120ms ease',
                }}
              >
                {label}
                {on && <span style={{ marginLeft: 5, fontSize: 11 }}>🚫</span>}
              </button>
            );
          })}
        </div>
      )}
      {days && days.length > 0 && (
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
          No meetings on: {days.sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(', ')}
        </p>
      )}
    </div>
  );
}

function Notifications() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/me/notifications')
      .then((r) => r.json())
      .then((d) => setPrefs(d.prefs))
      .catch(() => setError('Could not load preferences'));
  }, []);

  async function save<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    if (!prefs) return;
    setSavingKey(k);
    setError(null);
    // Optimistic update
    const prev = prefs[k];
    setPrefs({ ...prefs, [k]: v });
    try {
      const res = await fetch('/api/me/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [k]: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setPrefs(data.prefs);
      setSavedAt(Date.now());
    } catch (e) {
      // Rollback on failure
      setPrefs({ ...prefs, [k]: prev });
      setError(`Could not update — ${(e as Error).message}`);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <>
      <h1 className="ss-page-h">Notifications</h1>
      <p className="ss-page-sub">
        Choose how and when we ping you.{' '}
        {savedAt && Date.now() - savedAt < 3000 && (
          <span style={{ color: 'var(--coral)' }}>Saved ✓</span>
        )}
        {savingKey && <span style={{ color: 'var(--text-3)' }}>· Saving…</span>}
        {!prefs && !error && <span style={{ color: 'var(--text-3)' }}>Loading…</span>}
      </p>

      {/* Focus Days renders independently — always visible */}
      <FocusDays />

      {!prefs ? null : (<>

      {error && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--coral-subtle)',
          color: 'var(--coral-strong, var(--coral))',
          borderRadius: 8, fontSize: 12.5, marginBottom: 16,
        }}>{error}</div>
      )}

      <div className="ss-card">
        <div className="ss-card__h">Where to reach you</div>
        <p className="ss-card__sub" style={{ color: 'var(--text-3)', fontSize: 12 }}>
          Inbox notifications are always on. The other channels are wired but not yet sending —
          you can pre-configure them now.
        </p>
        <SwitchRow title="Desktop notifications" sub="Native macOS / Windows alerts for upcoming events." on={prefs.desktop} onChange={(v) => save('desktop', v)} />
        <SwitchRow title="Email digest" sub="Email when someone books, RSVPs, or reschedules." on={prefs.email} onChange={(v) => save('email', v)} />
        <SwitchRow title="Mobile push" sub="iOS app — Android coming soon." on={prefs.mobile} onChange={(v) => save('mobile', v)} />
        <SwitchRow title="SMS (Team plan only)" sub="For meeting reminders on the go." on={prefs.sms} onChange={(v) => save('sms', v)} />
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Event reminders</div>
        <Row label="Reminder lead time" sub="How long before an event we nudge you.">
          <Seg
            value={String(prefs.reminderLeadMin) as '1' | '5' | '10' | '15' | '30'}
            options={[{ v: '1', l: '1 min' }, { v: '5', l: '5 min' }, { v: '10', l: '10 min' }, { v: '15', l: '15 min' }, { v: '30', l: '30 min' }]}
            onChange={(v) => save('reminderLeadMin', Number(v))}
          />
        </Row>
        <SwitchRow title="Reminders for accepted events" on={prefs.reminders} onChange={(v) => save('reminders', v)} />
        <SwitchRow title="Daily morning digest" sub="Sent at 8:00 AM in your time zone." on={prefs.digest} onChange={(v) => save('digest', v)} />
      </div>

      <div className="ss-card">
        <div className="ss-card__h">When others do things</div>
        <p className="ss-card__sub" style={{ color: 'var(--text-3)', fontSize: 12 }}>
          These control which notifications land in your <a href="/inbox" style={{ color: 'var(--coral)' }}>inbox</a>.
        </p>
        <SwitchRow title="Bookings on scheduling links" sub="When someone books one of your /book links." on={prefs.bookings} onChange={(v) => save('bookings', v)} />
        <SwitchRow title="New event invitations" sub="When someone invites you to an event." on={prefs.invites} onChange={(v) => save('invites', v)} />
        <SwitchRow title="RSVPs to your events" on={prefs.rsvp} onChange={(v) => save('rsvp', v)} />
        <SwitchRow title="Event cancellations" on={prefs.cancel} onChange={(v) => save('cancel', v)} />
        <SwitchRow title="Event reschedules" on={prefs.reschedule} onChange={(v) => save('reschedule', v)} />
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Integrations</div>
        <p className="ss-card__sub" style={{ color: 'var(--text-3)', fontSize: 12 }}>
          Coming in Phase 10. Pre-toggle now.
        </p>
        <SwitchRow title="Slack — post in #standup before your standup" on={prefs.slack} onChange={(v) => save('slack', v)} />
        <SwitchRow title="Linear — link issues mentioned in events" on={prefs.linear} onChange={(v) => save('linear', v)} />
      </div>

      </>)}
    </>
  );
}

function Appearance() {
  const [prefs, setPref, saving] = useAppearance();
  return (
    <>
      <h1 className="ss-page-h">Appearance</h1>
      <p className="ss-page-sub">
        Make ElevAIte look how you want.{' '}
        {saving && <span style={{ color: 'var(--text-3)' }}>· Saving…</span>}
      </p>

      <div className="ss-card">
        <Row label="Theme">
          <div className="theme-cards">
            {([
              { k: 'light' as const, l: 'Light', bg: '#FAF9F5', sk: '#F5F4ED' },
              { k: 'dark' as const, l: 'Dark', bg: '#1A1916', sk: '#232220' },
              { k: 'system' as const, l: 'System', bg: 'linear-gradient(135deg, #FAF9F5 50%, #1A1916 50%)', sk: '#888' },
            ]).map((o) => (
              <button
                key={o.k}
                type="button"
                className={`theme-card ${prefs.theme === o.k ? 'on' : ''}`}
                onClick={() => setPref('theme', o.k)}
              >
                <div className="theme-card__prev" style={{ background: o.bg }}>
                  <div style={{ width: '60%', background: o.sk }} />
                  <div style={{ width: '40%', background: o.sk }} />
                  <div style={{ height: 18, marginTop: 'auto', background: prefs.accent, borderRadius: 3, opacity: 0.7 }} />
                </div>
                <div className="theme-card__lbl">{o.l}</div>
              </button>
            ))}
          </div>
        </Row>

        <Row label="Accent color" sub="Coral by default. Pick a different mood.">
          <div style={{ display: 'flex', gap: 8 }}>
            {['#D97757', '#E37A6B', '#C28699', '#88A188', '#7A8DA8'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPref('accent', c)}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: c, border: 0, cursor: 'pointer',
                  boxShadow: prefs.accent === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none',
                  transition: 'box-shadow 140ms var(--ease)',
                }}
              />
            ))}
          </div>
        </Row>

        <Row label="Density" sub="Affects how tall hour rows are in the calendar.">
          <Seg value={prefs.density} options={['compact', 'regular', 'comfy'] as const} onChange={(v) => setPref('density', v)} />
        </Row>

        <Row label="Event chip style" sub="How events render on the calendar grid.">
          <Seg value={prefs.chipStyle} options={['fill', 'tinted', 'outline'] as const} onChange={(v) => setPref('chipStyle', v)} />
        </Row>
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Calendar defaults</div>
        <Row label="Week starts on">
          <Seg
            value={prefs.weekStart}
            options={[{ v: 'mon' as const, l: 'Monday' }, { v: 'sun' as const, l: 'Sunday' }, { v: 'sat' as const, l: 'Saturday' }]}
            onChange={(v) => setPref('weekStart', v)}
          />
        </Row>
        <Row label="Time format">
          <Seg
            value={prefs.timeFormat}
            options={[{ v: '12' as const, l: '12-hour' }, { v: '24' as const, l: '24-hour' }]}
            onChange={(v) => setPref('timeFormat', v)}
          />
        </Row>
      </div>
    </>
  );
}

const SHORTCUTS: { group: string; list: { l: string; k: string[] }[] }[] = [
  { group: 'Navigation', list: [
    { l: 'Go to today', k: ['T'] },
    { l: 'Next week / day', k: ['→'] },
    { l: 'Previous week / day', k: ['←'] },
    { l: 'Jump to date', k: ['G'] },
    { l: 'Switch to day view', k: ['D'] },
    { l: 'Switch to week view', k: ['W'] },
    { l: 'Switch to month view', k: ['M'] },
  ]},
  { group: 'Events', list: [
    { l: 'Create new event', k: ['C'] },
    { l: 'Delete selected event', k: ['⌫'] },
    { l: 'Duplicate event', k: ['⌘', 'D'] },
    { l: 'Edit selected event', k: ['E'] },
    { l: 'Toggle all-day', k: ['A'] },
  ]},
  { group: 'Search & commands', list: [
    { l: 'Command palette', k: ['⌘', 'K'] },
    { l: 'Search events', k: ['⌘', 'F'] },
    { l: 'Find a time', k: ['F'] },
  ]},
  { group: 'Scheduling', list: [
    { l: 'New scheduling link', k: ['⌘', 'L'] },
    { l: 'Open scheduling page', k: ['S'] },
  ]},
  { group: 'App', list: [
    { l: 'Toggle dark mode', k: ['⌘', '⇧', 'D'] },
    { l: 'Open settings', k: ['⌘', ','] },
    { l: 'Toggle sidebar', k: ['⌘', '\\'] },
    { l: 'Sign out', k: ['⌘', '⇧', 'Q'] },
  ]},
];

function Keyboard() {
  const [q, setQ] = useState('');
  const groups = SHORTCUTS.map((g) => ({
    ...g,
    list: g.list.filter((s) => s.l.toLowerCase().includes(q.toLowerCase())),
  })).filter((g) => g.list.length);

  return (
    <>
      <h1 className="ss-page-h">Keyboard shortcuts</h1>
      <p className="ss-page-sub">
        30+ shortcuts. <span style={{ color: 'var(--text)' }}>⌘K</span> is the one you&apos;ll learn first.
      </p>

      <div className="ss-card">
        <div className="kbd-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="kbd-search"
            placeholder="Search shortcuts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {groups.map((g) => (
          <div className="kbd-group" key={g.group}>
            <div className="kbd-group__h">{g.group}</div>
            {g.list.map((s, i) => (
              <div className="kbd-row" key={i}>
                <div className="kbd-row__lbl">{s.l}</div>
                <div className="kbd-row__keys">
                  {s.k.map((k, j) => <span className="kbd" key={j}>{k}</span>)}
                </div>
              </div>
            ))}
          </div>
        ))}
        {groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
            No shortcut matches &quot;{q}&quot;.
          </div>
        )}
      </div>

      <div className="ss-card">
        <SwitchRow title="Show shortcut hints on hover" sub="Tooltips reveal the shortcut when you mouse over a button." on={true} onChange={() => {}} />
        <SwitchRow title="Vim-style navigation (j/k)" sub="Move event selection up/down with j and k." on={false} onChange={() => {}} />
      </div>
    </>
  );
}

function Billing({ userEmail }: { userEmail: string }) {
  return (
    <>
      <h1 className="ss-page-h">Account &amp; billing</h1>
      <p className="ss-page-sub">Your plan, payment, and invoices.</p>

      <div className="plan-card">
        <span className="plan-card__tag">Free</span>
        <div className="plan-card__h">Personal plan</div>
        <p className="plan-card__sub">All core features — calendar, scheduling links, integrations.</p>
        <div className="plan-card__seats">$0 / forever for individuals · upgrade for team features</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="cta-ghost" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.18)' }}>
            Upgrade to Team
          </button>
          <button className="cta-ghost" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,244,237,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
            Verify .edu for student plan
          </button>
        </div>
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Payment method</div>
        <p className="ss-card__sub">No payment on file. Used for upgrades or Team add-ons.</p>
        <button className="cta-ghost">+ Add payment method</button>
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Billing history</div>
        <p className="ss-card__sub">All invoices, paid and pending.</p>
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 12.5 }}>
          No invoices yet — you&apos;re on the free plan.
        </div>
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Billing details</div>
        <Row label="Billing email">
          <input className="field-input" defaultValue={userEmail} />
        </Row>
        <Row label="VAT / tax ID">
          <input className="field-input" placeholder="Optional, for invoices" />
        </Row>
      </div>

      <div className="danger-zone">
        <h3>Danger zone</h3>
        <button className="danger-btn">Export all data</button>
        <button className="danger-btn">Delete account</button>
      </div>
    </>
  );
}

// ─── Team Timezones (Golden Hours) ──────────────────────────────────

type TzMember = { id: string; name: string; tz: string; workStart: number; workEnd: number; fromWorkspaceUserId?: string };
type TzGroup  = { id: string; name: string; color: string; members: TzMember[] };

const TZ_GROUP_COLORS = ['#748AA6','#997594','#C49746','#7E9C7A','#A08060','#6A8CAA','#C47A6B'];
const COMMON_TZ = [
  'America/Los_Angeles','America/Denver','America/Chicago','America/New_York',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid',
  'Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Asia/Dubai',
  'Australia/Sydney','UTC',
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function TeamTimezones({ workspaceMembers }: { workspaceMembers: { userId: string; name?: string; email?: string }[] }) {
  const [groups, setGroups] = useState<TzGroup[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // new group form
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  // add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memName, setMemName] = useState('');
  const [memTz, setMemTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [memStart, setMemStart] = useState(9);
  const [memEnd, setMemEnd] = useState(18);

  useEffect(() => {
    fetch('/api/me/team-timezones')
      .then((r) => r.json())
      .then((d) => {
        const g: TzGroup[] = d.groups ?? [];
        setGroups(g);
        if (g.length > 0) setActiveId(g[0].id);
      })
      .catch(() => setGroups([]));
  }, []);

  async function persist(next: TzGroup[]) {
    setSaving(true);
    try {
      const res = await fetch('/api/me/team-timezones', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groups: next }),
      });
      if (res.ok) { setGroups(next); setSavedAt(Date.now()); }
    } finally { setSaving(false); }
  }

  function createGroup() {
    if (!newGroupName.trim() || !groups) return;
    const g: TzGroup = {
      id: uid(), name: newGroupName.trim(),
      color: TZ_GROUP_COLORS[groups.length % TZ_GROUP_COLORS.length],
      members: [],
    };
    const next = [...groups, g];
    setNewGroupName(''); setShowNewGroup(false);
    setActiveId(g.id);
    persist(next);
  }

  function deleteGroup(id: string) {
    if (!groups) return;
    if (!confirm('Delete this group?')) return;
    const next = groups.filter((g) => g.id !== id);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    persist(next);
  }

  function addMember() {
    if (!groups || !activeId || !memName.trim()) return;
    const member: TzMember = { id: uid(), name: memName.trim(), tz: memTz, workStart: memStart, workEnd: memEnd };
    const next = groups.map((g) => g.id === activeId ? { ...g, members: [...g.members, member] } : g);
    setMemName(''); setShowAddMember(false);
    persist(next);
  }

  function importFromWorkspace(ws: { userId: string; name?: string; email?: string }) {
    if (!groups || !activeId) return;
    const alreadyIn = groups.find((g) => g.id === activeId)?.members.some((m) => m.fromWorkspaceUserId === ws.userId);
    if (alreadyIn) return;
    const member: TzMember = {
      id: uid(),
      name: ws.name ?? ws.email ?? ws.userId,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      workStart: 9, workEnd: 18,
      fromWorkspaceUserId: ws.userId,
    };
    const next = groups.map((g) => g.id === activeId ? { ...g, members: [...g.members, member] } : g);
    persist(next);
  }

  function removeMemberFromGroup(groupId: string, memberId: string) {
    if (!groups) return;
    const next = groups.map((g) => g.id === groupId ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g);
    persist(next);
  }

  const activeGroup = groups?.find((g) => g.id === activeId) ?? null;

  return (
    <div className="ss-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <div className="ss-card__h" style={{ marginBottom: 0 }}>Team Timezone Groups</div>
          <p className="ss-card__sub" style={{ marginBottom: 0 }}>
            Named groups of people — the calendar highlights when everyone overlaps.{' '}
            {saving && <span style={{ color: 'var(--text-3)' }}>Saving…</span>}
            {!saving && savedAt && Date.now() - savedAt < 3000 && <span style={{ color: 'var(--coral)' }}>Saved ✓</span>}
          </p>
        </div>
      </div>

      {groups === null ? (
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>Loading…</div>
      ) : (
        <>
          {/* Group pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveId(g.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
                  fontWeight: activeId === g.id ? 600 : 400,
                  border: `1.5px solid ${activeId === g.id ? g.color : 'var(--border)'}`,
                  background: activeId === g.id ? g.color : 'transparent',
                  color: activeId === g.id ? '#fff' : 'var(--text-2)',
                  transition: 'all 120ms ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {g.name}
                <span
                  onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}
                  style={{ opacity: 0.65, fontSize: 11, lineHeight: 1, cursor: 'pointer' }}
                >✕</span>
              </button>
            ))}
            {showNewGroup ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') setShowNewGroup(false); }}
                  placeholder="Group name"
                  style={{ background: 'var(--surface-sunken)', border: '1px solid var(--hairline)', borderRadius: 7, padding: '4px 10px', fontSize: 12.5, color: 'var(--text)', width: 130 }}
                />
                <button className="cta-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={createGroup}>Add</button>
                <button className="cta-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowNewGroup(false)}>Cancel</button>
              </div>
            ) : (
              <button className="cta-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setShowNewGroup(true)}>+ New group</button>
            )}
          </div>

          {/* Active group members */}
          {activeGroup && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                Members of &ldquo;{activeGroup.name}&rdquo;
              </div>

              {activeGroup.members.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}>No members yet — add one below.</div>
              )}

              {activeGroup.members.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--hairline)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: activeGroup.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {m.name.trim()[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.tz} · {m.workStart}:00–{m.workEnd}:00</div>
                  </div>
                  <button onClick={() => removeMemberFromGroup(activeGroup.id, m.id)} style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}

              {/* Add member */}
              {showAddMember ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input
                      autoFocus
                      placeholder="Name *"
                      value={memName}
                      onChange={(e) => setMemName(e.target.value)}
                      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--hairline)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, color: 'var(--text)', flex: '1 1 120px', minWidth: 100 }}
                    />
                    <select
                      value={memTz}
                      onChange={(e) => setMemTz(e.target.value)}
                      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--hairline)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, color: 'var(--text)', flex: '1 1 180px' }}
                    >
                      {[memTz, ...COMMON_TZ].filter((v, i, a) => a.indexOf(v) === i).map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-3)' }}>Works</span>
                    <input type="number" min={0} max={23} value={memStart} onChange={(e) => setMemStart(Number(e.target.value))}
                      style={{ width: 48, background: 'var(--surface-sunken)', border: '1px solid var(--hairline)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--text)', textAlign: 'center' }} />
                    <span style={{ color: 'var(--text-3)' }}>to</span>
                    <input type="number" min={0} max={24} value={memEnd} onChange={(e) => setMemEnd(Number(e.target.value))}
                      style={{ width: 48, background: 'var(--surface-sunken)', border: '1px solid var(--hairline)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--text)', textAlign: 'center' }} />
                    <span style={{ color: 'var(--text-3)' }}>(hour)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="cta-primary" style={{ padding: '5px 14px', fontSize: 12 }} onClick={addMember} disabled={!memName.trim()}>Add</button>
                    <button className="cta-ghost" style={{ padding: '5px 14px', fontSize: 12 }} onClick={() => setShowAddMember(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="cta-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowAddMember(true)}>+ Add member</button>
                  {workspaceMembers.length > 0 && (
                    <div style={{ position: 'relative' }}>
                      <details style={{ listStyle: 'none' }}>
                        <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '5px 12px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-2)', background: 'transparent' }}>
                          Import from workspace ▾
                        </summary>
                        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--bg)', border: '1px solid var(--hairline-strong)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 200, padding: '4px 0', marginTop: 4 }}>
                          {workspaceMembers.map((wm) => (
                            <button
                              key={wm.userId}
                              type="button"
                              onClick={() => importFromWorkspace(wm)}
                              style={{ display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left', fontSize: 12.5, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              {wm.name ?? wm.email ?? wm.userId}
                              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>{wm.email}</span>
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {groups.length === 0 && !showNewGroup && (
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 10 }}>
              Create a group to start tracking timezone overlaps.
            </p>
          )}
        </>
      )}
    </div>
  );
}

type WorkspaceDTO = { id: string; name: string; slug: string; ownerId: string; role: 'owner' | 'admin' | 'member' | 'guest'; memberCount: number };
type MemberDTO = { userId: string; name?: string; email?: string; image?: string; role: 'owner' | 'admin' | 'member' | 'guest'; joinedAt: string };
type InvitationDTO = { id: string; email: string; role: 'admin' | 'member' | 'guest'; token: string; createdAt: string; expiresAt: string };
type AuditEntry = {
  id: string;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  action: 'workspace.created' | 'invitation.sent' | 'invitation.revoked' | 'member.joined' | 'member.removed' | 'member.role_changed';
  targetUserId?: string;
  targetEmail?: string;
  targetName?: string;
  details?: { role?: string; fromRole?: string; toRole?: string; name?: string };
  createdAt: string;
};

function Workspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[] | null>(null);
  const [activeWs, setActiveWs] = useState<WorkspaceDTO | null>(null);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [invitations, setInvitations] = useState<InvitationDTO[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces
  async function loadWorkspaces() {
    const res = await fetch('/api/workspaces');
    if (!res.ok) return;
    const data = await res.json();
    const list: WorkspaceDTO[] = data.workspaces ?? [];
    setWorkspaces(list);
    if (list.length > 0 && (!activeWs || !list.find((w) => w.id === activeWs.id))) {
      setActiveWs(list[0]);
    }
    if (list.length === 0) setActiveWs(null);
  }
  useEffect(() => { loadWorkspaces(); /* eslint-disable-next-line */ }, []);

  // Load members + invitations + audit log for the active workspace
  async function loadDetails(wsId: string) {
    setMembersLoaded(false);
    const [mRes, iRes, aRes] = await Promise.all([
      fetch(`/api/workspaces/${wsId}/members`),
      fetch(`/api/workspaces/${wsId}/invitations`),
      fetch(`/api/workspaces/${wsId}/audit`),
    ]);
    if (mRes.ok) {
      const d = await mRes.json();
      setMembers(d.members ?? []);
    }
    setMembersLoaded(true);
    if (iRes.ok) {
      const d = await iRes.json();
      setInvitations(d.invitations ?? []);
    }
    if (aRes.ok) {
      const d = await aRes.json();
      setAudit(d.entries ?? []);
    }
  }
  useEffect(() => { if (activeWs) loadDetails(activeWs.id); }, [activeWs]);

  async function createWs(name: string) {
    setError(null);
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { setError('Could not create workspace.'); return; }
    setCreating(false);
    await loadWorkspaces();
  }

  async function changeRole(userId: string, role: MemberDTO['role']) {
    if (!activeWs) return;
    await fetch(`/api/workspaces/${activeWs.id}/members`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    loadDetails(activeWs.id);
  }

  async function removeMemberAction(userId: string) {
    if (!activeWs) return;
    if (!confirm('Remove this member?')) return;
    await fetch(`/api/workspaces/${activeWs.id}/members?userId=${userId}`, { method: 'DELETE' });
    loadDetails(activeWs.id);
  }

  async function inviteMember(email: string, role: InvitationDTO['role']) {
    if (!activeWs) return;
    setError(null);
    const res = await fetch(`/api/workspaces/${activeWs.id}/invitations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error === 'invalid_email' ? 'Enter a valid email.' : 'Could not invite.');
      return;
    }
    setShowInvite(false);
    loadDetails(activeWs.id);
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
  }

  async function revokeInvite(invId: string) {
    if (!activeWs) return;
    if (!confirm('Revoke this invitation? The link will stop working.')) return;
    await fetch(`/api/workspaces/${activeWs.id}/invitations/${invId}`, { method: 'DELETE' });
    loadDetails(activeWs.id);
  }

  if (workspaces === null) {
    return (
      <>
        <h1 className="ss-page-h">Workspace</h1>
        <p className="ss-page-sub">Loading…</p>
      </>
    );
  }

  if (workspaces.length === 0) {
    return (
      <>
        <h1 className="ss-page-h">Workspace</h1>
        <p className="ss-page-sub">Create a workspace to invite teammates.</p>
        <div className="ss-card">
          <div className="ss-card__h">Create a workspace</div>
          <p className="ss-card__sub">Name it after your company, your class, or your group.</p>
          {creating ? (
            <CreateWorkspaceForm onCreate={createWs} onCancel={() => setCreating(false)} />
          ) : (
            <button className="cta-primary" onClick={() => setCreating(true)}>+ Create workspace</button>
          )}
          {error && <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--coral-subtle)', color: 'var(--coral-strong, var(--coral))', borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
        </div>
      </>
    );
  }

  const canManage = activeWs && (activeWs.role === 'owner' || activeWs.role === 'admin');

  return (
    <>
      <h1 className="ss-page-h">Workspace · {activeWs?.name}</h1>
      <p className="ss-page-sub">
        Manage your team.{' '}
        <span className="acct__pill" style={{ marginLeft: 6 }}>
          {activeWs?.memberCount} {activeWs?.memberCount === 1 ? 'member' : 'members'}
        </span>
        <span className="acct__pill" style={{ marginLeft: 6, background: 'var(--coral-subtle)', color: 'var(--coral-strong, var(--coral))' }}>
          Your role: {activeWs?.role}
        </span>
      </p>

      {workspaces.length > 1 && (
        <div className="ss-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Switch workspace:</span>
          <select
            className="field-input"
            value={activeWs?.id ?? ''}
            onChange={(e) => {
              const w = workspaces.find((x) => x.id === e.target.value);
              if (w) setActiveWs(w);
            }}
            style={{ width: 'auto', minWidth: 240 }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button className="cta-ghost" onClick={() => setCreating(true)}>+ New</button>
        </div>
      )}

      {creating && (
        <div className="ss-card">
          <div className="ss-card__h">Create a workspace</div>
          <CreateWorkspaceForm onCreate={createWs} onCancel={() => setCreating(false)} />
        </div>
      )}

      <div className="ss-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="ss-card__h">Members</div>
            <p className="ss-card__sub" style={{ marginBottom: 0 }}>
              Members with admin or owner role can manage settings and invite others.
            </p>
          </div>
          <div style={{ flex: 1 }} />
          {canManage && (
            <button className="cta-primary" onClick={() => setShowInvite(true)}>+ Invite member</button>
          )}
        </div>

        {!membersLoaded ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>
            No members yet.
          </div>
        ) : (
          members.map((m) => (
            <div className="member" key={m.userId}>
              <div className="member__avatar" style={{ background: 'linear-gradient(135deg, #9A7B98, #D97757)' }}>
                {(m.name ?? m.email ?? '?').trim()[0]?.toUpperCase()}
              </div>
              <div>
                <div className="member__name">
                  {m.name ?? m.email ?? 'Member'}
                  {m.role === 'owner' && (
                    <span className="acct__pill" style={{ marginLeft: 6, background: 'var(--coral-subtle)', color: 'var(--coral-strong, var(--coral))' }}>
                      Owner
                    </span>
                  )}
                </div>
                <div className="member__email">{m.email}</div>
              </div>
              <select
                className="member__role-pick"
                value={m.role}
                disabled={!canManage || m.role === 'owner'}
                onChange={(e) => changeRole(m.userId, e.target.value as MemberDTO['role'])}
              >
                <option value="owner" disabled>Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="guest">Guest</option>
              </select>
              <button
                className="acct__btn"
                disabled={!canManage || m.role === 'owner'}
                onClick={() => removeMemberAction(m.userId)}
                style={{ opacity: m.role === 'owner' || !canManage ? 0.4 : 1 }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {invitations.length > 0 && (
        <div className="ss-card">
          <div className="ss-card__h">Pending invitations</div>
          <p className="ss-card__sub">Share the link with the invitee. Expires in 14 days.</p>
          {invitations.map((inv) => (
            <div className="member" key={inv.id}>
              <div className="member__avatar" style={{ background: 'var(--surface-sunken)', color: 'var(--text-3)' }}>✉</div>
              <div>
                <div className="member__name">{inv.email}</div>
                <div className="member__email">
                  {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                </div>
              </div>
              <button className="acct__btn" onClick={() => copyInviteLink(inv.token)}>Copy link</button>
              <button className="acct__btn" onClick={() => revokeInvite(inv.id)}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      {showInvite && activeWs && (
        <InviteMemberModal
          onClose={() => setShowInvite(false)}
          onInvite={inviteMember}
          error={error}
        />
      )}

      <div className="ss-card">
        <div className="ss-card__h">Audit log</div>
        <p className="ss-card__sub">Every workspace event — joins, role changes, invites — the last 50 entries.</p>
        {audit.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 12.5 }}>
            No activity yet.
          </div>
        ) : (
          audit.map((e) => <AuditRow key={e.id} entry={e} />)
        )}
      </div>

      <div className="ss-card">
        <div className="ss-card__h">SSO &amp; security</div>
        <SwitchRow title="Two-factor authentication" sub="Coming soon — for now, sign-in is gated by your provider's 2FA." on={false} onChange={() => {}} />
        <SwitchRow title="Google Workspace SSO" sub="Available on Team plan." on={false} onChange={() => {}} />
        <SwitchRow title="SAML SSO (Okta, Auth0)" sub="Available on Enterprise. Contact sales." on={false} onChange={() => {}} />
      </div>

      <TeamTimezones workspaceMembers={members} />
    </>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const actor = entry.actorName ?? entry.actorEmail ?? 'someone';
  const target = entry.targetName ?? entry.targetEmail ?? '';
  let text: React.ReactNode;
  switch (entry.action) {
    case 'workspace.created':
      text = <><b>{actor}</b> created the workspace</>;
      break;
    case 'invitation.sent':
      text = <><b>{actor}</b> invited <b>{entry.targetEmail}</b> as {entry.details?.role}</>;
      break;
    case 'invitation.revoked':
      text = <><b>{actor}</b> revoked the invitation to <b>{entry.targetEmail}</b></>;
      break;
    case 'member.joined':
      text = <><b>{target || actor}</b> joined the workspace</>;
      break;
    case 'member.removed':
      text = <><b>{actor}</b> removed <b>{target}</b></>;
      break;
    case 'member.role_changed':
      text = <><b>{actor}</b> changed <b>{target}</b>&apos;s role from {entry.details?.fromRole} to <b>{entry.details?.toRole}</b></>;
      break;
    default:
      text = <>{entry.action}</>;
  }
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 14,
      padding: '8px 0',
      fontSize: 12.5,
      borderTop: '1px solid var(--hairline)',
    }}>
      <span style={{ fontFamily: '"Geist Mono", monospace', color: 'var(--text-3)', fontSize: 11 }}>
        {new Date(entry.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </span>
      <span style={{ color: 'var(--text-2)' }}>{text}</span>
    </div>
  );
}

function CreateWorkspaceForm({ onCreate, onCancel }: { onCreate: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
      <input
        className="field-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. ElevAIte Inc."
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()); }}
      />
      <button className="cta-primary" onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}>
        Create
      </button>
      <button className="cta-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function InviteMemberModal({
  onClose, onInvite, error,
}: {
  onClose: () => void;
  onInvite: (email: string, role: InvitationDTO['role']) => void;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitationDTO['role']>('member');
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(31,30,27,0.32)',
        backdropFilter: 'blur(2px)',
        display: 'grid', placeItems: 'center', zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 14,
          padding: 24,
          width: '100%', maxWidth: 440,
          boxShadow: 'var(--shadow)',
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 18px', letterSpacing: '-0.012em' }}>
          Invite a teammate
        </h2>
        <label className="form-row__lbl" style={{ display: 'block', marginBottom: 6, fontSize: 12.5 }}>Email</label>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          autoFocus
        />
        <label className="form-row__lbl" style={{ display: 'block', margin: '14px 0 6px', fontSize: 12.5 }}>Role</label>
        <select
          className="field-input"
          value={role}
          onChange={(e) => setRole(e.target.value as InvitationDTO['role'])}
        >
          <option value="member">Member — can see and create events</option>
          <option value="admin">Admin — can manage members and settings</option>
          <option value="guest">Guest — limited access (view only)</option>
        </select>
        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--coral-subtle)', color: 'var(--coral-strong, var(--coral))', borderRadius: 8, fontSize: 12.5 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="cta-ghost" onClick={onClose}>Cancel</button>
          <button className="cta-primary" disabled={!email.trim()} onClick={() => onInvite(email.trim(), role)}>
            Send invite
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ───────────────────────────────────────────────────────

export function SettingsApp({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [active, setActive] = useState<TabId>('profile');

  // Sync with URL hash
  useEffect(() => {
    const fromHash = (window.location.hash || '#profile').slice(1) as TabId;
    if (TABS.some((t) => t.id === fromHash)) setActive(fromHash);
  }, []);
  useEffect(() => {
    if (window.location.hash.slice(1) !== active) {
      window.history.replaceState(null, '', `#${active}`);
    }
  }, [active]);

  // Group tabs by section
  const sections: Record<string, typeof TABS> = {};
  for (const t of TABS) {
    (sections[t.section] = sections[t.section] || []).push(t);
  }

  function renderActive() {
    switch (active) {
      case 'profile': return <Profile userName={userName} userEmail={userEmail} />;
      case 'accounts': return <Accounts userEmail={userEmail} />;
      case 'notifications': return <Notifications />;
      case 'appearance': return <Appearance />;
      case 'keyboard': return <Keyboard />;
      case 'billing': return <Billing userEmail={userEmail} />;
      case 'workspace': return <Workspace />;
    }
  }

  const userInitial = (userName ?? userEmail ?? 'U').trim()[0]?.toUpperCase() ?? 'U';

  return (
    <div className="settings-shell">
      <aside className="settings-sidebar">
        <Link className="ss-back" href="/home">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to home
        </Link>

        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="ss-section">{section}</div>
            {items.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ss-nav-item ${active === t.id ? 'on' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.icon}
                {t.label}
                {t.badge && <span className="ss-badge">{t.badge}</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="ss-user">
          <div className="ss-user__avatar">{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ss-user__name">{userName}</div>
            <div className="ss-user__email">{userEmail}</div>
          </div>
        </div>
      </aside>

      <main className="settings-main" key={active}>
        <div className="settings-main__inner">{renderActive()}</div>
      </main>
    </div>
  );
}
