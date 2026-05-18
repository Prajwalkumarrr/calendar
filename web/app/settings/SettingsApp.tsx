'use client';

// Settings — faithful port of prototype/settings.html
// 7 tabs in URL hash: #profile · #accounts · #notifications · #appearance · #keyboard · #billing · #workspace

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './settings.css';

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

function Notifications() {
  const [s, setS] = useState({
    desktop: true, email: true, mobile: true, sms: false,
    reminders: true, reminderTime: '10', digest: true,
    invites: true, rsvp: true, cancel: true, reschedule: true,
    links: true, slack: false,
  });
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));

  return (
    <>
      <h1 className="ss-page-h">Notifications</h1>
      <p className="ss-page-sub">Choose how and when we ping you. We default to &quot;useful and warm&quot;.</p>

      <div className="ss-card">
        <div className="ss-card__h">Where to reach you</div>
        <SwitchRow title="Desktop notifications" sub="Native macOS / Windows alerts for upcoming events." on={s.desktop} onChange={(v) => set('desktop', v)} />
        <SwitchRow title="Email digest" sub="One email per day with what's ahead." on={s.email} onChange={(v) => set('email', v)} />
        <SwitchRow title="Mobile push" sub="iOS app — Android coming soon." on={s.mobile} onChange={(v) => set('mobile', v)} />
        <SwitchRow title="SMS (Team plan only)" sub="For meeting reminders on the go." on={s.sms} onChange={(v) => set('sms', v)} />
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Event reminders</div>
        <Row label="Reminder lead time" sub="How long before an event we nudge you.">
          <Seg
            value={s.reminderTime}
            options={[{ v: '1', l: '1 min' }, { v: '5', l: '5 min' }, { v: '10', l: '10 min' }, { v: '15', l: '15 min' }, { v: '30', l: '30 min' }]}
            onChange={(v) => set('reminderTime', v)}
          />
        </Row>
        <SwitchRow title="Reminders for accepted events" on={s.reminders} onChange={(v) => set('reminders', v)} />
        <SwitchRow title="Daily morning digest" sub="Sent at 8:00 AM in your time zone." on={s.digest} onChange={(v) => set('digest', v)} />
      </div>

      <div className="ss-card">
        <div className="ss-card__h">When others do things</div>
        <SwitchRow title="New event invitations" on={s.invites} onChange={(v) => set('invites', v)} />
        <SwitchRow title="RSVPs to your events" on={s.rsvp} onChange={(v) => set('rsvp', v)} />
        <SwitchRow title="Event cancellations" on={s.cancel} onChange={(v) => set('cancel', v)} />
        <SwitchRow title="Event reschedules" on={s.reschedule} onChange={(v) => set('reschedule', v)} />
        <SwitchRow title="Bookings on scheduling links" sub="When someone books one of your /book links." on={s.links} onChange={(v) => set('links', v)} />
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Integrations</div>
        <SwitchRow title="Slack — post in #standup before your standup" on={s.slack} onChange={(v) => set('slack', v)} />
        <SwitchRow title="Linear — link issues mentioned in events" on={false} onChange={() => {}} />
      </div>
    </>
  );
}

function Appearance() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [density, setDensity] = useState<'compact' | 'regular' | 'comfy'>('regular');
  const [weekStart, setWeekStart] = useState<'mon' | 'sun' | 'sat'>('mon');
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('24');
  const [chip, setChip] = useState<'fill' | 'tinted' | 'outline'>('tinted');
  const [accent, setAccent] = useState('#D97757');

  // Restore + persist
  useEffect(() => {
    const saved = (localStorage.getItem('elevaite.theme') as 'light' | 'dark' | null) ?? null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    if (theme !== 'system') {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('elevaite.theme', theme);
    }
  }, [theme]);

  return (
    <>
      <h1 className="ss-page-h">Appearance</h1>
      <p className="ss-page-sub">Make ElevAIte look how you want.</p>

      <div className="ss-card">
        <Row label="Theme">
          <div className="theme-cards">
            {([
              { k: 'light', l: 'Light', bg: '#FAF9F5', sk: '#F5F4ED' },
              { k: 'dark', l: 'Dark', bg: '#1A1916', sk: '#232220' },
              { k: 'system', l: 'System', bg: 'linear-gradient(135deg, #FAF9F5 50%, #1A1916 50%)', sk: '#888' },
            ] as const).map((o) => (
              <button
                key={o.k}
                type="button"
                className={`theme-card ${theme === o.k ? 'on' : ''}`}
                onClick={() => setTheme(o.k)}
              >
                <div className="theme-card__prev" style={{ background: o.bg }}>
                  <div style={{ width: '60%', background: o.sk }} />
                  <div style={{ width: '40%', background: o.sk }} />
                  <div style={{ height: 18, marginTop: 'auto', background: accent, borderRadius: 3, opacity: 0.7 }} />
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
                onClick={() => setAccent(c)}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: c, border: 0, cursor: 'pointer',
                  boxShadow: accent === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none',
                  transition: 'box-shadow 140ms var(--ease)',
                }}
              />
            ))}
          </div>
        </Row>

        <Row label="Density">
          <Seg value={density} options={['compact', 'regular', 'comfy'] as const} onChange={setDensity} />
        </Row>

        <Row label="Event chip style">
          <Seg value={chip} options={['fill', 'tinted', 'outline'] as const} onChange={setChip} />
        </Row>
      </div>

      <div className="ss-card">
        <div className="ss-card__h">Calendar defaults</div>
        <Row label="Week starts on">
          <Seg value={weekStart} options={[{ v: 'mon' as const, l: 'Monday' }, { v: 'sun' as const, l: 'Sunday' }, { v: 'sat' as const, l: 'Saturday' }]} onChange={setWeekStart} />
        </Row>
        <Row label="Time format">
          <Seg value={timeFormat} options={[{ v: '12' as const, l: '12-hour' }, { v: '24' as const, l: '24-hour' }]} onChange={setTimeFormat} />
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

function Workspace() {
  return (
    <>
      <h1 className="ss-page-h">Workspace</h1>
      <p className="ss-page-sub">Manage your team. <span className="acct__pill" style={{ marginLeft: 6 }}>Solo workspace</span></p>

      <div className="ss-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="ss-card__h">Members</div>
            <p className="ss-card__sub" style={{ marginBottom: 0 }}>
              Invite teammates and set their roles. (Upgrade to Team plan to add members.)
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <button className="cta-primary" disabled style={{ opacity: 0.5 }}>
            + Invite member
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>
          You&apos;re the only member. Upgrade to invite teammates.
        </div>
      </div>

      <div className="ss-card">
        <div className="ss-card__h">SSO &amp; security</div>
        <SwitchRow title="Two-factor authentication" sub="Add an extra layer when signing in." on={false} onChange={() => {}} />
        <SwitchRow title="Google Workspace SSO" sub="Available on Team plan." on={false} onChange={() => {}} />
        <SwitchRow title="SAML SSO (Okta, Auth0)" sub="Available on Enterprise. Contact sales." on={false} onChange={() => {}} />
      </div>
    </>
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
