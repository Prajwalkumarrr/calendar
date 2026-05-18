'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import styles from './calendar.module.css';
import {
  addDays,
  daysInWeek,
  endOfWeek,
  isSameDay,
  MONTHS_FULL,
  startOfDay,
  startOfWeek,
  WEEKDAY_SHORT,
} from '@/lib/date';
import type { ChipColor, EventDTO } from '@/lib/events';
import { EventModal, type EventDraft } from './EventModal';
import { MiniMonth } from './MiniMonth';
import { MonthView } from './MonthView';
import { CommandPalette, type CommandAction } from './CommandPalette';
import {
  CHIP_COLOR_CLASS,
  HOUR_HEIGHT,
  HOURS,
  eventsForDay,
  formatChipTime,
  formatHour,
  layoutDayEvents,
  monthGridStart,
  yToDate,
} from './calendar-utils';

type View = 'day' | 'week' | 'month';

// ─────────────────────────────────────────────────────────────────────

export function CalendarApp() {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [nowMinute, setNowMinute] = useState<number>(() => Date.now());
  const [dragGhost, setDragGhost] = useState<{ dayIndex: number; topPx: number; heightPx: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dayIndex: number; day: Date; startY: number; column: HTMLDivElement } | null>(null);

  // ── Theme ─────────────────────────────────────────────────────────
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

  // ── Visible range (depends on view) ───────────────────────────────
  const range = useMemo(() => {
    if (view === 'day') {
      const start = startOfDay(anchor);
      return { start, end: addDays(start, 1) };
    }
    if (view === 'week') {
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    }
    const start = monthGridStart(anchor);
    return { start, end: addDays(start, 42) };
  }, [view, anchor]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: range.start.toISOString(),
        to: range.end.toISOString(),
      });
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const id = setInterval(() => setNowMinute(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (view === 'month' || !scrollRef.current) return;
    const hour = new Date().getHours();
    scrollRef.current.scrollTop = Math.max(0, Math.min(hour - 1, 16)) * HOUR_HEIGHT;
  }, [view]);

  // ── Keyboard ──────────────────────────────────────────────────────
  function shiftAnchor(delta: number) {
    if (view === 'day') setAnchor((a) => addDays(a, delta));
    else if (view === 'week') setAnchor((a) => addDays(a, delta * 7));
    else {
      // month — by calendar month
      setAnchor((a) => {
        const next = new Date(a);
        next.setMonth(a.getMonth() + delta);
        return next;
      });
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K opens palette anywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (paletteOpen) return;
      if (draft) return;
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 't') setAnchor(new Date());
      else if (k === 'c') {
        const now = new Date();
        const end = new Date(now); end.setHours(now.getHours() + 1);
        setDraft({ title: '', start: now, end, color: 'coral' });
      } else if (k === 'd') setView('day');
      else if (k === 'w') setView('week');
      else if (k === 'm') setView('month');
      else if (e.key === 'ArrowRight' || k === 'j') shiftAnchor(1);
      else if (e.key === 'ArrowLeft' || k === 'k') shiftAnchor(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, paletteOpen, draft]);

  function openEdit(ev: EventDTO) {
    setDraft({
      id: ev.id,
      title: ev.title,
      start: new Date(ev.start),
      end: new Date(ev.end),
      color: ev.color,
    });
  }

  function openCreateAt(d: Date) {
    const start = new Date(d);
    if (start.getHours() === 0) start.setHours(9, 0, 0, 0);
    const end = new Date(start); end.setHours(start.getHours() + 1);
    setDraft({ title: '', start, end, color: 'coral' });
  }

  // ── Drag-to-create ────────────────────────────────────────────────
  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(null as never);
  const onMouseUpRef = useRef<(e: MouseEvent) => void>(null as never);
  onMouseMoveRef.current = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const { startY, column, dayIndex } = dragRef.current;
    const rect = column.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDragGhost({ dayIndex, topPx: Math.min(startY, y), heightPx: Math.max(8, Math.abs(y - startY)) });
  };
  onMouseUpRef.current = (e: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMoveRef.current!);
    const drag = dragRef.current;
    dragRef.current = null;
    setDragGhost(null);
    if (!drag) return;
    const rect = drag.column.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const colH = rect.height;
    const startDate = yToDate(drag.day, Math.min(drag.startY, y), colH);
    let endDate = yToDate(drag.day, Math.max(drag.startY, y), colH);
    if (Math.abs(y - drag.startY) < 4) {
      endDate = new Date(startDate.getTime() + 60 * 60_000);
    } else if (endDate.getTime() - startDate.getTime() < 15 * 60_000) {
      endDate = new Date(startDate.getTime() + 15 * 60_000);
    }
    setDraft({ title: '', start: startDate, end: endDate, color: 'coral' });
  };

  function onColumnMouseDown(e: React.MouseEvent<HTMLDivElement>, dayIndex: number, day: Date) {
    if ((e.target as HTMLElement).closest(`.${styles.chip}`)) return;
    const column = e.currentTarget;
    const rect = column.getBoundingClientRect();
    const y = e.clientY - rect.top;
    dragRef.current = { dayIndex, day, startY: y, column };
    setDragGhost({ dayIndex, topPx: y, heightPx: HOUR_HEIGHT });
    const move = (ev: MouseEvent) => onMouseMoveRef.current!(ev);
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      onMouseUpRef.current!(ev);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up, { once: true });
  }

  // ── Computed values ───────────────────────────────────────────────
  const now = new Date(nowMinute);
  const headerLabel = useMemo(() => {
    if (view === 'day') {
      return anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (view === 'week') {
      const s = startOfWeek(anchor);
      return `${MONTHS_FULL[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${MONTHS_FULL[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [view, anchor]);

  const days: Date[] = useMemo(() => {
    if (view === 'day') return [startOfDay(anchor)];
    if (view === 'week') return daysInWeek(startOfWeek(anchor));
    return [];
  }, [view, anchor]);

  // ── Command palette actions ───────────────────────────────────────
  const actions: CommandAction[] = useMemo(() => [
    { id: 'today', icon: '⌖', label: 'Go to today', shortcut: 'T', run: () => setAnchor(new Date()) },
    { id: 'new', icon: '+', label: 'New event', shortcut: 'C', run: () => {
      const now = new Date(); const end = new Date(now); end.setHours(now.getHours() + 1);
      setDraft({ title: '', start: now, end, color: 'coral' });
    } },
    { id: 'day', icon: '▢', label: 'Switch to Day view', shortcut: 'D', run: () => setView('day') },
    { id: 'week', icon: '▦', label: 'Switch to Week view', shortcut: 'W', run: () => setView('week') },
    { id: 'month', icon: '▣', label: 'Switch to Month view', shortcut: 'M', run: () => setView('month') },
    { id: 'next', icon: '→', label: 'Next period', run: () => shiftAnchor(1) },
    { id: 'prev', icon: '←', label: 'Previous period', run: () => shiftAnchor(-1) },
    { id: 'scheduling', icon: '🔗', label: 'Open scheduling links', run: () => { window.location.href = '/scheduling'; } },
    { id: 'theme', icon: theme === 'dark' ? '☀' : '☾', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', run: toggleTheme },
    { id: 'signout', icon: '⏻', label: 'Sign out', run: () => signOut({ callbackUrl: '/' }) },
  ], [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandDot}>E</div>
          ElevAIte
        </div>
        <button className={styles.todayBtn} onClick={() => setAnchor(new Date())}>Today</button>
        <button className={styles.navBtn} onClick={() => shiftAnchor(-1)} aria-label="Previous">‹</button>
        <button className={styles.navBtn} onClick={() => shiftAnchor(1)} aria-label="Next">›</button>
        <div className={styles.label}>{headerLabel}</div>

        <div className={styles.viewTabs}>
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              className={`${styles.viewTab} ${view === v ? styles.viewTabActive : ''}`}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.spacer} />

        <button className={styles.cmdHint} onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
          <span>Search</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
        <Link href="/scheduling" style={{
          height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--hairline-strong)',
          background: 'var(--surface)', color: 'var(--text)',
          fontSize: 12.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
        }}>
          Scheduling
        </Link>
        <button className={styles.newBtn} onClick={() => {
          const now = new Date(); const end = new Date(now); end.setHours(now.getHours() + 1);
          setDraft({ title: '', start: now, end, color: 'coral' });
        }}>
          + New event <span className={styles.kbd}>C</span>
        </button>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button className={styles.signout} onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out" title="Sign out">
          ⏻
        </button>
      </header>

      <div className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <button className={styles.sideNew} onClick={() => {
            const now = new Date(); const end = new Date(now); end.setHours(now.getHours() + 1);
            setDraft({ title: '', start: now, end, color: 'coral' });
          }}>
            + New event
          </button>
          <MiniMonth
            anchor={anchor}
            onPickDate={(d) => { setAnchor(d); if (view === 'month') setView('day'); }}
            onChangeMonth={(delta) => setAnchor((a) => { const x = new Date(a); x.setMonth(a.getMonth() + delta); return x; })}
          />
          <div>
            <div className={styles.sideLabel}>Shortcuts</div>
            <div className={styles.sideNav}>
              <Link className={styles.sideNavItem} href="/scheduling">🔗 Scheduling links</Link>
              <button className={styles.sideNavItem} onClick={() => setPaletteOpen(true)}>
                ⌘ Command palette
              </button>
            </div>
          </div>
        </aside>

        {/* View area */}
        {view === 'month' ? (
          <MonthView
            anchor={anchor}
            events={events}
            onPickDate={(d) => { setAnchor(d); setView('day'); }}
            onPickEvent={openEdit}
          />
        ) : (
          <div className={styles.scroll} ref={scrollRef}>
            <div
              className={styles.grid}
              style={{
                ['--hour-h' as never]: `${HOUR_HEIGHT}px`,
                ['--gutter-w' as never]: '64px',
                gridTemplateColumns: `var(--gutter-w) repeat(${days.length}, 1fr)`,
              }}
            >
              <div className={styles.headGutter} />
              {days.map((d, i) => (
                <div key={i} className={styles.headCell}>
                  <div className={styles.dayName}>{WEEKDAY_SHORT[(d.getDay() + 6) % 7]}</div>
                  {isSameDay(d, now) ? (
                    <div className={styles.todayDate}>{d.getDate()}</div>
                  ) : (
                    <div className={styles.dayDate}>{d.getDate()}</div>
                  )}
                </div>
              ))}

              <div className={styles.gutter} style={{ gridRow: `2 / span 1`, height: HOURS.length * HOUR_HEIGHT }}>
                {HOURS.map((h) => (
                  <div key={h} style={{ position: 'absolute', top: h * HOUR_HEIGHT, right: 8 }} className={styles.gutterLabel}>
                    {h === 0 ? '' : formatHour(h)}
                  </div>
                ))}
              </div>

              {days.map((d, i) => {
                const isToday = isSameDay(d, now);
                const laid = layoutDayEvents(eventsForDay(events, d));
                const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
                return (
                  <div
                    key={i}
                    className={`${styles.day} ${isToday ? styles.today : ''}`}
                    style={{ gridRow: `2 / span 1`, height: HOURS.length * HOUR_HEIGHT }}
                    onMouseDown={(e) => onColumnMouseDown(e, i, d)}
                  >
                    {HOURS.map((h) => <div key={h} className={styles.hourLine} />)}
                    {laid.map((ev) => {
                      const s = new Date(ev.start); const en = new Date(ev.end);
                      const startMin = s.getHours() * 60 + s.getMinutes();
                      const endMin = en.getHours() * 60 + en.getMinutes();
                      const top = (startMin / 60) * HOUR_HEIGHT;
                      const height = Math.max(22, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                      const widthPct = 100 / ev._cols;
                      const leftPct = ev._col * widthPct;
                      return (
                        <div
                          key={ev.id}
                          className={`${styles.chip} ${styles[CHIP_COLOR_CLASS[ev.color as ChipColor]]}`}
                          style={{
                            top, height,
                            left: `calc(${leftPct}% + 3px)`,
                            width: `calc(${widthPct}% - 6px)`,
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                        >
                          <div className={styles.chipTitle}>{ev.title}</div>
                          <div className={styles.chipTime}>
                            {formatChipTime(s)}–{formatChipTime(en)}
                          </div>
                        </div>
                      );
                    })}
                    {dragGhost && dragGhost.dayIndex === i && (
                      <div className={styles.dragGhost} style={{ top: dragGhost.topPx, height: dragGhost.heightPx }} />
                    )}
                    {isToday && <div className={styles.now} style={{ top: nowTop }} />}
                  </div>
                );
              })}
            </div>

            {loading && events.length === 0 && (
              <div className={styles.empty}>Loading your {view}…</div>
            )}
          </div>
        )}
      </div>

      {draft && (
        <EventModal
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); fetchEvents(); }}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={actions}
      />
    </div>
  );
}
