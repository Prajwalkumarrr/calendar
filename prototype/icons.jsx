// icons.jsx — small inline icon set, all 16-stroke, current color
// Exposed on window for cross-script use.

const Icon = ({ children, size = 16, stroke = 1.5, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const IconChevronLeft  = (p) => <Icon {...p}><path d="M15 18l-6-6 6-6"/></Icon>;
const IconChevronRight = (p) => <Icon {...p}><path d="M9 18l6-6-6-6"/></Icon>;
const IconChevronDown  = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
const IconSearch       = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>;
const IconPlus         = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconX            = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>;
const IconClock        = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconMapPin       = (p) => <Icon {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></Icon>;
const IconVideo        = (p) => <Icon {...p}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></Icon>;
const IconUsers        = (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></Icon>;
const IconLink         = (p) => <Icon {...p}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></Icon>;
const IconBell         = (p) => <Icon {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></Icon>;
const IconEye          = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IconEyeOff       = (p) => <Icon {...p}><path d="M17.94 17.94A10.04 10.04 0 0112 19c-6.5 0-10-7-10-7a18.05 18.05 0 014.06-5.06"/><path d="M9.9 4.24A9.95 9.95 0 0112 4c6.5 0 10 7 10 7a17.93 17.93 0 01-2.16 3.29"/><path d="M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></Icon>;
const IconTrash        = (p) => <Icon {...p}><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></Icon>;
const IconSettings     = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></Icon>;
const IconCalendar     = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>;
const IconArrowRight   = (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>;
const IconCommand      = (p) => <Icon {...p}><path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z"/></Icon>;
const IconCornerDown   = (p) => <Icon {...p}><path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 01-4 4H4"/></Icon>;
const IconHash         = (p) => <Icon {...p}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></Icon>;
const IconLock         = (p) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></Icon>;
const IconType         = (p) => <Icon {...p}><path d="M4 7V5h16v2M9 5v14M15 19h-12"/></Icon>;
const IconMore         = (p) => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>;
const IconCheck        = (p) => <Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>;
const IconSidebar      = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></Icon>;
const IconMoon         = (p) => <Icon {...p}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></Icon>;

Object.assign(window, {
  Icon, IconChevronLeft, IconChevronRight, IconChevronDown, IconSearch, IconPlus, IconX,
  IconClock, IconMapPin, IconVideo, IconUsers, IconLink, IconBell, IconEye, IconEyeOff,
  IconTrash, IconSettings, IconCalendar, IconArrowRight, IconCommand, IconCornerDown,
  IconHash, IconLock, IconType, IconMore, IconCheck, IconSidebar, IconMoon,
});
