// data.jsx — realistic mixed week for an ElevAIte founder who's still part-student.
// Events are relative to a fixed "today" = Wednesday May 20, 2026.
//
// Times use 24h decimal hours: 9.5 = 9:30am, 17.25 = 5:15pm.
// day: 0 = Monday … 6 = Sunday (Mon-start week).
// Each event: { id, day, start, end, title, calendar (id), color, loc, conf, attendees, allDay }

const CHIP_COLORS = ['coral', 'sand', 'sage', 'slate', 'plum', 'ochre', 'rose', 'stone'];

const CALENDARS = [
  { id: 'work',     name: 'ElevAIte (Work)',      color: 'coral',  group: 'Personal',  account: 'prem@elevaite.so',  visible: true },
  { id: 'personal', name: 'Personal',             color: 'sage',   group: 'Personal',  account: 'prem@elevaite.so',  visible: true },
  { id: 'school',   name: 'Stanford CS',          color: 'slate',  group: 'School',    account: 'prem@stanford.edu', visible: true },
  { id: 'classes',  name: 'Lectures & Office Hrs',color: 'plum',   group: 'School',    account: 'prem@stanford.edu', visible: true },
  { id: 'family',   name: 'Family',               color: 'rose',   group: 'Shared',    account: 'family@icloud',     visible: true },
  { id: 'gym',      name: 'Fitness',              color: 'ochre',  group: 'Personal',  account: 'prem@elevaite.so',  visible: false },
  { id: 'holidays', name: 'US Holidays',          color: 'stone',  group: 'Subscribed',account: 'gcal',              visible: true },
];

const EVENTS = [
  // ─── Monday May 18 ───
  { id: 'e1',  day: 0, start: 9.0,  end: 9.25, title: 'Daily standup',           calendar: 'work',     color: 'coral',  loc: 'Meet',          conf: 'meet',  attendees: 6 },
  { id: 'e2',  day: 0, start: 10.5, end: 11.0, title: '1:1 with Maya',           calendar: 'work',     color: 'coral',  loc: 'Zoom',          conf: 'zoom',  attendees: 2 },
  { id: 'e3',  day: 0, start: 11.5, end: 12.5, title: 'Design review · auth flow', calendar: 'work',   color: 'plum',   loc: 'Figma',         conf: 'meet',  attendees: 4 },
  { id: 'e4',  day: 0, start: 12.5, end: 13.5, title: 'Lunch',                   calendar: 'personal', color: 'sage',   loc: 'Coupa Café',    conf: null,    attendees: 0 },
  { id: 'e5',  day: 0, start: 14.0, end: 16.5, title: 'Focus · ship the booking page',calendar:'work', color: 'sand',   loc: '',              conf: null,    attendees: 0 },
  { id: 'e6',  day: 0, start: 17.0, end: 18.0, title: 'Investor sync — Acre',    calendar: 'work',     color: 'coral',  loc: 'Zoom',          conf: 'zoom',  attendees: 3 },

  // ─── Tuesday May 19 ───
  { id: 'e7',  day: 1, start: 9.0,  end: 9.25, title: 'Daily standup',           calendar: 'work',     color: 'coral',  loc: 'Meet',          conf: 'meet',  attendees: 6 },
  { id: 'e8',  day: 1, start: 10.0, end: 10.75,title: 'User interview · Priya',  calendar: 'work',     color: 'ochre',  loc: 'Zoom',          conf: 'zoom',  attendees: 2 },
  { id: 'e9',  day: 1, start: 11.0, end: 12.0, title: 'Eng weekly',              calendar: 'work',     color: 'coral',  loc: 'Meet',          conf: 'meet',  attendees: 8 },
  { id: 'e10', day: 1, start: 12.25,end: 13.0, title: 'Lunch w/ Jordan',         calendar: 'personal', color: 'sage',   loc: 'CoHo',          conf: null,    attendees: 0 },
  { id: 'e11', day: 1, start: 13.5, end: 15.0, title: 'CS 224N — NLP',           calendar: 'classes',  color: 'plum',   loc: 'Gates B01',     conf: null,    attendees: 0 },
  { id: 'e12', day: 1, start: 15.5, end: 16.5, title: 'Demo prep w/ Sam',        calendar: 'work',     color: 'coral',  loc: 'Office',        conf: null,    attendees: 2 },
  { id: 'e13', day: 1, start: 18.0, end: 19.0, title: 'Climbing — Planet Granite', calendar: 'gym',    color: 'ochre',  loc: 'Belmont',       conf: null,    attendees: 0 },

  // ─── Wednesday May 20 — TODAY ───
  { id: 'e14', day: 2, start: 9.0,  end: 9.25, title: 'Daily standup',           calendar: 'work',     color: 'coral',  loc: 'Meet',          conf: 'meet',  attendees: 6 },
  { id: 'e15', day: 2, start: 10.0, end: 10.75,title: 'Coffee w/ Jamie',         calendar: 'personal', color: 'sage',   loc: 'Verve',         conf: null,    attendees: 0 },
  { id: 'e16', day: 2, start: 11.5, end: 12.5, title: 'Roadmap review · Q3',     calendar: 'work',     color: 'coral',  loc: 'Office',        conf: 'meet',  attendees: 5 },
  { id: 'e17', day: 2, start: 12.5, end: 13.5, title: 'Team lunch',              calendar: 'work',     color: 'sage',   loc: 'Office kitchen',conf: null,    attendees: 9 },
  { id: 'e18', day: 2, start: 14.0, end: 16.0, title: 'Focus · calendar grid',   calendar: 'work',     color: 'sand',   loc: '',              conf: null,    attendees: 0 },
  { id: 'e19', day: 2, start: 16.5, end: 17.0, title: '1:1 with Sam',            calendar: 'work',     color: 'coral',  loc: 'Office',        conf: null,    attendees: 2 },
  { id: 'e20', day: 2, start: 18.5, end: 20.0, title: 'Founders drinks · YC',    calendar: 'work',     color: 'plum',   loc: 'Mission SF',    conf: null,    attendees: 12 },

  // ─── Thursday May 21 ───
  { id: 'e21', day: 3, start: 8.0,  end: 9.0,  title: 'Yoga · Wanderlust',       calendar: 'gym',      color: 'ochre',  loc: 'Palo Alto',     conf: null,    attendees: 0 },
  { id: 'e22', day: 3, start: 10.0, end: 10.25,title: 'Daily standup',           calendar: 'work',     color: 'coral',  loc: 'Meet',          conf: 'meet',  attendees: 6 },
  { id: 'e23', day: 3, start: 11.0, end: 12.0, title: 'User research synthesis', calendar: 'work',     color: 'ochre',  loc: 'Office',        conf: null,    attendees: 3 },
  { id: 'e24', day: 3, start: 13.0, end: 14.0, title: 'Lunch · solo',            calendar: 'personal', color: 'sage',   loc: 'Tin Pot',       conf: null,    attendees: 0 },
  { id: 'e25', day: 3, start: 14.0, end: 15.5, title: 'CS 224N — office hours',  calendar: 'classes',  color: 'plum',   loc: 'Gates 392',     conf: null,    attendees: 0 },
  { id: 'e26', day: 3, start: 16.0, end: 17.5, title: 'Design crit · panel UX',  calendar: 'work',     color: 'coral',  loc: 'Figma',         conf: 'meet',  attendees: 4 },
  { id: 'e27', day: 3, start: 19.0, end: 21.5, title: 'Movie night',             calendar: 'personal', color: 'rose',   loc: 'Aquarius',      conf: null,    attendees: 2 },

  // ─── Friday May 22 ───
  { id: 'e28', day: 4, start: 9.0,  end: 9.25, title: 'Daily standup',           calendar: 'work',     color: 'coral',  loc: 'Meet',          conf: 'meet',  attendees: 6 },
  { id: 'e29', day: 4, start: 10.5, end: 11.5, title: 'All-hands',               calendar: 'work',     color: 'coral',  loc: 'Office',        conf: 'meet',  attendees: 12 },
  { id: 'e30', day: 4, start: 12.0, end: 13.0, title: 'Lunch · team',            calendar: 'work',     color: 'sage',   loc: 'Loop',          conf: null,    attendees: 9 },
  { id: 'e31', day: 4, start: 13.0, end: 14.0, title: 'Ship review',             calendar: 'work',     color: 'coral',  loc: 'Office',        conf: null,    attendees: 5 },
  { id: 'e32', day: 4, start: 14.5, end: 17.0, title: 'Focus · investor deck',   calendar: 'work',     color: 'sand',   loc: '',              conf: null,    attendees: 0 },
  { id: 'e33', day: 4, start: 17.5, end: 19.5, title: 'Happy hour',              calendar: 'personal', color: 'rose',   loc: 'Trick Dog',     conf: null,    attendees: 6 },

  // ─── Saturday May 23 ───
  { id: 'e34', day: 5, start: 10.0, end: 11.5, title: 'Brunch w/ Alex',          calendar: 'personal', color: 'sage',   loc: 'Plow',          conf: null,    attendees: 2 },
  { id: 'e35', day: 5, start: 14.0, end: 17.0, title: 'AI hackathon prep',       calendar: 'work',     color: 'sand',   loc: 'Home',          conf: null,    attendees: 0 },
  { id: 'e36', day: 5, start: 19.0, end: 21.0, title: 'Dinner · Linnea',         calendar: 'personal', color: 'rose',   loc: 'Lazy Bear',     conf: null,    attendees: 2 },

  // ─── Sunday May 24 ───
  { id: 'e37', day: 6, start: 11.0, end: 12.5, title: 'Weekly planning',         calendar: 'personal', color: 'slate',  loc: 'Home',          conf: null,    attendees: 0 },
  { id: 'e38', day: 6, start: 15.0, end: 16.0, title: 'Family call',             calendar: 'family',   color: 'rose',   loc: 'Zoom',          conf: 'zoom',   attendees: 4 },
  { id: 'e39', day: 6, start: 19.0, end: 20.0, title: 'Sunday reset',            calendar: 'personal', color: 'sage',   loc: 'Home',          conf: null,    attendees: 0 },

  // ─── All-day ───
  { id: 'ad1', day: 1, allDay: true, title: 'Q3 planning week',                  calendar: 'work',     color: 'plum' },
  { id: 'ad2', day: 2, allDay: true, title: 'Q3 planning week',                  calendar: 'work',     color: 'plum' },
  { id: 'ad3', day: 3, allDay: true, title: 'Q3 planning week',                  calendar: 'work',     color: 'plum' },
  { id: 'ad4', day: 3, allDay: true, title: 'Anna\u2019s birthday',              calendar: 'family',   color: 'rose' },
  { id: 'ad5', day: 0, allDay: true, title: 'Victoria Day (CA)',                 calendar: 'holidays', color: 'stone' },
];

// Time zones for sidebar strip
const TZONES = [
  { name: 'Palo Alto',  tz: 'America/Los_Angeles', offset: 'PT'  },
  { name: 'NYC',        tz: 'America/New_York',    offset: 'ET'  },
  { name: 'London',     tz: 'Europe/London',       offset: 'BST' },
  { name: 'Singapore',  tz: 'Asia/Singapore',      offset: 'SGT' },
];

// Day labels (Mon-first)
const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NUMS  = [18, 19, 20, 21, 22, 23, 24];      // May 18–24, 2026
const TODAY_IDX = 2;                                  // Wednesday

// Hours to display (6am — 11pm)
const HOUR_START = 6;
const HOUR_END   = 23;

// Convenience helpers
const fmtTime = (h) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hh12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hh12}:${mm.toString().padStart(2,'0')} ${period}`;
};
const fmtTime24 = (h) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
};
const fmtRange = (s, e) => `${fmtTime(s)} – ${fmtTime(e)}`;

Object.assign(window, {
  CHIP_COLORS, CALENDARS, EVENTS, TZONES,
  DAY_NAMES, DAY_NUMS, TODAY_IDX, HOUR_START, HOUR_END,
  fmtTime, fmtTime24, fmtRange,
});
