// Pure client-safe utility — no server/mongodb imports.
// Calculates the "golden hours" window: the intersection of working hours
// for all members of a group, expressed in the host's local timezone.

export type GoldenMember = {
  name: string;
  tz: string;      // IANA timezone
  workStart: number; // decimal hours in their local time (e.g. 9 = 9:00 am)
  workEnd: number;
};

export type GoldenWindow = {
  start: number;  // decimal hours in host's local time
  end: number;
};

/**
 * Returns the UTC offset (in decimal hours) for a given IANA timezone on a given date.
 * e.g. IST (UTC+5:30) → 5.5,  EST (UTC-5) → -5
 */
function tzOffsetHours(tz: string, date: Date): number {
  try {
    // toLocaleString trick: creates a "fake" local Date whose wall-clock fields
    // match what tz shows — the difference of two such fakes = UTC offset difference.
    const tzStr = date.toLocaleString('en-US', { timeZone: tz });
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3_600_000;
  } catch {
    return 0;
  }
}

/**
 * Calculate the golden hours window for a group of members on a given date.
 *
 * @param hostTz    IANA timezone of the viewer (or 'local' for browser TZ)
 * @param hostWorkStart  host's own work start in their local time (decimal hours)
 * @param hostWorkEnd    host's own work end in their local time (decimal hours)
 * @param members   array of team members with their tz + work hours
 * @param date      the date to calculate for (affects DST)
 * @returns  { start, end } in host's local decimal hours, or null if no overlap
 */
export function calculateGoldenHours(
  hostTz: string,
  hostWorkStart: number,
  hostWorkEnd: number,
  members: GoldenMember[],
  date: Date = new Date(),
): GoldenWindow | null {
  if (members.length === 0) return null;

  const effectiveTz = hostTz === 'local'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : hostTz;

  const hostOffset = tzOffsetHours(effectiveTz, date);

  // Start with the host's own working window
  let winStart = hostWorkStart;
  let winEnd = hostWorkEnd;

  for (const m of members) {
    const mOffset = tzOffsetHours(m.tz, date);
    // Positive diff means host is ahead of member (e.g. IST ahead of CET)
    const diff = hostOffset - mOffset;
    // Member's work hours expressed in host's local time
    const mStartInHost = m.workStart + diff;
    const mEndInHost = m.workEnd + diff;

    winStart = Math.max(winStart, mStartInHost);
    winEnd = Math.min(winEnd, mEndInHost);
    if (winStart >= winEnd) return null;
  }

  return winStart < winEnd ? { start: winStart, end: winEnd } : null;
}

/** Format a decimal hour as "9:30 AM" / "14:00" */
export function fmtDecimalHour(h: number, use24 = false): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  if (use24) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12} ${period}` : `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}
