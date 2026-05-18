// event-panel.jsx — slide-out detail panel

function EventPanel({ event, open, onClose, onUpdate, onDelete }) {
  // All hooks ALWAYS run first, regardless of event.
  const [title, setTitle] = React.useState('');
  const [color, setColor] = React.useState('coral');
  const [busy, setBusy]   = React.useState(true);
  const [priv, setPriv]   = React.useState(false);

  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setColor(event.color);
    }
  }, [event && event.id]);

  if (!event) return (
    <>
      <div className={`panel-backdrop ${open ? 'panel-backdrop--open' : ''}`} onClick={onClose} />
      <div className={`panel ${open ? 'panel--open' : ''}`} />
    </>
  );

  const cal = CALENDARS.find(c => c.id === event.calendar) || CALENDARS[0];
  const participants = mockParticipants(event.attendees || 0);

  return (
    <>
      <div className={`panel-backdrop ${open ? 'panel-backdrop--open' : ''}`} onClick={onClose} />
      <div className={`panel ${open ? 'panel--open' : ''}`}>
        <div className="panel__hd">
          <div className="panel__hd-tag">
            <span className="panel__hd-tag-dot" style={{background: `var(--chip-${color}-bar)`}} />
            {cal.name}
          </div>
          <button className="icon-btn" title="More"><IconMore /></button>
          <button className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX /></button>
        </div>

        <div className="panel__body">
          <input
            className="panel__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onUpdate({ ...event, title })}
            placeholder="Untitled event"
          />

          <div className="panel-row">
            <IconClock className="panel-row__icon" />
            <div style={{flex:1}}>
              <div className="panel-row__value panel-row__value--mono">
                {event.allDay ? 'All day' : fmtRange(event.start, event.end)}
              </div>
              <div style={{fontSize: 11.5, color: 'var(--text-3)', marginTop: 2}}>
                Wed, May {DAY_NUMS[event.day]}, 2026 · {event.allDay ? 'all day' : `${((event.end - event.start)*60).toFixed(0)} min`}
              </div>
            </div>
            <button className="chip-toggle" aria-pressed={event.allDay || false}>All day</button>
          </div>

          <div className="panel-row">
            <IconMapPin className="panel-row__icon" />
            <input
              className="panel-row__value"
              defaultValue={event.loc || ''}
              placeholder="Add location"
              style={{background:'transparent', border: 0, outline: 'none', fontSize: 13, color: 'var(--text)'}}
            />
            <ConfDropdown current={event.conf} />
          </div>

          <div className="panel-row">
            <IconCalendar className="panel-row__icon" />
            <div className="panel-row__value" style={{display:'flex', alignItems:'center', gap:8}}>
              <span className="cal-account__swatch" style={{background: `var(--chip-${cal.color}-bar)`}} />
              {cal.name}
              <IconChevronDown size={12} />
            </div>
          </div>

          {participants.length > 0 && (
            <div className="panel-section">
              <div className="panel-section__lbl">Participants · {participants.length}</div>
              {participants.map(p => (
                <div className="participant" key={p.email}>
                  <div className="participant__avatar" style={{background: p.bg}}>{p.initial}</div>
                  <div style={{flex:1, minWidth: 0}}>
                    <div className="participant__name">{p.name}{p.host && <span style={{color:'var(--text-3)', fontSize: 11, marginLeft: 5}}>Organizer</span>}</div>
                    <div className="participant__email">{p.email}</div>
                  </div>
                  <span className={`participant__rsvp rsvp-${p.rsvp}`}>{p.rsvp}</span>
                </div>
              ))}
              <button style={{display:'flex', alignItems:'center', gap:6, padding: '6px 0', fontSize: 12, color: 'var(--text-3)', marginTop: 4}}>
                <IconPlus size={12} /> Add people
              </button>
            </div>
          )}

          <div className="panel-section">
            <div className="panel-section__lbl">Notes</div>
            <textarea className="panel__notes" placeholder="Add a description, agenda, or links…"
              defaultValue={event.notes || mockNotes(event)} />
          </div>

          <div className="panel-section">
            <div className="panel-section__lbl">Color</div>
            <div className="color-row">
              {CHIP_COLORS.map(c => (
                <button
                  key={c}
                  className="color-swatch"
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  style={{background: `var(--chip-${c}-bar)`}}
                />
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section__lbl">Availability</div>
            <div style={{display:'flex', gap: 6}}>
              <button className="chip-toggle" aria-pressed={busy}  onClick={() => setBusy(true)}>Busy</button>
              <button className="chip-toggle" aria-pressed={!busy} onClick={() => setBusy(false)}>Free</button>
              <button className="chip-toggle" aria-pressed={priv}  onClick={() => setPriv(!priv)}>
                <IconLock size={11} /> Private
              </button>
            </div>
          </div>

          <button style={{display:'flex', alignItems:'center', gap: 6, fontSize: 12, color: 'var(--text-3)', padding: '6px 0', marginTop: 4}}>
            <IconChevronDown size={12} /> Advanced
          </button>
        </div>

        <div className="panel__foot">
          <button className="danger" onClick={() => onDelete(event)}>
            <IconTrash size={13} style={{marginRight: 4, verticalAlign: '-2px'}} /> Delete
          </button>
          <button className="save" onClick={() => onUpdate({ ...event, title, color })}>Save</button>
        </div>
      </div>
    </>
  );
}

function ConfDropdown({ current }) {
  const opts = { meet: 'Meet', zoom: 'Zoom', teams: 'Teams' };
  return (
    <button className="chip-toggle" style={{display:'inline-flex', alignItems:'center', gap: 6}}>
      <IconVideo size={11} />
      {current ? opts[current] : 'Add call'}
      <IconChevronDown size={11} />
    </button>
  );
}

const AVATAR_BGS = [
  'linear-gradient(135deg, #D97757, #C28699)',
  'linear-gradient(135deg, #88A188, #B89968)',
  'linear-gradient(135deg, #7A8DA8, #9A7B98)',
  'linear-gradient(135deg, #C8A057, #D97757)',
  'linear-gradient(135deg, #B89968, #88A188)',
];

function mockParticipants(n) {
  if (n === 0) return [];
  const names = [
    { name: 'Prem Sai',    email: 'prem@elevaite.so',   rsvp: 'yes',     host: true },
    { name: 'Maya Liu',    email: 'maya@elevaite.so',   rsvp: 'yes' },
    { name: 'Sam Chen',    email: 'sam@elevaite.so',    rsvp: 'maybe' },
    { name: 'Jordan Park', email: 'jordan@elevaite.so', rsvp: 'yes' },
    { name: 'Alex Rivera', email: 'alex@elevaite.so',   rsvp: 'pending' },
    { name: 'Priya N.',    email: 'priya.n@gmail.com',  rsvp: 'no' },
  ];
  return names.slice(0, Math.min(n, names.length)).map((p, i) => ({
    ...p,
    initial: p.name[0],
    bg: AVATAR_BGS[i % AVATAR_BGS.length],
  }));
}

function mockNotes(e) {
  if (e.title.includes('standup'))   return "• Yesterday\n• Today\n• Blockers";
  if (e.title.includes('1:1'))       return "Agenda:\n• How are you?\n• What's blocking you?\n• Career growth";
  if (e.title.includes('Roadmap'))   return "Doc: linear.app/elevaite/roadmap-q3";
  if (e.title.includes('User interview')) return "Recording: granola.ai/p/priya-interview\nGoal: validate command palette UX";
  if (e.title.includes('Focus'))     return "Drafting the new event panel — see Figma.";
  return "";
}

Object.assign(window, { EventPanel });
