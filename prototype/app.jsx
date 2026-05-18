// app.jsx — main ElevAIte Calendar prototype

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "density": "regular",
  "chipStyle": "tinted",
  "sidebar": "open",
  "weekStart": "mon",
  "coral": "#D97757"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Theme + density on root
  React.useEffect(() => {
    document.documentElement.dataset.theme   = t.dark ? 'dark' : 'light';
    document.documentElement.dataset.density = t.density;
    // override coral if user picks a different shade
    document.documentElement.style.setProperty('--coral', t.coral);
  }, [t.dark, t.density, t.coral]);

  // Live data state
  const [events, setEvents]       = React.useState(EVENTS);
  const [calendars, setCalendars] = React.useState(CALENDARS);
  const [selectedId, setSelectedId] = React.useState(null);
  const [panelOpen, setPanelOpen]   = React.useState(false);
  const [cmdkOpen,  setCmdkOpen]    = React.useState(false);
  const [allDayCollapsed, setAllDayCollapsed] = React.useState(false);
  const [hintShown, setHintShown] = React.useState(true);
  const [toast, setToast] = React.useState(null);

  // "Now" simulation — Wed May 20, 2026 @ 2:48 PM (so we land in a focus block)
  const nowMinutes = 14 * 60 + 48;

  // Sidebar mode
  const sidebarMode = t.sidebar; // 'open' | 'collapsed' | 'hidden'
  const cycleSidebar = () => {
    const next = sidebarMode === 'open' ? 'collapsed' : sidebarMode === 'collapsed' ? 'hidden' : 'open';
    setTweak('sidebar', next);
  };

  const selectedEvent = events.find(e => e.id === selectedId);

  const openEvent = (e) => {
    setSelectedId(e.id);
    setPanelOpen(true);
    setHintShown(false);
  };
  const closePanel = () => setPanelOpen(false);
  const updateEvent = (updated) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    flash('Event saved');
  };
  const deleteEvent = (e) => {
    setEvents(prev => prev.filter(x => x.id !== e.id));
    setPanelOpen(false);
    flash('Event deleted');
  };
  const onCreate = (day, start, end) => {
    const id = 'new-' + Date.now();
    const e = {
      id, day, start, end,
      title: 'New event',
      calendar: 'work',
      color: 'coral',
      loc: '',
      conf: null,
      attendees: 0,
    };
    setEvents(prev => [...prev, e]);
    setSelectedId(id);
    setPanelOpen(true);
    setHintShown(false);
  };

  const toggleCalendar = (id) => {
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      const inField = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if (inField && e.key !== 'Escape') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setCmdkOpen(o => !o);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault(); setTweak('dark', !t.dark);
      } else if (e.key === 'Escape') {
        if (cmdkOpen) setCmdkOpen(false);
        else if (panelOpen) setPanelOpen(false);
      } else if (!inField && e.key.toLowerCase() === 't') {
        flash('Jumped to today');
      } else if (!inField && e.key.toLowerCase() === 'c') {
        onCreate(TODAY_IDX, 15, 16);
      } else if (!inField && e.key.toLowerCase() === 'd') { /* day */ }
      else if (!inField && e.key.toLowerCase() === 'w') { /* week (already on) */ }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdkOpen, panelOpen, t.dark]);

  const runCommand = (cmd) => {
    setCmdkOpen(false);
    if (cmd.id === 'a1') onCreate(TODAY_IDX, 15, 16);
    else if (cmd.id === 'a2') flash('Jumped to today');
    else if (cmd.id === 'a6') setTweak('dark', !t.dark);
    else if (cmd.section === 'Events') {
      const titleMatch = events.find(ev => ev.title === cmd.label);
      if (titleMatch) openEvent(titleMatch);
    }
    else flash(`Ran: ${cmd.label}`);
  };

  // Live timezone clocks (simulated to match "today")
  const currentTimes = ['2:48 PM', '5:48 PM', '10:48 PM', '5:48 AM'];

  return (
    <div style={{display:'flex', flexDirection:'column', height: '100vh'}}>
      <TopBar
        onCmdK={() => setCmdkOpen(true)}
        onToday={() => flash('Jumped to today')}
        sidebarMode={sidebarMode}
        onSidebar={cycleSidebar}
        onThemeToggle={() => setTweak('dark', !t.dark)}
        theme={t.dark ? 'dark' : 'light'}
        onNew={() => onCreate(TODAY_IDX, 15, 16)}
      />
      <div style={{flex: 1, display: 'flex', minHeight: 0, position: 'relative'}}>
        <Sidebar
          mode={sidebarMode}
          calendars={calendars}
          onToggleCal={toggleCalendar}
          currentTimes={currentTimes}
        />
        <CalendarGrid
          events={events}
          calendars={calendars}
          chipStyle={t.chipStyle}
          onEventClick={openEvent}
          selectedEventId={selectedId}
          nowMinutes={nowMinutes}
          onCreate={onCreate}
          allDayCollapsed={allDayCollapsed}
          onToggleAllDay={() => setAllDayCollapsed(v => !v)}
        />
        {hintShown && (
          <div className="fab-hint">
            <span>Drag any time slot to create — or press</span>
            <span className="kbd">C</span>
          </div>
        )}
      </div>

      <EventPanel
        event={selectedEvent}
        open={panelOpen}
        onClose={closePanel}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
      />

      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} onRun={runCommand} />

      <div className={`toast ${toast ? 'toast--open' : ''}`}>{toast}</div>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakToggle label="Dark mode"  value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakRadio  label="Density"    value={t.density}    options={['compact', 'regular', 'comfy']}      onChange={v => setTweak('density', v)} />
        <TweakRadio  label="Sidebar"    value={t.sidebar}    options={['open', 'collapsed', 'hidden']}      onChange={v => setTweak('sidebar', v)} />

        <TweakSection label="Event chips" />
        <TweakRadio  label="Style"      value={t.chipStyle}  options={['fill', 'tinted', 'outline']}        onChange={v => setTweak('chipStyle', v)} />

        <TweakSection label="Brand" />
        <TweakColor  label="Coral hue"  value={t.coral}      options={['#D97757', '#E37A4F', '#C5694E', '#D4836A']}   onChange={v => setTweak('coral', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
