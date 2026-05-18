// chrome.jsx — TopBar + Sidebar

function TopBar({ onCmdK, onPanel, onToday, sidebarMode, onSidebar, onThemeToggle, theme, onNew }) {
  return (
    <div className="topbar">
      <button className="icon-btn" onClick={onSidebar} title="Toggle sidebar">
        <IconSidebar />
      </button>

      <div className="topbar__brand">
        <div className="topbar__brand-mark">E</div>
        ElevAIte
      </div>

      <div style={{display:'flex', alignItems:'center', gap:6}}>
        <button className="icon-btn" title="Previous week"><IconChevronLeft /></button>
        <button className="icon-btn" title="Next week"><IconChevronRight /></button>
        <button className="today-btn" onClick={onToday} title="Today (T)">Today</button>
      </div>

      <div className="topbar__date">
        May 18 – 24, 2026 <small>Week 21</small>
      </div>

      <div style={{flex:1}} />

      <button className="new-event-btn" onClick={onNew} title="New event (C)">
        <IconPlus size={14} stroke={2} />
        New event
        <span className="kbd-on-coral">C</span>
      </button>

      <button className="search-trigger" onClick={onCmdK}>
        <IconSearch size={14} />
        <span className="search-trigger__placeholder">Search or command…</span>
        <span className="kbd">⌘K</span>
      </button>

      <div className="view-picker">
        <button aria-pressed="false">D</button>
        <button aria-pressed="true">W</button>
        <button aria-pressed="false">M</button>
      </div>

      <button className="icon-btn" onClick={onThemeToggle} title="Toggle theme">
        <IconMoon />
      </button>

      <div className="avatar" title="Prem · prem@elevaite.so">P</div>
    </div>
  );
}

function Sidebar({ mode, calendars, onToggleCal, currentTimes }) {
  if (mode === 'hidden') return null;
  const collapsed = mode === 'collapsed';
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {!collapsed && (
        <>
          <div className="sb-section">
            <div className="sb-section__head">
              <span>Time zones</span>
              <button title="Add zone"><IconPlus size={12} /></button>
            </div>
            {TZONES.map((z, i) => (
              <div className="tz-row" key={z.tz}>
                <span className="tz-row__offset">{z.offset}</span>
                <span className="tz-row__name">{z.name}</span>
                <span className="tz-row__time">{currentTimes[i]}</span>
              </div>
            ))}
          </div>

          <div className="sb-section" style={{flex:1, overflowY:'auto'}}>
            <div className="sb-section__head">
              <span>Calendars</span>
              <button title="Account settings"><IconMore size={12} /></button>
            </div>

            {/* group by account */}
            {Object.entries(groupBy(calendars, 'account')).map(([acc, cals]) => (
              <div key={acc} style={{marginBottom: 4}}>
                <div className="cal-account__group">
                  <IconChevronDown size={11} />
                  <span style={{flex:1, fontSize: 11, color:'var(--text-3)'}}>{acc}</span>
                </div>
                {cals.map(c => (
                  <div key={c.id} className="cal-account" onClick={() => onToggleCal(c.id)}>
                    <span className="cal-account__swatch" style={{background: `var(--chip-${c.color}-bar)`}} />
                    <span className={`cal-account__name ${!c.visible ? 'cal-account__name--hidden' : ''}`}>{c.name}</span>
                    <span className={`cal-account__eye ${!c.visible ? 'cal-account__eye--always' : ''}`}>
                      {c.visible ? <IconEye size={13} /> : <IconEyeOff size={13} />}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            <button className="add-cal">
              <IconPlus size={13} /> Add calendar
            </button>
          </div>
        </>
      )}

      {collapsed && (
        <div style={{padding:'14px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:14}}>
          <button className="icon-btn" title="Time zones"><IconClock /></button>
          <button className="icon-btn" title="Calendars"><IconCalendar /></button>
          <button className="icon-btn" title="Add"><IconPlus /></button>
        </div>
      )}
    </aside>
  );
}

function groupBy(arr, key) {
  return arr.reduce((acc, x) => {
    (acc[x[key]] = acc[x[key]] || []).push(x);
    return acc;
  }, {});
}

Object.assign(window, { TopBar, Sidebar, groupBy });
