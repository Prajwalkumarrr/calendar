'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import '../calendar/proto.css'; // reuse .topbar, .icon-btn, .today-btn, .new-event-btn, .search-trigger, .kbd, .avatar
import './home.css';
import {
  IconCalendar, IconChevronLeft, IconChevronRight, IconClock, IconLink,
  IconMapPin, IconMoon, IconPlus, IconSearch, IconSettings, IconSidebar, IconUsers,
} from '../calendar/Icons';
import { DEFAULT_CALENDARS, DEFAULT_TZONES } from '../calendar/defaults';
import type { EventDTO } from '@/lib/events';

type Booking = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  start: string;
  end: string;
  link?: { title: string; slug: string; durationMin: number };
};

type Link = {
  id: string;
  title: string;
  slug: string;
  durationMin: number;
  color: 'coral' | 'sand' | 'sage' | 'slate' | 'plum' | 'ochre' | 'rose' | 'stone';
};

const CHIP_BAR: Record<string, string> = {
  coral: '#D97757', sand: '#B89460', sage: '#7E9C7A', slate: '#748AA6',
  plum: '#997594', ochre: '#C49746', rose: '#C0808C', stone: '#8C857A',
};

function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

function fmtTime12(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtTime24(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtBookingDate(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${fmtTime12(d)}`;
}

function minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

function avatarFor(name: string): string {
  const palettes = [
    'linear-gradient(135deg,#9A7B98,#D97757)',
    'linear-gradient(135deg,#88A188,#B89968)',
    'linear-gradient(135deg,#7A8DA8,#9A7B98)',
    'linear-gradient(135deg,#C8A057,#D97757)',
    'linear-gradient(135deg,#B89968,#88A188)',
  ];
  const idx = name.charCodeAt(0) % palettes.length;
  return palettes[idx];
}

export function HomePage({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const [now, setNow] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [links, setLinks] = useState<Link[]>([]);

  // Tick every minute for now-line + countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch this week's events + recent bookings + scheduling links
  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date();
      const weekStart = new Date(today); weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const [evRes, bkRes, lnRes] = await Promise.all([
        fetch(`/api/events?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`),
        fetch('/api/bookings'),
        fetch('/api/scheduling-links'),
      ]);
      if (evRes.ok) {
        const d = await evRes.json();
        setEvents(d.events ?? []);
      }
      if (bkRes.ok) {
        const d = await bkRes.json();
        setBookings(d.bookings ?? []);
      }
      if (lnRes.ok) {
        const d = await lnRes.json();
        setLinks(d.links ?? []);
      }
    };
    fetchAll().catch(console.error);
  }, []);

  // Theme toggle
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const saved = (localStorage.getItem('elevaite.theme') as 'light' | 'dark' | null) ?? null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ?? (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('elevaite.theme', next);
  }

  // Today's events sorted ascending
  const todayEvents = useMemo(() => {
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return events
      .filter((e) => {
        const s = new Date(e.start);
        return `${s.getFullYear()}-${s.getMonth()}-${s.getDate()}` === todayStr;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, now]);

  // Next event (first event starting in the future today, or in progress now)
  const nextEvent = useMemo(() => {
    return todayEvents.find((e) => new Date(e.end) > now) ?? null;
  }, [todayEvents, now]);

  const minutesUntilNext = nextEvent ? minutesBetween(now, new Date(nextEvent.start)) : null;
  const nextIsInProgress = nextEvent && new Date(nextEvent.start) <= now;

  // Stats: hours this week, bookings this week, focus blocks
  const stats = useMemo(() => {
    let totalMin = 0;
    let focusMin = 0;
    for (const e of events) {
      const dur = (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60_000;
      totalMin += dur;
      if (e.title.toLowerCase().includes('focus')) focusMin += dur;
    }
    const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const bookingsThisWeek = bookings.filter((b) => new Date(b.start) >= weekStart).length;
    const fmtHM = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
    const fmtH = (m: number) => `${Math.round(m / 60)}h`;
    // Sparkline: hours per weekday, normalized to max
    const perDay = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
    for (const e of events) {
      const s = new Date(e.start);
      const dur = (new Date(e.end).getTime() - s.getTime()) / 60_000;
      const idx = (s.getDay() + 6) % 7;
      perDay[idx] += dur;
    }
    const max = Math.max(...perDay, 60);
    const todayIdx = (now.getDay() + 6) % 7;
    return {
      hoursLabel: fmtHM(totalMin),
      bookingsCount: bookingsThisWeek,
      focusLabel: fmtH(focusMin),
      focusPct: totalMin > 0 ? Math.round((focusMin / totalMin) * 100) : 0,
      spark: perDay.map((m) => Math.max(8, (m / max) * 100)),
      todayIdx,
    };
  }, [events, bookings, now]);

  // Count-up animation for stat numbers (run once)
  const stat1Ref = useRef<HTMLSpanElement>(null);
  const stat2Ref = useRef<HTMLSpanElement>(null);
  const stat3Ref = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);
  useEffect(() => {
    if (animatedRef.current) return;
    // Wait until we have real data before animating
    if (events.length === 0 && bookings.length === 0 && links.length === 0) return;
    animatedRef.current = true;
    const animate = (el: HTMLElement | null, final: string, isHours: boolean) => {
      if (!el) return;
      const dur = 700;
      const start = performance.now();
      if (isHours) {
        const m = final.match(/(\d+)h\s*(\d+)?m?/);
        if (!m) { el.textContent = final; return; }
        const h = parseInt(m[1]); const mm = m[2] ? parseInt(m[2]) : 0;
        const totalMin = h * 60 + mm;
        const tick = (n: number) => {
          const t = Math.min(1, (n - start) / dur);
          const e = 1 - Math.pow(1 - t, 3);
          const v = Math.round(totalMin * e);
          el.textContent = `${Math.floor(v / 60)}h ${v % 60}m`;
          if (t < 1) requestAnimationFrame(tick); else el.textContent = final;
        };
        requestAnimationFrame(tick);
      } else {
        const final2 = parseInt(final);
        const tick = (n: number) => {
          const t = Math.min(1, (n - start) / dur);
          const e = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(final2 * e));
          if (t < 1) requestAnimationFrame(tick); else el.textContent = final;
        };
        requestAnimationFrame(tick);
      }
    };
    setTimeout(() => {
      animate(stat1Ref.current, stats.hoursLabel, true);
      animate(stat2Ref.current, String(stats.bookingsCount), false);
      animate(stat3Ref.current, stats.focusLabel, true);
    }, 300);
  }, [events, bookings, links, stats]);

  // Today's date in the topbar
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Time-zone clocks (live)
  const tzClocks = useMemo(() => {
    return DEFAULT_TZONES.map((z) => {
      if (z.tz === 'local') {
        return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      }
      return now.toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit', timeZone: z.tz,
      });
    });
  }, [now]);

  const userInitial = (userName ?? userEmail ?? 'U').trim()[0]?.toUpperCase() ?? 'U';
  const firstName = userName?.split(' ')[0] ?? 'there';

  // Now-line position for today's schedule
  const nowMin = now.getHours() * 60 + now.getMinutes();
  function findNowLineIndex(): number | null {
    if (todayEvents.length === 0) return null;
    for (let i = 0; i < todayEvents.length; i++) {
      const s = new Date(todayEvents[i].start);
      const sMin = s.getHours() * 60 + s.getMinutes();
      if (nowMin <= sMin) return i;
    }
    return todayEvents.length;
  }
  const nowLineIdx = findNowLineIndex();

  function copyLinkUrl(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
  }

  return (
    <div className="ho-shell">
      {/* Topbar (re-using .topbar from proto.css) */}
      <header className="topbar">
        <button className="icon-btn" title="Toggle sidebar"><IconSidebar /></button>
        <Link href="/home" className="topbar__brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="topbar__brand-mark">E</div>
          ElevAIte
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn"><IconChevronLeft /></button>
          <button className="icon-btn"><IconChevronRight /></button>
          <button className="today-btn">Today</button>
        </div>
        <div className="topbar__date" style={{ marginLeft: 2 }}>{todayLabel}</div>
        <div style={{ flex: 1 }} />
        <button className="new-event-btn" onClick={() => router.push('/calendar')}>
          <IconPlus size={14} stroke={2} /> New event
          <span className="kbd-on-coral">C</span>
        </button>
        <button className="search-trigger" onClick={() => router.push('/calendar')}>
          <IconSearch size={14} />
          <span className="search-trigger__placeholder">Search or command…</span>
          <span className="kbd">⌘K</span>
        </button>
        <button className="icon-btn" onClick={toggleTheme}><IconMoon /></button>
        <button
          className="avatar"
          onClick={() => signOut({ callbackUrl: '/' })}
          title={userEmail}
        >
          {userInitial}
        </button>
      </header>

      <main className="ho-main">
        {/* Sidebar */}
        <aside className="ho-side">
          <div className="ho-sec">
            <Link className="ho-nav-item on" href="/home">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
              Home
            </Link>
            <Link className="ho-nav-item" href="/calendar">
              <IconCalendar size={14} />
              Calendar
            </Link>
            <Link className="ho-nav-item" href="/inbox">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
              Inbox
            </Link>
            <Link className="ho-nav-item" href="/scheduling">
              <IconLink size={14} />
              Scheduling links
            </Link>
            <Link className="ho-nav-item" href="/settings">
              <IconSettings size={14} />
              Settings
            </Link>
          </div>

          <div className="ho-sec">
            <div className="ho-side__h">Time zones</div>
            {DEFAULT_TZONES.map((z, i) => (
              <div className="tz-row" key={z.name}>
                <span className="tz-row__offset">{z.offset || 'LT'}</span>
                <span className="tz-row__name">{z.name}</span>
                <span className="tz-row__time">{tzClocks[i]}</span>
              </div>
            ))}
          </div>

          <div className="ho-sec" style={{ flex: 1, borderBottom: 0 }}>
            <div className="ho-side__h">Calendars</div>
            {DEFAULT_CALENDARS.filter((c) => c.visible).map((c) => (
              <div className="cal-account" key={c.id}>
                <span className="cal-account__sw" style={{ background: CHIP_BAR[c.color] }} />
                {c.name}
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <section className="ho-content">
          <div className="ho-inner">

            {/* 1. Hero greeting */}
            <div className="ho-hello">
              <div className="ho-hello__txt">
                <h1 className="ho-hello__h">{greetingFor(now)}, {firstName}.</h1>
                <div className="ho-hello__sub">
                  {todayEvents.length === 0 ? (
                    <>Nothing on your calendar today. <b>Enjoy the space.</b></>
                  ) : (
                    <>
                      You have <b>{todayEvents.length} {todayEvents.length === 1 ? 'meeting' : 'meetings'} today</b>.
                      {nextEvent && minutesUntilNext !== null && minutesUntilNext > 0 && (
                        <> Next one in <b>{minutesUntilNext} min</b>.</>
                      )}
                      {nextIsInProgress && <> One <b>in progress now</b>.</>}
                    </>
                  )}
                </div>
              </div>
              <div className="ho-hello__right">
                <div className="ho-hello__streak">
                  ☀️ <b>1</b>-day streak
                </div>
                <div className="ho-hello__date">
                  {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · Week {Math.ceil((now.getTime() / 86_400_000 + 1) / 7) % 53}
                  <br />
                  {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* 2. Next up */}
            {nextEvent ? (
              <Link href="/calendar" className="ho-next">
                <div style={{ flex: 1 }}>
                  <div className="ho-next__lbl">
                    {nextIsInProgress
                      ? 'In progress'
                      : minutesUntilNext !== null && minutesUntilNext < 60
                        ? `Up next · in ${minutesUntilNext} min`
                        : 'Up next today'}
                  </div>
                  <div className="ho-next__title">{nextEvent.title}</div>
                  <div className="ho-next__meta">
                    <span className="ho-next__meta-item">
                      <IconClock size={13} />
                      {fmtTime12(new Date(nextEvent.start))} – {fmtTime12(new Date(nextEvent.end))}
                    </span>
                    {nextEvent.location && (
                      <span className="ho-next__meta-item">
                        <IconMapPin size={13} />
                        {nextEvent.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ho-next__right">
                  {nextEvent.conferencing?.url ? (
                    <a
                      className="ho-next__join"
                      href={nextEvent.conferencing.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      Join meeting
                    </a>
                  ) : null}
                  {minutesUntilNext !== null && minutesUntilNext > 0 && (
                    <span className="ho-next__countdown">
                      starts in <b>{minutesUntilNext} min</b>
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="ho-next ho-next--empty">
                <div style={{ flex: 1 }}>
                  <div className="ho-next__lbl">Up next today</div>
                  <div className="ho-next__title">Nothing scheduled.</div>
                  <div className="ho-next__meta">
                    <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                      Your time is yours. Go build something.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Stats */}
            <div className="ho-stats">
              <div className="ho-stat">
                <div className="ho-stat__lbl">Hours this week</div>
                <div className="ho-stat__num"><span ref={stat1Ref}>0h 0m</span></div>
                <div className="spark">
                  {stats.spark.map((h, i) => (
                    <span
                      key={i}
                      className={i === stats.todayIdx ? 't' : ''}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="ho-stat__delta" style={{ marginTop: 8 }}>
                  Mon–Sun
                </div>
              </div>

              <div className="ho-stat">
                <div className="ho-stat__lbl">Bookings via your link</div>
                <div className="ho-stat__num"><span ref={stat2Ref}>0</span> <small>/ week</small></div>
                <div className="ho-stat__delta">{bookings.length} total</div>
                {links.length > 0 && (
                  <div className="ho-stat__sub">
                    Top link: <b>/book/{links[0].slug}</b>
                  </div>
                )}
              </div>

              <div className="ho-stat">
                <div className="ho-stat__lbl">Focus blocks</div>
                <div className="ho-stat__num"><span ref={stat3Ref}>0h</span> <small>protected</small></div>
                <div className="ho-stat__delta">
                  {stats.focusPct > 0 && (
                    <>that&apos;s <span className="ho-stat__pill">{stats.focusPct}% of week</span></>
                  )}
                </div>
                <div className="ho-stat__sub">
                  Goal: <b>20% per week</b>
                </div>
              </div>
            </div>

            {/* 4. Two-column grid */}
            <div className="ho-grid">
              {/* Today's schedule */}
              <div className="ho-sched">
                <div className="ho-sched__h">
                  <span className="ho-sched__h-title">Today&apos;s schedule</span>
                  <span className="ho-sched__h-count">
                    {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {todayEvents.length === 0 ? (
                  <div className="ho-sched__empty">No events today.</div>
                ) : (
                  <>
                    {todayEvents.map((e, i) => {
                      const s = new Date(e.start);
                      const en = new Date(e.end);
                      const isPast = en < now;
                      const isNow = s <= now && en > now;
                      const color = e.color ?? 'coral';
                      return (
                        <div
                          key={e.id}
                          className={`ho-sched__row ${isPast ? 'past' : ''} ${isNow ? 'now' : ''}`}
                        >
                          {nowLineIdx === i && !isNow && (
                            <span className="ho-sched__now" />
                          )}
                          <span className="ho-sched__time">{fmtTime24(s)}</span>
                          <div
                            className="ho-sched__chip"
                            style={{
                              ['--chip-bg' as never]: `var(--chip-${color}-bg)`,
                              ['--chip-bar' as never]: `var(--chip-${color}-bar)`,
                              ['--chip-text' as never]: `var(--chip-${color}-text)`,
                            } as React.CSSProperties}
                          >
                            <span className="ho-sched__chip-title">
                              {e.title}
                              {isNow && <small>NOW</small>}
                              {!isNow && nextEvent?.id === e.id && <small>NEXT</small>}
                            </span>
                            <span className="ho-sched__chip-meta">
                              {fmtTime12(s)} – {fmtTime12(en)}
                              {e.location && ` · ${e.location}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="ho-sched__foot">
                  <Link href="/calendar">View full week →</Link>
                </div>
              </div>

              {/* Quick actions */}
              <div className="ho-quick">
                <div className="ho-quick__h">Quick actions</div>
                <Link className="ho-q-card ho-q-card--primary" href="/calendar">
                  <div className="ho-q-card__icon"><IconPlus size={16} stroke={2} /></div>
                  <div className="ho-q-card__body">
                    <div className="ho-q-card__h">New event</div>
                    <div className="ho-q-card__sub">Block off time · press C</div>
                  </div>
                  <svg className="ho-q-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
                <Link className="ho-q-card" href="/scheduling/new">
                  <div className="ho-q-card__icon"><IconLink size={16} stroke={1.7} /></div>
                  <div className="ho-q-card__body">
                    <div className="ho-q-card__h">Share availability</div>
                    <div className="ho-q-card__sub">Create a scheduling link</div>
                  </div>
                  <svg className="ho-q-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
                <Link className="ho-q-card" href="/calendar">
                  <div className="ho-q-card__icon"><IconUsers size={16} stroke={1.7} /></div>
                  <div className="ho-q-card__body">
                    <div className="ho-q-card__h">Find a time with…</div>
                    <div className="ho-q-card__sub">Overlap with teammates</div>
                  </div>
                  <svg className="ho-q-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
                <Link className="ho-q-card" href="/onboarding">
                  <div className="ho-q-card__icon"><IconCalendar size={16} stroke={1.7} /></div>
                  <div className="ho-q-card__body">
                    <div className="ho-q-card__h">Connect another calendar</div>
                    <div className="ho-q-card__sub">Google · Apple · Outlook</div>
                  </div>
                  <svg className="ho-q-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              </div>
            </div>

            {/* 5. Recent bookings */}
            {bookings.length > 0 && (
              <>
                <div className="ho-section-lbl">Recent bookings</div>
                <div className="ho-bookings">
                  {bookings.slice(0, 5).map((b) => {
                    const initial = b.inviteeName.trim()[0]?.toUpperCase() ?? '?';
                    return (
                      <Link key={b.id} href={`/booked/${b.id}`} className="ho-book">
                        <div className="ho-book__avatar" style={{ background: avatarFor(b.inviteeName) }}>
                          {initial}
                        </div>
                        <div className="ho-book__body">
                          <div className="ho-book__name">{b.inviteeName}</div>
                          <div className="ho-book__email">{b.inviteeEmail}</div>
                        </div>
                        <span className="ho-book__time">{fmtBookingDate(b.start)}</span>
                        <span className="ho-book__link">/book/{b.link?.slug ?? '—'}</span>
                        <svg className="ho-book__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {/* 6. Scheduling links */}
            <div className="ho-section-lbl">Your links</div>
            <div className="ho-links">
              {links.map((l) => (
                <Link key={l.id} className="ho-link-card" href="/scheduling">
                  <div className="ho-link-card__head">
                    <span className="ho-link-card__sw" style={{ background: CHIP_BAR[l.color] || '#D97757' }} />
                    <span className="ho-link-card__title">{l.title}</span>
                    <button
                      type="button"
                      className="ho-link-card__copy"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyLinkUrl(l.slug); }}
                      title="Copy link"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    </button>
                  </div>
                  <div className="ho-link-card__slug">/book/{l.slug}</div>
                  <div className="ho-link-card__meta">
                    <span><b>{l.durationMin}</b> min</span>
                    <span>
                      <b>{bookings.filter((b) => b.link?.slug === l.slug).length}</b> booked
                    </span>
                  </div>
                </Link>
              ))}
              <Link className="ho-link-card ho-link-card--new" href="/scheduling/new">
                <IconPlus size={14} stroke={2} />
                New link
              </Link>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
