import { listEventsInRange } from './events';

export type BusyRange = { start: Date; end: Date };

export type Slot = {
  start: string; // ISO
  end: string;   // ISO
  conflicts: string[]; // userIds who have a conflict (empty = all free)
};

export type FindTimeInput = {
  memberIds: string[];
  durationMin: number;
  /** Inclusive start (00:00 local of from). */
  from: Date;
  /** Exclusive end (00:00 local of to). */
  to: Date;
  /** "HH:MM" 24h, default "09:00" */
  workdayStart?: string;
  /** "HH:MM" 24h, default "17:00" */
  workdayEnd?: string;
  /** Skip Sat/Sun. Default true. */
  weekdaysOnly?: boolean;
  /** Step size for candidate slot starts, default 30. */
  stepMin?: number;
  /** Cap on returned slots, default 30. */
  maxSlots?: number;
};

function parseHHMM(s: string): { h: number; m: number } {
  const [h, m] = s.split(':').map((n) => parseInt(n, 10));
  return { h: h || 0, m: m || 0 };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Build a per-user list of busy ranges in [from, to).
 * We treat any event (recurring or not) that returns from listEventsInRange as busy.
 */
async function loadBusyByUser(
  memberIds: string[],
  from: Date,
  to: Date,
): Promise<Record<string, BusyRange[]>> {
  const map: Record<string, BusyRange[]> = {};
  await Promise.all(
    memberIds.map(async (uid) => {
      const events = await listEventsInRange(uid, from, to);
      map[uid] = events.map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));
    }),
  );
  return map;
}

/** Generate candidate slots and rank by number of conflicting members. */
export async function findTime(input: FindTimeInput): Promise<Slot[]> {
  const {
    memberIds,
    durationMin,
    from,
    to,
    workdayStart = '09:00',
    workdayEnd = '17:00',
    weekdaysOnly = true,
    stepMin = 30,
    maxSlots = 30,
  } = input;

  if (memberIds.length === 0) return [];
  if (durationMin <= 0 || durationMin > 480) return [];

  const busy = await loadBusyByUser(memberIds, from, to);
  const work = parseHHMM(workdayStart);
  const workEnd = parseHHMM(workdayEnd);

  const out: Slot[] = [];
  const now = new Date();
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);

  while (day < to) {
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (!weekdaysOnly || !isWeekend) {
      // Walk slots within the work window
      const dayStart = new Date(day); dayStart.setHours(work.h, work.m, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(workEnd.h, workEnd.m, 0, 0);
      let cursor = new Date(dayStart);
      while (cursor < dayEnd) {
        const slotEnd = new Date(cursor.getTime() + durationMin * 60_000);
        if (slotEnd > dayEnd) break;
        if (slotEnd <= now) {
          cursor = new Date(cursor.getTime() + stepMin * 60_000);
          continue;
        }
        const conflicts: string[] = [];
        for (const uid of memberIds) {
          const userBusy = busy[uid] ?? [];
          if (userBusy.some((b) => overlaps(cursor, slotEnd, b.start, b.end))) {
            conflicts.push(uid);
          }
        }
        out.push({
          start: cursor.toISOString(),
          end: slotEnd.toISOString(),
          conflicts,
        });
        cursor = new Date(cursor.getTime() + stepMin * 60_000);
      }
    }
    day.setDate(day.getDate() + 1);
  }

  // Sort: zero-conflict first, then by fewest conflicts, then by earliest start
  out.sort((a, b) => {
    if (a.conflicts.length !== b.conflicts.length) return a.conflicts.length - b.conflicts.length;
    return a.start.localeCompare(b.start);
  });

  return out.slice(0, maxSlots);
}
