'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import './proto.css';
import { MonthView } from './MonthView';
import {
  IconChevronLeft, IconChevronRight, IconChevronDown, IconSearch, IconPlus,
  IconClock, IconEye, IconEyeOff, IconMoon, IconSidebar, IconMore, IconCalendar,
} from './Icons';
import {
  DEFAULT_CALENDARS, DEFAULT_TZONES, DAY_NAMES, HOUR_START, HOUR_END,
  fmtTime, fmtTime24, type CalendarMeta,
} from './defaults';
import { EventPanel, type PanelDraft } from './EventPanel';
import { CommandPaletteProto, type Cmd } from './CommandPaletteProto';
import { useUnreadCount } from '@/lib/useUnreadCount';
import { useAppearance } from '@/lib/useAppearance';
import type { ChipColor, EventDTO } from '@/lib/events';
import { addDays, daysInWeek, endOfWeek, startOfWeek, isSameDay, MONTHS_FULL } from '@/lib/date';

type GridEvent = {
  id: string;
  day: number;          // 0=Mon..6=Sun
  start: number;        // decimal hours (e.g. 9.5)
  end: number;
  title: string;
  calendar: string;
  color: ChipColor;
  loc?: string;
  allDay?: boolean;
  raw: EventDTO;
};

type LaidOutEvent = GridEvent & { col: number; cols: number };

function layoutDay(evs: GridEvent[]): LaidOutEvent[] {
  const sorted = [...evs].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: LaidOutEvent[] = sorted.map((e) => ({ ...e, col: 0, cols: 1 }));
  const active: { endTime: number; col: number; idx: number }[] = [];
  for (let i = 0; i < out.length; i++) {
    const e = out[i];
    for (let j = active.length - 1; j >= 0; j--) {
      if (active[j].endTime <= e.start) active.splice(j, 1);
    }
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col++;
    e.col = col;
    active.push({ endTime: e.end, col, idx: i });
    const cols = Math.max(...active.map((a) => a.col)) + 1;
    active.forEach((a) => { out[a.idx].cols = Math.max(out[a.idx].cols, cols); });
  }
  return out;
}

function eventsToGrid(events: EventDTO[], gridStart: Date, numDays: number): GridEvent[] {
  return events
    .map((e) => {
      const s = new Date(e.start);
      const en = new Date(e.end);
      const dayIdx = Math.floor((s.getTime() - gridStart.getTime()) / 86_400_000);
      if (dayIdx < 0 || dayIdx >= numDays) return null;
      const startH = s.getHours() + s.getMinutes() / 60;
      const endH = en.getHours() + en.getMinutes() / 60;
      // Treat events spanning >= 23 hours as all-day
      const isAllDay =
        endH - startH >= 23 ||
        (s.getHours() === 0 && s.getMinutes() === 0 && en.getHours() === 0 && en.getMinutes() === 0);
      return {
        id: e.id,
        day: dayIdx,
        start: startH,
        end: Math.max(endH, startH + 0.25),
        title: e.title,
        calendar: 'work', // TODO: map to real calendars once persisted
        color: e.color,
        loc: e.location,
        allDay: isAllDay,
        raw: e,
      };
    })
    .filter((x): x is GridEvent => !!x);
}

function groupBy<T extends Record<string, unknown>>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, x) => {
    const k = String(x[key]);
    (acc[k] = acc[k] || []).push(x);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────

export function CalendarApp() {
  const { data: session } = useSession();
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [calendars, setCalendars] = useState<CalendarMeta[]>(DEFAULT_CALENDARS);
  const [draft, setDraft] = useState<PanelDraft | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'expanded' | 'collapsed' | 'hidden'>('expanded');
  const [appearance, setAppearance] = useAppearance();
  const theme = appearance.theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : appearance.theme;
  const [nowMin, setNowMin] = useState<number>(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const [tzTimes, setTzTimes] = useState<string[]>(() => DEFAULT_TZONES.map(() => ''));
  const [allDayCollapsed, setAllDayCollapsed] = useState(false);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const unread = useUnreadCount();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ day: number; startY: number; column: HTMLDivElement } | null>(null);
  const [dragGhost, setDragGhost] = useState<{ day: number; top: number; height: number } | null>(null);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor), [anchor]);
  const days = useMemo(() => {
    if (view === 'day') return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())];
    return daysInWeek(weekStart);
  }, [view, anchor, weekStart]);
  const now = new Date();
  const todayIdx = days.findIndex((d) => isSameDay(d, now));

  const toggleTheme = () => {
    setAppearance('theme', theme === 'light' ? 'dark' : 'light');
  };

  // ── Tick now-line + tz clocks every minute ────────────────────────
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
      setTzTimes(
        DEFAULT_TZONES.map((z) => {
          if (z.tz === 'local') {
            return n.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          }
          return n.toLocaleTimeString(undefined, {
            hour: '2-digit', minute: '2-digit', timeZone: z.tz, hourCycle: 'h23',
          });
        }),
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch events ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams({ from: weekStart.toISOString(), to: weekEnd.toISOString() });
    const res = await fetch(`/api/events?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setEvents(data.events ?? []);
  }, [weekStart, weekEnd]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Auto-scroll to morning hours on mount ─────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = Math.max(0, Math.min(now.getHours() - 1, HOUR_END - 6));
    const hourH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hour-h')) || 56;
    scrollRef.current.scrollTop = target * hourH - HOUR_START * 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K toggles palette anywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((o) => !o);
        return;
      }
      // ⌘⇧D toggles dark mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
        return;
      }
      if (cmdkOpen) return;
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 't') setAnchor(new Date());
      else if (k === 'c') openCreateNow();
      else if (e.key === 'ArrowRight' || k === 'j') setAnchor((a) => addDays(a, 7));
      else if (e.key === 'ArrowLeft' || k === 'k') setAnchor((a) => addDays(a, -7));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdkOpen, theme]);

  function openCreateNow() {
    const n = new Date();
    const end = new Date(n); end.setHours(n.getHours() + 1);
    setDraft({ title: '', start: n, end, color: 'coral' });
    setPanelOpen(true);
  }

  function openEdit(ev: EventDTO) {
    setDraft({
      id: ev.id,
      title: ev.title,
      start: new Date(ev.start),
      end: new Date(ev.end),
      color: ev.color,
      location: ev.location,
      description: ev.description,
    });
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  function toggleCalendar(id: string) {
    setCalendars((cs) => cs.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }

  // ── Drag-to-create on the grid ────────────────────────────────────
  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(null as never);
  const onMouseUpRef = useRef<(e: MouseEvent) => void>(null as never);
  onMouseMoveRef.current = (e: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = drag.column.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDragGhost({ day: drag.day, top: Math.min(drag.startY, y), height: Math.max(8, Math.abs(y - drag.startY)) });
  };
  onMouseUpRef.current = (e: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMoveRef.current!);
    const drag = dragRef.current;
    dragRef.current = null;
    setDragGhost(null);
    if (!drag) return;
    const rect = drag.column.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hour-h')) || 56;
    const startH = HOUR_START + Math.min(drag.startY, y) / hourH;
    let endH = HOUR_START + Math.max(drag.startY, y) / hourH;
    const snap = (h: number) => Math.round(h * 4) / 4;
    const sH = snap(startH);
    let eH = snap(endH);
    if (Math.abs(y - drag.startY) < 4) eH = sH + 1;
    else if (eH - sH < 0.25) eH = sH + 0.25;
    const dayDate = days[drag.day];
    const start = new Date(dayDate); start.setHours(Math.floor(sH), Math.round((sH - Math.floor(sH)) * 60), 0, 0);
    const end = new Date(dayDate); end.setHours(Math.floor(eH), Math.round((eH - Math.floor(eH)) * 60), 0, 0);
    setDraft({ title: '', start, end, color: 'coral' });
    setPanelOpen(true);
  };

  function onColMouseDown(e: React.MouseEvent<HTMLDivElement>, day: number) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.event')) return;
    const column = e.currentTarget;
    const rect = column.getBoundingClientRect();
    const y = e.clientY - rect.top;
    dragRef.current = { day, startY: y, column };
    setDragGhost({ day, top: y, height: 56 });
    const move = (ev: MouseEvent) => onMouseMoveRef.current!(ev);
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      onMouseUpRef.current!(ev);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up, { once: true });
    e.preventDefault();
  }

  const gridStart = useMemo(() => (view === 'day' ? days[0] : weekStart), [view, days, weekStart]);
  const gridEvents = useMemo(() => eventsToGrid(events, gridStart, days.length), [events, gridStart, days.length]);
  const visibleCalIds = new Set(calendars.filter((c) => c.visible).map((c) => c.id));
  const visible = gridEvents.filter((e) => visibleCalIds.has(e.calendar));
  const allDayEvs = visible.filter((e) => e.allDay);
  const timedEvs = visible.filter((e) => !e.allDay);

  // ── Header date range label ──────────────────────────────────────
  const dateLabel = useMemo(() => {
    const s = weekStart;
    const e = addDays(weekStart, 6);
    const sMonth = MONTHS_FULL[s.getMonth()].slice(0, 3);
    const eMonth = MONTHS_FULL[e.getMonth()].slice(0, 3);
    const yr = s.getFullYear();
    if (s.getMonth() === e.getMonth()) return `${sMonth} ${s.getDate()} – ${e.getDate()}, ${yr}`;
    return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${yr}`;
  }, [weekStart]);

  const weekNum = useMemo(() => {
    const onejan = new Date(weekStart.getFullYear(), 0, 1);
    return Math.ceil(((weekStart.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7);
  }, [weekStart]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <button
          className="icon-btn"
          onClick={() =>
            setSidebarMode((m) => (m === 'expanded' ? 'collapsed' : m === 'collapsed' ? 'hidden' : 'expanded'))
          }
          title="Toggle sidebar"
        >
          <IconSidebar />
        </button>

        <Link href="/home" className="topbar__brand" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div className="topbar__brand-mark">E</div>
          ElevAIte
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" onClick={() => setAnchor((a) => addDays(a, -7))} title="Previous week">
            <IconChevronLeft />
          </button>
          <button className="icon-btn" onClick={() => setAnchor((a) => addDays(a, 7))} title="Next week">
            <IconChevronRight />
          </button>
          <button className="today-btn" onClick={() => setAnchor(new Date())} title="Today (T)">Today</button>
        </div>

        <div className="topbar__date">
          {dateLabel} <small>Week {weekNum}</small>
        </div>

        <div style={{ flex: 1 }} />

        <button className="new-event-btn" onClick={openCreateNow} title="New event (C)">
          <IconPlus size={14} stroke={2} />
          New event
          <span className="kbd-on-coral">C</span>
        </button>

        <button className="search-trigger" title="Search (⌘K)" onClick={() => setCmdkOpen(true)}>
          <IconSearch size={14} />
          <span className="search-trigger__placeholder">Search or command…</span>
          <span className="kbd">⌘K</span>
        </button>

        <div className="view-picker">
          <button aria-pressed={view === 'day'} onClick={() => setView('day')}>D</button>
          <button aria-pressed={view === 'week'} onClick={() => setView('week')}>W</button>
          <button aria-pressed={view === 'month'} onClick={() => setView('month')}>M</button>
        </div>

        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
          <IconMoon />
        </button>

        <button
          className="avatar"
          title={session?.user?.email ?? ''}
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {sidebarMode !== 'hidden' && (
          <aside className={`sidebar ${sidebarMode === 'collapsed' ? 'sidebar--collapsed' : ''}`}>
            {sidebarMode === 'expanded' ? (
              <>
                <div className="sb-section" style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <Link
                    href="/home"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', marginBottom: 2,
                      fontSize: 13, color: 'var(--text-2)',
                      borderRadius: 7, textDecoration: 'none',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
                    Home
                  </Link>
                  <Link
                    href="/inbox"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', marginBottom: 2,
                      fontSize: 13, color: 'var(--text-2)',
                      borderRadius: 7, textDecoration: 'none',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                    Inbox
                    {unread > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: 'var(--coral)',
                        color: '#fff',
                        fontSize: 10.5, fontWeight: 600,
                        padding: '1px 7px', borderRadius: 999,
                      }}>
                        {unread}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/scheduling"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', marginBottom: 2,
                      fontSize: 13, color: 'var(--text-2)',
                      borderRadius: 7, textDecoration: 'none',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>
                    Scheduling links
                  </Link>
                  <Link
                    href="/settings"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px',
                      fontSize: 13, color: 'var(--text-2)',
                      borderRadius: 7, textDecoration: 'none',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /></svg>
                    Settings
                  </Link>
                </div>
                <div className="sb-section">
                  <div className="sb-section__head">
                    <span>Time zones</span>
                    <button title="Add zone"><IconPlus size={12} /></button>
                  </div>
                  {DEFAULT_TZONES.map((z, i) => (
                    <div className="tz-row" key={z.name}>
                      <span className="tz-row__offset">{z.offset || 'LT'}</span>
                      <span className="tz-row__name">{z.name}</span>
                      <span className="tz-row__time">{tzTimes[i]}</span>
                    </div>
                  ))}
                </div>

                <div className="sb-section" style={{ flex: 1, overflowY: 'auto' }}>
                  <div className="sb-section__head">
                    <span>Calendars</span>
                    <button title="Account settings"><IconMore size={12} /></button>
                  </div>
                  {Object.entries(groupBy(calendars, 'account')).map(([acc, cals]) => (
                    <div key={acc} style={{ marginBottom: 4 }}>
                      <div className="cal-account__group">
                        <IconChevronDown size={11} />
                        <span style={{ flex: 1, fontSize: 11, color: 'var(--text-3)' }}>{acc}</span>
                      </div>
                      {cals.map((c) => (
                        <div key={c.id} className="cal-account" onClick={() => toggleCalendar(c.id)}>
                          <span className="cal-account__swatch" style={{ background: `var(--chip-${c.color}-bar)` }} />
                          <span className={`cal-account__name ${!c.visible ? 'cal-account__name--hidden' : ''}`}>
                            {c.name}
                          </span>
                          <span className={`cal-account__eye ${!c.visible ? 'cal-account__eye--always' : ''}`}>
                            {c.visible ? <IconEye size={13} /> : <IconEyeOff size={13} />}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <button className="add-cal"><IconPlus size={13} /> Add calendar</button>
                </div>
              </>
            ) : (
              <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <button className="icon-btn" title="Time zones"><IconClock /></button>
                <button className="icon-btn" title="Calendars"><IconCalendar /></button>
                <button className="icon-btn" title="Add"><IconPlus /></button>
              </div>
            )}
          </aside>
        )}

        {/* ── Calendar area: Month view OR day/week grid ─────────────── */}
        {view === 'month' ? (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <MonthView
              anchor={anchor}
              events={events}
              onPickDate={(d) => { setAnchor(d); setView('day'); }}
              onPickEvent={openEdit}
            />
          </div>
        ) : (
        <div className="cal-wrap">
          {/* Day headers */}
          <div className="cal-day-headers" style={{ gridTemplateColumns: `var(--gutter-w) repeat(${days.length}, 1fr)` }}>
            <div className="cal-day-headers__gutter" />
            {days.map((d, i) => (
              <div
                key={i}
                className={`cal-day ${isSameDay(d, now) ? 'cal-day--today' : ''} ${i >= 5 ? 'cal-day--weekend' : ''}`}
              >
                <div className="cal-day__name">{DAY_NAMES[i]}</div>
                <div className="cal-day__num">{d.getDate()}</div>
              </div>
            ))}
          </div>

          {/* All-day row */}
          <div className="all-day-row" style={{ minHeight: allDayCollapsed ? 24 : undefined, gridTemplateColumns: `var(--gutter-w) repeat(${days.length}, 1fr)` }}>
            <div
              className="all-day-row__label"
              onClick={() => setAllDayCollapsed((v) => !v)}
              style={{ cursor: 'pointer' }}
            >
              all-day
            </div>
            {days.map((_, i) => (
              <div
                key={i}
                className={`all-day-row__cell ${isSameDay(days[i], now) ? 'all-day-row__cell--today' : ''}`}
              >
                {!allDayCollapsed &&
                  allDayEvs
                    .filter((e) => e.day === i)
                    .map((e) => (
                      <div
                        key={e.id}
                        className={`all-day-chip event--${appearance.chipStyle}`}
                        style={
                          {
                            ['--chip-bg' as never]: `var(--chip-${e.color}-bg)`,
                            ['--chip-bar' as never]: `var(--chip-${e.color}-bar)`,
                            ['--chip-text' as never]: `var(--chip-${e.color}-text)`,
                          } as React.CSSProperties
                        }
                        onClick={() => openEdit(e.raw)}
                      >
                        {e.title}
                      </div>
                    ))}
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div className="cal-scroll" ref={scrollRef}>
            <div className="cal-grid" style={{ gridTemplateColumns: `var(--gutter-w) repeat(${days.length}, 1fr)` }}>
              {/* Gutter */}
              <div className="cal-gutter">
                {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, k) => HOUR_START + k).map((h) => (
                  <div className="cal-gutter__hour" key={h}>
                    <span>{appearance.timeFormat === '24'
                        ? String(h).padStart(2, '0') + ':00'
                        : (h === 12 ? '12 PM' : h > 12 ? (h - 12) + ' PM' : h + ' AM')}</span>
                  </div>
                ))}
              </div>

              {days.map((d, i) => {
                const dayEvents = layoutDay(timedEvs.filter((e) => e.day === i));
                const hourH = 56;
                const yFromHour = (h: number) => (h - HOUR_START) * hourH;
                return (
                  <div
                    key={i}
                    data-col={i}
                    className={`cal-col ${isSameDay(d, now) ? 'cal-col--today' : ''} ${i >= 5 ? 'cal-col--weekend' : ''}`}
                    onMouseDown={(e) => onColMouseDown(e, i)}
                    style={{ position: 'relative' }}
                  >
                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, k) => k).map((h) => (
                      <div className="cal-col__hour" key={h} />
                    ))}

                    {dayEvents.map((e) => {
                      const top = yFromHour(e.start);
                      const h = (e.end - e.start) * hourH;
                      const widthPct = 100 / e.cols;
                      const leftPct = (e.col * 100) / e.cols;
                      const cssVars = {
                        ['--chip-bg' as never]: `var(--chip-${e.color}-bg)`,
                        ['--chip-bar' as never]: `var(--chip-${e.color}-bar)`,
                        ['--chip-text' as never]: `var(--chip-${e.color}-text)`,
                      } as React.CSSProperties;
                      return (
                        <div
                          key={e.id}
                          className={`event event--${appearance.chipStyle} ${h < 24 ? 'event--short' : ''}`}
                          style={{
                            top,
                            height: h - 2,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            ...cssVars,
                          }}
                          onMouseDown={(ev) => ev.stopPropagation()}
                          onClick={(ev) => { ev.stopPropagation(); openEdit(e.raw); }}
                        >
                          <div className="event__title">{e.title}</div>
                          {h > 38 && (
                            <div className="event__meta">
                              {appearance.timeFormat === '24'
                                ? `${fmtTime24(e.start)} – ${fmtTime24(e.end)}`
                                : `${fmtTime(e.start)} – ${fmtTime(e.end)}`}
                            </div>
                          )}
                          {h > 70 && e.loc && <div className="event__loc">{e.loc}</div>}
                        </div>
                      );
                    })}

                    {dragGhost && dragGhost.day === i && (() => {
                      const hourH = 56;
                      const sH = HOUR_START + Math.min(dragGhost.top, dragGhost.top + dragGhost.height) / hourH;
                      const eH = HOUR_START + Math.max(dragGhost.top, dragGhost.top + dragGhost.height) / hourH;
                      return (
                        <div className="drag-ghost" style={{ top: dragGhost.top, height: dragGhost.height }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>New event</div>
                            <div className="mono" style={{ fontSize: 10.5, opacity: 0.8, marginTop: 1 }}>
                              {appearance.timeFormat === '24'
                                ? `${fmtTime24(sH)} – ${fmtTime24(eH)}`
                                : `${fmtTime(sH)} – ${fmtTime(eH)}`}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Now line */}
              {todayIdx >= 0 && nowMin / 60 >= HOUR_START && nowMin / 60 <= HOUR_END + 1 && (
                <div
                  className="now-line"
                  style={{
                    top: (nowMin / 60 - HOUR_START) * 56,
                    position: 'absolute',
                    left: 'var(--gutter-w)',
                    right: 0,
                  }}
                >
                  <div className="now-line__label">{fmtTime24(nowMin / 60)}</div>
                  <div className="now-line__bar" />
                  <div className="now-line__dot" style={{ left: `${(100 / days.length) * todayIdx}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      <EventPanel
        draft={draft}
        open={panelOpen}
        onClose={closePanel}
        onSaved={() => {
          setPanelOpen(false);
          fetchEvents();
        }}
      />

      <CommandPaletteProto
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        commands={buildCommands({
          openCreateNow,
          gotoToday: () => setAnchor(new Date()),
          toggleTheme,
          gotoScheduling: () => { window.location.href = '/scheduling'; },
          signOut: () => signOut({ callbackUrl: '/' }),
          events,
          openEdit,
        })}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Command palette items

function buildCommands(args: {
  openCreateNow: () => void;
  gotoToday: () => void;
  toggleTheme: () => void;
  gotoScheduling: () => void;
  signOut: () => void;
  events: EventDTO[];
  openEdit: (e: EventDTO) => void;
}): Cmd[] {
  const recents: Cmd[] = args.events.slice(0, 3).map((e, i) => ({
    section: 'Recent' as const,
    id: `r${i}`,
    label: e.title,
    hint: new Date(e.start).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
    icon: 'event' as const,
    run: () => args.openEdit(e),
  }));

  const actions: Cmd[] = [
    { section: 'Actions', id: 'a1', label: 'Create event',            kbd: ['C'],            icon: 'plus', run: args.openCreateNow },
    { section: 'Actions', id: 'a2', label: 'Go to today',             kbd: ['T'],            icon: 'cal',  run: args.gotoToday },
    { section: 'Actions', id: 'a6', label: 'Toggle dark mode',        kbd: ['⌘', '⇧', 'D'],  icon: 'moon', run: args.toggleTheme },
    { section: 'Actions', id: 'a7', label: 'Open scheduling links',                          icon: 'link', run: args.gotoScheduling },
    { section: 'Actions', id: 'a9', label: 'Sign out',                                       icon: 'set',  run: args.signOut },
  ];

  const eventCmds: Cmd[] = args.events.slice(0, 8).map((e) => ({
    section: 'Events' as const,
    id: `ev-${e.id}`,
    label: e.title,
    hint: new Date(e.start).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
    icon: 'event' as const,
    run: () => args.openEdit(e),
  }));

  return [...recents, ...actions, ...eventCmds];
}
