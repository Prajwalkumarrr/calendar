// calendar-grid.jsx — Week view (gutter + 7 day columns + events + now-line)

function CalendarGrid({ events, calendars, chipStyle, onEventClick, selectedEventId, nowMinutes, onCreate, allDayCollapsed, onToggleAllDay }) {
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  const visibleCalIds = new Set(calendars.filter(c => c.visible).map(c => c.id));
  const visEvents = events.filter(e => visibleCalIds.has(e.calendar));

  const allDay = visEvents.filter(e => e.allDay);
  const timed  = visEvents.filter(e => !e.allDay);

  // Drag-to-create state
  const [drag, setDrag] = React.useState(null); // {day, startY, currentY}
  const scrollRef = React.useRef(null);

  const hourH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hour-h')) || 56;

  const yFromHour = (h) => (h - HOUR_START) * hourH;
  const hourFromY = (y) => HOUR_START + y / hourH;
  const snap = (h, step = 0.25) => Math.round(h / step) * step;

  const handleColMouseDown = (e, day) => {
    if (e.button !== 0) return;
    if (e.target.closest('.event')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDrag({ day, startY: y, currentY: y + hourH }); // default 1 hour
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const col = document.querySelector(`[data-col="${drag.day}"]`);
      if (!col) return;
      const rect = col.getBoundingClientRect();
      const y = Math.max(0, Math.min((HOUR_END - HOUR_START + 1) * hourH, e.clientY - rect.top));
      setDrag(d => ({ ...d, currentY: y }));
    };
    const up = () => {
      if (drag) {
        const sH = snap(hourFromY(Math.min(drag.startY, drag.currentY)));
        const eH = snap(hourFromY(Math.max(drag.startY, drag.currentY)));
        if (eH - sH >= 0.25) onCreate(drag.day, sH, eH);
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag]);

  return (
    <div className="cal-wrap">
      {/* Day headers */}
      <div className="cal-day-headers">
        <div className="cal-day-headers__gutter" />
        {DAY_NAMES.map((d, i) => (
          <div key={i} className={`cal-day ${i === TODAY_IDX ? 'cal-day--today' : ''} ${i >= 5 ? 'cal-day--weekend' : ''}`}>
            <div className="cal-day__name">{d}</div>
            <div className="cal-day__num">{DAY_NUMS[i]}</div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      <div className="all-day-row" style={{minHeight: allDayCollapsed ? 24 : undefined}}>
        <div className="all-day-row__label" onClick={onToggleAllDay} style={{cursor:'pointer'}}>
          all-day
        </div>
        {DAY_NAMES.map((_, i) => (
          <div key={i} className={`all-day-row__cell ${i === TODAY_IDX ? 'all-day-row__cell--today' : ''}`}>
            {!allDayCollapsed && allDay.filter(e => e.day === i).map(e => {
              const styleClass = `event--${chipStyle}`;
              const cssVars = {
                '--chip-bg': `var(--chip-${e.color}-bg)`,
                '--chip-bar': `var(--chip-${e.color}-bar)`,
                '--chip-text': `var(--chip-${e.color}-text)`,
              };
              return (
                <div key={e.id} className={`all-day-chip ${styleClass}`} style={cssVars}
                     onClick={() => onEventClick(e)}>
                  {e.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal-grid">
          {/* Gutter */}
          <div className="cal-gutter">
            {hours.map(h => (
              <div className="cal-gutter__hour" key={h}>
                <span>{h === 12 ? '12\u00A0PM' : h > 12 ? `${h-12}\u00A0PM` : `${h}\u00A0AM`}</span>
              </div>
            ))}
          </div>

          {DAY_NAMES.map((_, i) => {
            const dayEvents = layoutDay(timed.filter(e => e.day === i));
            return (
              <div
                key={i}
                data-col={i}
                className={`cal-col ${i === TODAY_IDX ? 'cal-col--today' : ''} ${i >= 5 ? 'cal-col--weekend' : ''}`}
                onMouseDown={(e) => handleColMouseDown(e, i)}
                style={{position: 'relative'}}
              >
                {hours.map(h => <div className="cal-col__hour" key={h} />)}

                {dayEvents.map(e => {
                  const top = yFromHour(e.start);
                  const h = (e.end - e.start) * hourH;
                  const styleClass = `event--${chipStyle}`;
                  const cssVars = {
                    '--chip-bg': `var(--chip-${e.color}-bg)`,
                    '--chip-bar': `var(--chip-${e.color}-bar)`,
                    '--chip-text': `var(--chip-${e.color}-text)`,
                    background: chipStyle === 'fill'    ? `var(--chip-${e.color}-bar)` : undefined,
                    backgroundColor: chipStyle === 'tinted' ? `var(--chip-${e.color}-bg)`  : undefined,
                  };
                  const widthPct  = 100 / e.cols;
                  const leftPct   = (e.col * 100) / e.cols;
                  return (
                    <div
                      key={e.id}
                      className={`event ${styleClass} ${h < 24 ? 'event--short' : ''} ${selectedEventId === e.id ? 'event--selected' : ''}`}
                      style={{
                        top, height: h - 2,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        ...cssVars,
                      }}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                      onMouseDown={(ev) => ev.stopPropagation()}
                    >
                      <div className="event__title">{e.title}</div>
                      {h > 38 && <div className="event__meta">{fmtTime(e.start)} – {fmtTime(e.end)}</div>}
                      {h > 70 && e.loc && <div className="event__loc">{e.loc}</div>}
                    </div>
                  );
                })}

                {/* Drag ghost */}
                {drag && drag.day === i && (() => {
                  const top = Math.min(drag.startY, drag.currentY);
                  const height = Math.max(8, Math.abs(drag.currentY - drag.startY));
                  const sH = snap(hourFromY(Math.min(drag.startY, drag.currentY)));
                  const eH = snap(hourFromY(Math.max(drag.startY, drag.currentY)));
                  return (
                    <div className="drag-ghost" style={{top, height}}>
                      <div>
                        <div style={{fontWeight: 600}}>New event</div>
                        <div className="mono" style={{fontSize: 10.5, opacity:.8, marginTop:1}}>
                          {fmtTime(sH)} – {fmtTime(eH)}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Now line (only crosses days; rendered relative to today column ideally,
             but here we draw it across full grid; it visually highlights time row) */}
          <NowLine nowMinutes={nowMinutes} hourH={hourH} />
        </div>
      </div>
    </div>
  );
}

function NowLine({ nowMinutes, hourH }) {
  const h = nowMinutes / 60;
  if (h < HOUR_START || h > HOUR_END + 1) return null;
  const top = (h - HOUR_START) * hourH;
  // grid column 2..8 (today col). Render across entire visible grid using absolute positioning inside parent.
  return (
    <div className="now-line" style={{top, position: 'absolute', left: 'var(--gutter-w)', right: 0}}>
      <div className="now-line__label">{fmtTime24(h)}</div>
      <div className="now-line__bar" />
      <div className="now-line__dot" style={{left: `${(100/7) * TODAY_IDX}%`}} />
    </div>
  );
}

// Overlap layout — assign cols/cols-count to overlapping events
function layoutDay(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = sorted.map(e => ({ ...e, col: 0, cols: 1 }));
  // Simple sweep-line column allocation
  const active = []; // {endTime, col, idx}
  for (let i = 0; i < out.length; i++) {
    const e = out[i];
    // remove finished
    for (let j = active.length - 1; j >= 0; j--) if (active[j].endTime <= e.start) active.splice(j, 1);
    const usedCols = new Set(active.map(a => a.col));
    let col = 0;
    while (usedCols.has(col)) col++;
    e.col = col;
    active.push({ endTime: e.end, col, idx: i });
    const cols = Math.max(...active.map(a => a.col)) + 1;
    // back-propagate cols to all currently active events
    active.forEach(a => { out[a.idx].cols = Math.max(out[a.idx].cols, cols); });
  }
  return out;
}

Object.assign(window, { CalendarGrid });
