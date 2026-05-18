'use client';

import { useMemo } from 'react';
import styles from './calendar.module.css';
import { addDays, isSameDay, MONTHS_FULL, WEEKDAY_SHORT } from '@/lib/date';
import { monthGridStart, eventsForDay, CHIP_COLOR_CLASS } from './calendar-utils';
import type { EventDTO } from '@/lib/events';

type Props = {
  anchor: Date;
  events: EventDTO[];
  onPickDate: (d: Date) => void;
  onPickEvent: (ev: EventDTO) => void;
};

export function MonthView({ anchor, events, onPickDate, onPickEvent }: Props) {
  const today = new Date();
  const cells = useMemo(() => {
    const start = monthGridStart(anchor);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor]);

  return (
    <div className={styles.monthShell}>
      <div className={styles.monthHead}>
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className={styles.monthDow}>{d}</div>
        ))}
      </div>
      <div className={styles.monthGrid}>
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = isSameDay(d, today);
          const dayEvents = eventsForDay(events, d).sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
          );
          const shown = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - shown.length;
          return (
            <div
              key={d.toISOString()}
              className={[styles.monthCell, !inMonth ? styles.monthCellOut : ''].join(' ')}
              onClick={() => onPickDate(d)}
            >
              <div className={styles.monthCellHead}>
                {isToday ? (
                  <span className={styles.monthTodayDot}>{d.getDate()}</span>
                ) : (
                  <span className={styles.monthDateNum}>{d.getDate()}</span>
                )}
                {d.getDate() === 1 && (
                  <span className={styles.monthDateMon}>{MONTHS_FULL[d.getMonth()].slice(0, 3)}</span>
                )}
              </div>
              <div className={styles.monthChips}>
                {shown.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className={[styles.monthChip, styles[CHIP_COLOR_CLASS[ev.color]]].join(' ')}
                    onClick={(e) => { e.stopPropagation(); onPickEvent(ev); }}
                    title={ev.title}
                  >
                    <span className={styles.monthChipDot} />
                    <span className={styles.monthChipTitle}>{ev.title}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <div className={styles.monthMore}>+{overflow} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
