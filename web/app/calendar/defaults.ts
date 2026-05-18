// Default visual data — calendars, time zones. These will become user settings later.

export type CalendarMeta = {
  id: string;
  name: string;
  color: 'coral' | 'sand' | 'sage' | 'slate' | 'plum' | 'ochre' | 'rose' | 'stone';
  group: string;
  account: string;
  visible: boolean;
};

export const DEFAULT_CALENDARS: CalendarMeta[] = [
  { id: 'work',     name: 'ElevAIte (Work)',       color: 'coral', group: 'Personal', account: 'you@elevaite.so', visible: true },
  { id: 'personal', name: 'Personal',              color: 'sage',  group: 'Personal', account: 'you@elevaite.so', visible: true },
  { id: 'school',   name: 'Class schedule',        color: 'slate', group: 'School',   account: 'you@school.edu',  visible: true },
  { id: 'family',   name: 'Family',                color: 'rose',  group: 'Shared',   account: 'family@icloud',   visible: true },
  { id: 'gym',      name: 'Fitness',               color: 'ochre', group: 'Personal', account: 'you@elevaite.so', visible: false },
  { id: 'holidays', name: 'Holidays',              color: 'stone', group: 'Subscribed', account: 'gcal',          visible: true },
];

export const DEFAULT_TZONES = [
  { name: 'Local',     tz: 'local',                offset: '' },
  { name: 'NYC',       tz: 'America/New_York',     offset: 'ET' },
  { name: 'London',    tz: 'Europe/London',        offset: 'BST' },
  { name: 'Singapore', tz: 'Asia/Singapore',       offset: 'SGT' },
];

export const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const HOUR_START = 6;
export const HOUR_END = 23;

export const fmtTime = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hh12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hh12}:${mm.toString().padStart(2, '0')} ${period}`;
};
export const fmtTime24 = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};
