import type { ChipColor, EventDTO } from '@/lib/events';

export const HOUR_HEIGHT = 56;
export const MIN_PER_PIXEL = 60 / HOUR_HEIGHT;
export const SNAP_MIN = 15;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const CHIP_COLOR_CLASS: Record<ChipColor, string> = {
  coral: 'chipCoral',
  sand: 'chipSand',
  sage: 'chipSage',
  slate: 'chipSlate',
  plum: 'chipPlum',
  ochre: 'chipOchre',
  rose: 'chipRose',
  stone: 'chipStone',
};

export function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

export function formatChipTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function yToDate(day: Date, y: number, columnHeight: number): Date {
  const clamped = Math.max(0, Math.min(columnHeight, y));
  const minutes = Math.round((clamped * MIN_PER_PIXEL) / SNAP_MIN) * SNAP_MIN;
  const out = new Date(day);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minutes);
  return out;
}

export type LaidOutEvent = EventDTO & { _col: number; _cols: number };

export function layoutDayEvents(evs: EventDTO[]): LaidOutEvent[] {
  if (evs.length === 0) return [];
  const sorted = [...evs].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
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
    const used = new Set(
      current.events.filter((x) => new Date(x.ev.end).getTime() > s).map((x) => x.col),
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

export function eventsForDay(events: EventDTO[], day: Date): EventDTO[] {
  return events.filter((e) => {
    const s = new Date(e.start);
    return (
      s.getFullYear() === day.getFullYear() &&
      s.getMonth() === day.getMonth() &&
      s.getDate() === day.getDate()
    );
  });
}

/** Returns the start of the month, aligned to the previous Monday for grid display. */
export function monthGridStart(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const dow = first.getDay(); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  const out = new Date(first);
  out.setDate(first.getDate() + offset);
  out.setHours(0, 0, 0, 0);
  return out;
}
