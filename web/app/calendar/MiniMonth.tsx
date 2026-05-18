'use client';

import { useMemo } from 'react';
import styles from './calendar.module.css';
import { addDays, isSameDay, MONTHS_FULL, WEEKDAY_SHORT } from '@/lib/date';
import { monthGridStart } from './calendar-utils';

type Props = {
  anchor: Date;
  onPickDate: (d: Date) => void;
  onChangeMonth: (delta: number) => void;
};

export function MiniMonth({ anchor, onPickDate, onChangeMonth }: Props) {
  const today = new Date();
  const cells = useMemo(() => {
    const start = monthGridStart(anchor);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor]);
  const monthLabel = `${MONTHS_FULL[anchor.getMonth()]} ${anchor.getFullYear()}`;

  return (
    <div className={styles.mini}>
      <div className={styles.miniHead}>
        <span>{monthLabel}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className={styles.miniNav}
            onClick={() => onChangeMonth(-1)}
            aria-label="Previous month"
          >‹</button>
          <button
            className={styles.miniNav}
            onClick={() => onChangeMonth(1)}
            aria-label="Next month"
          >›</button>
        </div>
      </div>
      <div className={styles.miniGrid}>
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className={styles.miniDow}>{d[0]}</div>
        ))}
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = isSameDay(d, today);
          const isAnchor = isSameDay(d, anchor);
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={[
                styles.miniDay,
                !inMonth ? styles.miniDayOut : '',
                isToday ? styles.miniDayToday : '',
                isAnchor ? styles.miniDayAnchor : '',
              ].join(' ')}
              onClick={() => onPickDate(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
