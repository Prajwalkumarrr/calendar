'use client';

// Month view — classic 6×7 grid with day cells stacking event chips.

import type { ChipColor, EventDTO } from '@/lib/events';
import { addDays, isSameDay, MONTHS_FULL } from '@/lib/date';

const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function monthGridStart(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const dow = first.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const out = new Date(first);
  out.setDate(first.getDate() + offset);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function MonthView({
  anchor,
  events,
  onPickDate,
  onPickEvent,
}: {
  anchor: Date;
  events: EventDTO[];
  onPickDate: (d: Date) => void;
  onPickEvent: (e: EventDTO) => void;
}) {
  const today = new Date();
  const start = monthGridStart(anchor);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div className="mv">
      <div className="mv-head">
        {DAY_HEADERS.map((d) => <div key={d} className="mv-head-cell">{d}</div>)}
      </div>
      <div className="mv-grid">
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = isSameDay(d, today);
          const dayEvents = events
            .filter((e) => {
              const s = new Date(e.start);
              return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          const shown = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - shown.length;
          return (
            <div
              key={d.toISOString()}
              className={`mv-cell ${!inMonth ? 'mv-cell--out' : ''}`}
              onClick={() => onPickDate(d)}
            >
              <div className="mv-cell__head">
                {isToday ? (
                  <span className="mv-cell__today">{d.getDate()}</span>
                ) : (
                  <span className="mv-cell__num">{d.getDate()}</span>
                )}
                {d.getDate() === 1 && (
                  <span className="mv-cell__mon">{MONTHS_FULL[d.getMonth()].slice(0, 3)}</span>
                )}
              </div>
              <div className="mv-cell__chips">
                {shown.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className="mv-chip"
                    onClick={(e) => { e.stopPropagation(); onPickEvent(ev); }}
                    style={{
                      ['--chip-bg' as never]: `var(--chip-${ev.color as ChipColor}-bg)`,
                      ['--chip-bar' as never]: `var(--chip-${ev.color as ChipColor}-bar)`,
                      ['--chip-text' as never]: `var(--chip-${ev.color as ChipColor}-text)`,
                    } as React.CSSProperties}
                    title={ev.title}
                  >
                    <span className="mv-chip__dot" />
                    <span className="mv-chip__title">{ev.title}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <div className="mv-more">+{overflow} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .mv { display: grid; grid-template-rows: auto 1fr; height: 100%; overflow: auto; }
        .mv-head { display: grid; grid-template-columns: repeat(7, 1fr); position: sticky; top: 0; z-index: 3; background: var(--bg); border-bottom: 1px solid var(--hairline-strong); }
        .mv-head-cell { padding: 10px 12px; font-size: 10.5px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); }
        .mv-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(112px, 1fr); }
        .mv-cell { border-right: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); padding: 6px 8px 8px; display: flex; flex-direction: column; gap: 4px; background: var(--bg); cursor: pointer; min-height: 0; }
        .mv-cell--out { background: var(--surface-sunken); }
        .mv-cell--out .mv-cell__num { color: var(--text-3); }
        .mv-cell__head { display: flex; align-items: center; gap: 6px; }
        .mv-cell__num { font-family: 'Geist Mono', monospace; font-size: 12.5px; font-weight: 500; color: var(--text); font-feature-settings: 'tnum'; }
        .mv-cell__mon { font-size: 10.5px; color: var(--text-3); letter-spacing: 0.05em; text-transform: uppercase; }
        .mv-cell__today { display: inline-grid; place-items: center; width: 22px; height: 22px; background: var(--coral); color: #fff; font-size: 11.5px; font-weight: 600; border-radius: 6px; font-family: 'Geist Mono', monospace; font-feature-settings: 'tnum'; }
        .mv-cell__chips { display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: hidden; }
        .mv-chip { display: flex; align-items: center; gap: 6px; border: 0; padding: 3px 6px; border-radius: 4px; background: var(--chip-bg, var(--coral-subtle)); color: var(--chip-text, var(--text)); font-size: 11.5px; font-weight: 500; cursor: pointer; font-family: inherit; text-align: left; max-width: 100%; }
        .mv-chip__dot { width: 6px; height: 6px; background: var(--chip-bar, var(--coral)); border-radius: 50%; flex: none; }
        .mv-chip__title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .mv-more { font-size: 10.5px; color: var(--text-3); padding: 2px 6px; }
      `}</style>
    </div>
  );
}
