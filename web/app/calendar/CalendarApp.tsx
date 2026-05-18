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

export function CalendarApp() {
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [nowMinute, setNowMinute] = useState<number>(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor), [anchor]);
  const days = useMemo(() => daysInWeek(weekStart), [weekStart]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
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
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // tick every minute for the now-line
  useEffect(() => {
    const id = setInterval(() => setNowMinute(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current hour (or 8am if it's late at night) on first paint
  useEffect(() => {
    if (!scrollRef.current) return;
    const hour = new Date().getHours();
    const targetHour = Math.max(0, Math.min(hour - 1, 16)); // show context above current hour
    scrollRef.current.scrollTop = targetHour * HOUR_HEIGHT;
  }, []);

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 't' || e.key === 'T') {
        setAnchor(new Date());
      } else if (e.key === 'c' || e.key === 'C') {
        const now = new Date();
        const end = new Date(now);
        end.setHours(now.getHours() + 1);
        setDraft({ title: '', start: now, end, color: 'coral' });
      } else if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') {
        setAnchor((a) => addDays(a, 7));
      } else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') {
        setAnchor((a) => addDays(a, -7));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openCreate(day: Date, hour: number) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    setDraft({ title: '', start, end, color: 'coral' });
  }

  function openEdit(ev: EventDTO) {
    setDraft({
      id: ev.id,
      title: ev.title,
      start: new Date(ev.start),
      end: new Date(ev.end),
      color: ev.color,
    });
  }

  const now = new Date(nowMinute);
  const todayIndex = days.findIndex((d) => isSameDay(d, now));

  const label = `${MONTHS_FULL[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandDot}>E</div>
          ElevAIte
        </div>
        <button className={styles.todayBtn} onClick={() => setAnchor(new Date())}>
          Today
        </button>
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
            const end = new Date(now);
            end.setHours(now.getHours() + 1);
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

          {/* Time gutter (rendered as a single tall column) */}
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
            const showNow = isToday;
            const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;

            return (
              <div
                key={i}
                className={`${styles.day} ${isToday ? styles.today : ''}`}
                style={{ gridRow: `2 / span 1`, height: HOURS.length * HOUR_HEIGHT }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_HEIGHT)));
                  openCreate(d, hour);
                }}
              >
                {HOURS.map((h) => (
                  <div key={h} className={styles.hourLine} />
                ))}

                {dayEvents.map((ev) => {
                  const s = new Date(ev.start);
                  const en = new Date(ev.end);
                  const startMin = s.getHours() * 60 + s.getMinutes();
                  const endMin = en.getHours() * 60 + en.getMinutes();
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max(22, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                  return (
                    <div
                      key={ev.id}
                      className={`${styles.chip} ${chipColorClass[ev.color]}`}
                      style={{ top, height }}
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

                {showNow && (
                  <div className={styles.now} style={{ top: nowTop }} />
                )}
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
