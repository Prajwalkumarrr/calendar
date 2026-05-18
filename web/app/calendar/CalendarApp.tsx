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
  startOfWeek,
  WEEKDAY_SHORT,
} from '@/lib/date';
import type { ChipColor, EventDTO } from '@/lib/events';
import { EventModal, type EventDraft } from './EventModal';

const HOUR_HEIGHT = 56;
const MIN_PER_PIXEL = 60 / HOUR_HEIGHT;
const SNAP_MIN = 15;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const chipColorClass: Record<ChipColor, string> = {
  coral: styles.chipCoral,
  sand: styles.chipSand,
  sage: styles.chipSage,
  slate: styles.chipSlate,
  plum: styles.chipPlum,
  ochre: styles.chipOchre,
  rose: styles.chipRose,
  stone: styles.chipStone,
};

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function formatChipTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Snap a Y pixel coordinate (within a day column) to a Date with 15-min snapping. */
function yToDate(day: Date, y: number, columnHeight: number): Date {
  const clamped = Math.max(0, Math.min(columnHeight, y));
  const minutes = Math.round((clamped * MIN_PER_PIXEL) / SNAP_MIN) * SNAP_MIN;
  const out = new Date(day);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minutes);
  return out;
}

/**
 * For an array of events on a single day, compute layout columns so overlapping
 * events sit side-by-side instead of on top of each other.
 *
 * Returns each event with `column` (0-indexed) and `columns` (total in its cluster).
 */
type LaidOutEvent = EventDTO & { _col: number; _cols: number };
function layoutDayEvents(evs: EventDTO[]): LaidOutEvent[] {
  if (evs.length === 0) return [];
  const sorted = [...evs].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Build clusters of mutually overlapping events.
  type Cluster = { events: { ev: EventDTO; col: number }[]; end: number };
  const clusters: Cluster[] = [];
  let current: Cluster | null = null;

  for (const ev of sorted) {
    const s = new Date(ev.start).getTime();
    const e = new Date(ev.end).getTime();
    if (!current || s >= current.end) {
      current = { events: [], end: e };
      clusters.push(current);
    }
    // pick the lowest column index not currently in use
    const used = new Set(
      current.events
        .filter((x) => new Date(x.ev.end).getTime() > s)
        .map((x) => x.col),
    );
    let col = 0;
    while (used.has(col)) col++;
    current.events.push({ ev, col });
    if (e > current.end) current.end = e;
  }

  const out: LaidOutEvent[] = [];
  for (const c of clusters) {
    const cols = Math.max(...c.events.map((x) => x.col)) + 1;
    for (const { ev, col } of c.events) out.push({ ...ev, _col: col, _cols: cols });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────

export function CalendarApp() {
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [nowMinute, setNowMinute] = useState<number>(() => Date.now());
  const [dragGhost, setDragGhost] = useState<{ dayIndex: number; topPx: number; heightPx: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dayIndex: number; day: Date; startY: number; column: HTMLDivElement } | null>(null);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor), [anchor]);
  const days = useMemo(() => daysInWeek(weekStart), [weekStart]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: weekStart.toISOString(), to: weekEnd.toISOString() });
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const id = setInterval(() => setNowMinute(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const hour = new Date().getHours();
    scrollRef.current.scrollTop = Math.max(0, Math.min(hour - 1, 16)) * HOUR_HEIGHT;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 't' || e.key === 'T') setAnchor(new Date());
      else if (e.key === 'c' || e.key === 'C') {
        const now = new Date();
        const end = new Date(now); end.setHours(now.getHours() + 1);
        setDraft({ title: '', start: now, end, color: 'coral' });
      } else if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') setAnchor((a) => addDays(a, 7));
      else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') setAnchor((a) => addDays(a, -7));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openEdit(ev: EventDTO) {
    setDraft({
      id: ev.id,
      title: ev.title,
      start: new Date(ev.start),
      end: new Date(ev.end),
      color: ev.color,
    });
  }

  // ── Drag-to-create ───────────────────────────────────────────────
  function onColumnMouseDown(e: React.MouseEvent<HTMLDivElement>, dayIndex: number, day: Date) {
    // Skip if click was on a chip child
    if ((e.target as HTMLElement).closest(`.${styles.chip}`)) return;
    const column = e.currentTarget;
    const rect = column.getBoundingClientRect();
    const y = e.clientY - rect.top;
    dragRef.current = { dayIndex, day, startY: y, column };
    setDragGhost({ dayIndex, topPx: y, heightPx: HOUR_HEIGHT });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragRef.current) return;
    const { startY, column, dayIndex } = dragRef.current;
    const rect = column.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const top = Math.min(startY, y);
    const height = Math.max(8, Math.abs(y - startY));
    setDragGhost({ dayIndex, topPx: top, heightPx: height });
  }

  function onMouseUp(e: MouseEvent) {
    window.removeEventListener('mousemove', onMouseMove);
    const drag = dragRef.current;
    dragRef.current = null;
    setDragGhost(null);
    if (!drag) return;
    const rect = drag.column.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const colH = rect.height;
    const startDate = yToDate(drag.day, Math.min(drag.startY, y), colH);
    let endDate = yToDate(drag.day, Math.max(drag.startY, y), colH);
    // If the drag was effectively a click (no movement), default to 1 hour
    if (Math.abs(y - drag.startY) < 4) {
      endDate = new Date(startDate.getTime() + 60 * 60_000);
    } else if (endDate.getTime() - startDate.getTime() < 15 * 60_000) {
      endDate = new Date(startDate.getTime() + 15 * 60_000);
    }
    setDraft({ title: '', start: startDate, end: endDate, color: 'coral' });
  }

  const now = new Date(nowMinute);
  const label = `${MONTHS_FULL[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandDot}>E</div>
          ElevAIte
        </div>
        <button className={styles.todayBtn} onClick={() => setAnchor(new Date())}>Today</button>
        <button className={styles.navBtn} onClick={() => setAnchor((a) => addDays(a, -7))} aria-label="Previous week">‹</button>
        <button className={styles.navBtn} onClick={() => setAnchor((a) => addDays(a, 7))} aria-label="Next week">›</button>
        <div className={styles.label}>{label}</div>
        <div className={styles.spacer} />
        <Link
          href="/scheduling"
          style={{
            height: 32, padding: '0 12px',
            borderRadius: 8, border: '1px solid var(--hairline-strong)',
            background: 'var(--surface)', color: 'var(--text)',
            fontSize: 12.5, fontWeight: 500,
            display: 'inline-flex', alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          Scheduling
        </Link>
        <button
          className={styles.newBtn}
          onClick={() => {
            const now = new Date();
            const end = new Date(now); end.setHours(now.getHours() + 1);
            setDraft({ title: '', start: now, end, color: 'coral' });
          }}
        >
          + New event <span className={styles.kbd}>C</span>
        </button>
        <button
          className={styles.signout}
          onClick={() => signOut({ callbackUrl: '/' })}
          aria-label="Sign out"
          title="Sign out"
        >
          ⏻
        </button>
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.grid} style={{ ['--hour-h' as never]: `${HOUR_HEIGHT}px`, ['--gutter-w' as never]: '64px' }}>
          {/* Header row */}
          <div className={styles.headGutter} />
          {days.map((d, i) => (
            <div key={i} className={styles.headCell}>
              <div className={styles.dayName}>{WEEKDAY_SHORT[i]}</div>
              {isSameDay(d, now) ? (
                <div className={styles.todayDate}>{d.getDate()}</div>
              ) : (
                <div className={styles.dayDate}>{d.getDate()}</div>
              )}
            </div>
          ))}

          {/* Time gutter */}
          <div className={styles.gutter} style={{ gridRow: `2 / span 1`, height: HOURS.length * HOUR_HEIGHT }}>
            {HOURS.map((h) => (
              <div key={h} style={{ position: 'absolute', top: h * HOUR_HEIGHT, right: 8 }} className={styles.gutterLabel}>
                {h === 0 ? '' : formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, i) => {
            const isToday = isSameDay(d, now);
            const dayEvents = events.filter((e) => {
              const s = new Date(e.start);
              return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
            });
            const laid = layoutDayEvents(dayEvents);
            const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;

            return (
              <div
                key={i}
                className={`${styles.day} ${isToday ? styles.today : ''}`}
                style={{ gridRow: `2 / span 1`, height: HOURS.length * HOUR_HEIGHT }}
                onMouseDown={(e) => onColumnMouseDown(e, i, d)}
              >
                {HOURS.map((h) => (
                  <div key={h} className={styles.hourLine} />
                ))}

                {laid.map((ev) => {
                  const s = new Date(ev.start);
                  const en = new Date(ev.end);
                  const startMin = s.getHours() * 60 + s.getMinutes();
                  const endMin = en.getHours() * 60 + en.getMinutes();
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max(22, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                  const widthPct = 100 / ev._cols;
                  const leftPct = ev._col * widthPct;
                  return (
                    <div
                      key={ev.id}
                      className={`${styles.chip} ${chipColorClass[ev.color]}`}
                      style={{
                        top,
                        height,
                        left: `calc(${leftPct}% + 3px)`,
                        width: `calc(${widthPct}% - 6px)`,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(ev);
                      }}
                    >
                      <div className={styles.chipTitle}>{ev.title}</div>
                      <div className={styles.chipTime}>
                        {formatChipTime(s)}–{formatChipTime(en)}
                      </div>
                    </div>
                  );
                })}

                {dragGhost && dragGhost.dayIndex === i && (
                  <div
                    className={styles.dragGhost}
                    style={{ top: dragGhost.topPx, height: dragGhost.heightPx }}
                  />
                )}

                {isToday && <div className={styles.now} style={{ top: nowTop }} />}
              </div>
            );
          })}
        </div>

        {loading && events.length === 0 && (
          <div className={styles.empty}>Loading your week…</div>
        )}
      </div>

      {draft && (
        <EventModal
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}
