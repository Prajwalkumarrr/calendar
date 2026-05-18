/** Date helpers — week start is configurable, local time. */

export type WeekStart = 'mon' | 'sun' | 'sat';

function startDayOfWeek(ws: WeekStart): number {
  // The getDay() value where the week starts (0=Sun, 1=Mon, 6=Sat).
  return ws === 'mon' ? 1 : ws === 'sat' ? 6 : 0;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d: Date, weekStart: WeekStart = 'mon'): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day - startDayOfWeek(weekStart) + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

export function endOfWeek(d: Date, weekStart: WeekStart = 'mon'): Date {
  const start = startOfWeek(d, weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end; // exclusive
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function daysInWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format a Date as "yyyy-mm-ddThh:mm" for <input type="datetime-local">. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local input as a Date in the browser's local TZ. */
export function fromLocalInput(s: string): Date {
  return new Date(s);
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
