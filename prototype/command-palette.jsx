// command-palette.jsx — ⌘K modal

const CMDS = [
  // Recents
  { section: 'Recent',   id: 'r1', label: '1:1 with Sam',                      hint: 'Today, 4:30 PM',    icon: 'event' },
  { section: 'Recent',   id: 'r2', label: 'Roadmap review · Q3',               hint: 'Today, 11:30 AM',   icon: 'event' },
  { section: 'Recent',   id: 'r3', label: 'Settings → Calendar accounts',      hint: '',                  icon: 'set' },
  // Actions
  { section: 'Actions',  id: 'a1', label: 'Create event',                      kbd: ['C'],                icon: 'plus' },
  { section: 'Actions',  id: 'a2', label: 'Go to today',                       kbd: ['T'],                icon: 'cal' },
  { section: 'Actions',  id: 'a3', label: 'Switch to day view',                kbd: ['1'],                icon: 'cal' },
  { section: 'Actions',  id: 'a4', label: 'Switch to week view',               kbd: ['2'],                icon: 'cal' },
  { section: 'Actions',  id: 'a5', label: 'Switch to month view',              kbd: ['3'],                icon: 'cal' },
  { section: 'Actions',  id: 'a6', label: 'Toggle dark mode',                  kbd: ['⌘', '⇧', 'D'],      icon: 'moon' },
  { section: 'Actions',  id: 'a7', label: 'New scheduling link',               kbd: ['⌘', 'L'],           icon: 'link' },
  { section: 'Actions',  id: 'a8', label: 'Copy availability — next 5 days',   kbd: ['⌘', '⇧', 'A'],      icon: 'link' },
  // Events search
  { section: 'Events',   id: 'e1', label: 'Investor sync — Acre',              hint: 'Mon, 5:00 PM',      icon: 'event' },
  { section: 'Events',   id: 'e2', label: 'CS 224N — NLP',                     hint: 'Tue, 1:30 PM',      icon: 'event' },
  { section: 'Events',   id: 'e3', label: 'Founders drinks · YC',              hint: 'Wed, 6:30 PM',      icon: 'event' },
  { section: 'Events',   id: 'e4', label: 'All-hands',                         hint: 'Fri, 10:30 AM',     icon: 'event' },
  // Calendars
  { section: 'Calendars',id: 'c1', label: 'Stanford CS',                       hint: 'Show / hide',       icon: 'cal' },
  { section: 'Calendars',id: 'c2', label: 'Fitness',                           hint: 'Show / hide',       icon: 'cal' },
];

function CmdIcon({ kind }) {
  const map = {
    plus:  <IconPlus  size={15} />,
    cal:   <IconCalendar size={15} />,
    moon:  <IconMoon size={15} />,
    link:  <IconLink size={15} />,
    set:   <IconSettings size={15} />,
    event: <IconClock size={15} />,
  };
  return <span className="cmdk__item-icon">{map[kind]}</span>;
}

function CommandPalette({ open, onClose, onRun }) {
  const [q, setQ] = React.useState('');
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = q.trim()
    ? CMDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
    : CMDS;

  // group
  const groups = {};
  filtered.forEach(c => {
    (groups[c.section] = groups[c.section] || []).push(c);
  });

  // Flat list for keyboard nav
  const flat = filtered;

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (flat[idx]) onRun(flat[idx]); }
  };

  return (
    <div className={`cmdk-backdrop ${open ? 'cmdk-backdrop--open' : ''}`} onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="cmdk__input-wrap">
          <IconSearch size={18} style={{color: 'var(--text-3)'}} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Type a command or search…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          />
          <span className="cmdk__hint">esc to close</span>
        </div>

        <div className="cmdk__list">
          {Object.entries(groups).map(([section, items]) => (
            <div key={section}>
              <div className="cmdk__section-lbl">{section}</div>
              {items.map((c) => {
                const i = flat.indexOf(c);
                return (
                  <div
                    key={c.id}
                    className={`cmdk__item ${i === idx ? 'cmdk__item--selected' : ''}`}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => onRun(c)}
                  >
                    <CmdIcon kind={c.icon} />
                    <div className="cmdk__item-label">
                      {c.label}
                      {c.hint && <small>{c.hint}</small>}
                    </div>
                    <div className="cmdk__item-kbd">
                      {c.kbd && c.kbd.map((k, j) => <span className="kbd" key={j}>{k}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13}}>
              No matches for "{q}"
            </div>
          )}
        </div>

        <div className="cmdk__foot">
          <span className="cmdk__foot-item"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span className="cmdk__foot-item"><span className="kbd">↵</span> select</span>
          <span className="cmdk__foot-item"><span className="kbd">esc</span> close</span>
          <span style={{marginLeft: 'auto'}} className="cmdk__foot-item">
            <IconCommand size={11} /> ElevAIte
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandPalette });
