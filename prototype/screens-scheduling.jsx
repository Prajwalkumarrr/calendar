// screens-scheduling.jsx — Public booking + Scheduling manager + Settings + Empty + Mobile

function PublicBooking() {
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'grid', gridTemplateColumns: '380px 1fr', fontFamily:"'Geist'"}}>
      {/* Left */}
      <div style={{padding: '40px 32px', borderRight:'1px solid var(--hairline)', display:'flex', flexDirection:'column', gap: 18}}>
        <div className="topbar__brand-mark" style={{width:32, height:32, fontSize:14, borderRadius:8}}>E</div>

        <div style={{display:'flex', alignItems:'center', gap: 12, marginTop: 8}}>
          <div className="avatar" style={{width: 56, height:56, fontSize:22}}>P</div>
          <div>
            <div style={{fontSize:11, color:'var(--text-3)', fontWeight:500, letterSpacing:'.05em', textTransform:'uppercase'}}>Meeting with</div>
            <div style={{fontSize:18, fontWeight:600, letterSpacing:'-0.01em'}}>Prem Sai</div>
            <div style={{fontSize:12.5, color:'var(--text-2)'}}>Founder, ElevAIte</div>
          </div>
        </div>

        <div style={{height: 1, background:'var(--hairline)'}} />

        <h1 style={{fontSize: 28, fontWeight:600, letterSpacing:'-0.02em', margin:0, lineHeight:1.1}}>30-minute intro chat</h1>

        <div style={{display:'flex', flexDirection:'column', gap:8, fontSize:13, color:'var(--text-2)'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}><IconClock size={15} /> 30 min</div>
          <div style={{display:'flex', alignItems:'center', gap:10}}><IconVideo size={15} /> Google Meet · sent on confirmation</div>
          <div style={{display:'flex', alignItems:'center', gap:10}}><IconCalendar size={15} /> Times shown in your local timezone</div>
        </div>

        <p style={{fontSize:13, lineHeight:1.55, color:'var(--text-2)', margin:0}}>
          Happy to chat about ElevAIte, calendar design, or the future of scheduling. If we don’t end up working together, I’ll still leave you with three concrete things you can try.
        </p>

        <div style={{marginTop:'auto', fontSize:11, color:'var(--text-3)'}}>Powered by ElevAIte</div>
      </div>

      {/* Right */}
      <div style={{padding:'40px 36px', display:'grid', gridTemplateColumns: '300px 1fr', gap: 28, minHeight: 0}}>
        <div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14}}>
            <div style={{fontSize:15, fontWeight:600, letterSpacing:'-0.01em'}}>May 2026</div>
            <div style={{display:'flex', gap:4}}>
              <button className="icon-btn" style={{width:26, height:26}}><IconChevronLeft size={14} /></button>
              <button className="icon-btn" style={{width:26, height:26}}><IconChevronRight size={14} /></button>
            </div>
          </div>
          <MonthGrid />
          <div style={{marginTop: 18, fontSize:11.5, color:'var(--text-3)'}}>Time zone</div>
          <div style={{fontSize:13, marginTop:2, display:'flex', alignItems:'center', gap:6}}>
            America / Los_Angeles <IconChevronDown size={11} />
          </div>
        </div>

        <div style={{minHeight: 0, display:'flex', flexDirection:'column'}}>
          <div style={{fontSize: 15, fontWeight:600, letterSpacing:'-0.01em', marginBottom: 12}}>Wednesday, May 20</div>
          <div style={{display:'flex', flexDirection:'column', gap: 6, overflowY:'auto', paddingRight: 6}}>
            {['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM'].map((t, i) => {
              const selected = i === 3;
              return selected ? (
                <div key={t} style={{display:'flex', gap:6}}>
                  <button style={{flex:1, padding:'11px 14px', fontSize:13.5, fontWeight:600, color:'var(--text-3)', background:'var(--surface-sunken)', border:'1px solid var(--border)', borderRadius:8, textAlign:'left'}}>{t}</button>
                  <button className="new-event-btn" style={{padding:'11px 18px', fontSize:13.5}}>Confirm →</button>
                </div>
              ) : (
                <button key={t} style={{padding:'11px 14px', fontSize:13.5, fontWeight:500, color:'var(--text)', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, textAlign:'left', transition:'all 120ms var(--ease)'}}>{t}</button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthGrid() {
  // May 2026 starts on a Friday. Mon-first grid.
  // May 1 = Fri => offset = 4 (Mon=0)
  const offset = 4;
  const daysInMay = 31;
  const cells = [];
  // Prev month tail (Apr 27-30)
  for (let i = 0; i < offset; i++) cells.push({ n: 27 + i, m: 'prev' });
  for (let d = 1; d <= daysInMay; d++) cells.push({ n: d, m: 'cur' });
  while (cells.length % 7 !== 0) cells.push({ n: cells.length - daysInMay - offset + 1, m: 'next' });

  const available = new Set([18, 19, 20, 21, 22, 26, 27, 28, 29]); // ours
  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', textAlign:'center', fontSize:10, fontWeight:500, color:'var(--text-3)', letterSpacing:'.04em', marginBottom:6}}>
        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 2}}>
        {cells.map((c, i) => {
          const isAvail = c.m === 'cur' && available.has(c.n);
          const isSel = c.n === 20 && c.m === 'cur';
          return (
            <button key={i} style={{
              height: 36, borderRadius: 8,
              fontSize: 13, fontFamily: 'Geist Mono',
              color: c.m !== 'cur' ? 'var(--text-3)' : isSel ? '#fff' : isAvail ? 'var(--coral-strong)' : 'var(--text-3)',
              background: isSel ? 'var(--coral)' : isAvail ? 'var(--coral-subtle)' : 'transparent',
              fontWeight: isAvail || isSel ? 600 : 400,
              cursor: c.m === 'cur' && isAvail ? 'pointer' : 'default',
              opacity: c.m !== 'cur' ? 0.4 : 1,
              transition: 'all 120ms var(--ease)',
            }}>{c.n}</button>
          );
        })}
      </div>
    </div>
  );
}

function SchedulingManager() {
  const links = [
    { name:'30-min intro chat',        slug:'/prem/30min',         dur:'30 min', book:18, last:'2 hours ago', recur:false, color:'coral' },
    { name:'Design feedback',          slug:'/prem/design',        dur:'45 min', book:6,  last:'Yesterday',    recur:false, color:'plum'  },
    { name:'Weekly office hours',      slug:'/prem/office-hours',  dur:'15 min', book:42, last:'3 days ago',   recur:true,  color:'sage'  },
    { name:'Investor — coffee',        slug:'/prem/investor',      dur:'25 min', book:3,  last:'Last week',    recur:false, color:'sand'  },
    { name:'AMA — students',           slug:'/prem/ama',           dur:'20 min', book:11, last:'2 weeks ago',  recur:true,  color:'rose'  },
  ];
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:"'Geist'"}}>
      <div style={{padding:'22px 36px', display:'flex', alignItems:'center', borderBottom:'1px solid var(--hairline)'}}>
        <div>
          <div style={{fontSize:11, color:'var(--text-3)', fontWeight:500, letterSpacing:'.05em', textTransform:'uppercase'}}>Scheduling</div>
          <h2 style={{fontSize:24, fontWeight:600, letterSpacing:'-0.015em', margin:'2px 0 0'}}>Links</h2>
        </div>
        <div style={{flex:1}} />
        <div className="view-picker" style={{marginRight:12}}>
          <button aria-pressed="true">One-off</button>
          <button aria-pressed="false">Recurring</button>
        </div>
        <button className="new-event-btn" style={{padding:'7px 14px'}}>+ New link</button>
      </div>

      <div style={{padding:'24px 36px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, overflow:'auto'}}>
        {links.map((l, i) => (
          <div key={i} style={{padding:'18px 20px', background:'var(--surface)', border:'1px solid var(--hairline-strong)', borderRadius:12, position:'relative'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
              <span style={{width:10, height:10, borderRadius:3, background:`var(--chip-${l.color}-bar)`}} />
              <div style={{fontSize:14.5, fontWeight:600, letterSpacing:'-0.005em'}}>{l.name}</div>
              <div style={{flex:1}} />
              <button className="icon-btn" style={{width:24, height:24}}><IconMore size={13} /></button>
            </div>
            <div style={{fontFamily:'Geist Mono', fontSize:11, color:'var(--text-2)', padding:'5px 8px', background:'var(--bg)', borderRadius:5, display:'inline-flex', alignItems:'center', gap:6, marginBottom: 12}}>
              elevaite.so{l.slug}
              <IconLink size={11} style={{color: 'var(--text-3)'}} />
            </div>
            <div style={{display:'flex', alignItems:'center', gap: 16, fontSize:11.5, color:'var(--text-2)'}}>
              <span><b style={{color:'var(--text)'}}>{l.dur}</b> duration</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                <b style={{color:'var(--text)'}}>{l.book}</b> bookings
              </span>
              <span style={{color:'var(--text-3)'}}>· last {l.last}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  const navItems = ['Profile', 'Calendar accounts', 'Notifications', 'Appearance', 'Keyboard', 'About'];
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'grid', gridTemplateColumns:'220px 1fr', fontFamily:"'Geist'"}}>
      <div style={{padding:24, borderRight:'1px solid var(--hairline)'}}>
        <div style={{fontSize:11, color:'var(--text-3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8}}>Settings</div>
        {navItems.map((n, i) => (
          <button key={n} style={{
            display:'block', padding:'7px 10px', borderRadius:6,
            fontSize:13, color: i===3?'var(--text)':'var(--text-2)',
            fontWeight: i===3?500:400,
            background: i===3?'var(--surface)':'transparent',
            marginBottom: 2, width:'100%', textAlign:'left',
          }}>{n}</button>
        ))}
      </div>

      <div style={{padding:'30px 36px', overflowY:'auto'}}>
        <h2 style={{fontSize:22, fontWeight:600, letterSpacing:'-0.015em', margin:'0 0 22px'}}>Appearance</h2>

        <FormSection label="Theme">
          <div style={{display:'flex', gap:10}}>
            {[
              { k:'light',  l:'Light',  preview:{bg:'#FAF9F5', sk:'#F5F4ED', tx:'#1F1E1B'} },
              { k:'dark',   l:'Dark',   preview:{bg:'#1A1916', sk:'#232220', tx:'#F5F4ED'} },
              { k:'system', l:'System', preview:{bg:'linear-gradient(135deg, #FAF9F5 50%, #1A1916 50%)', sk:'#888', tx:'#888'} },
            ].map(o => (
              <div key={o.k} style={{
                padding:8, background:'var(--bg)',
                border: o.k==='light'?'1.5px solid var(--coral)':'1px solid var(--border)',
                borderRadius:10, cursor:'pointer', textAlign:'center',
              }}>
                <div style={{width:96, height:54, background:o.preview.bg, borderRadius:6, marginBottom:6, padding: 8, display:'flex', flexDirection:'column', gap:3}}>
                  <div style={{height:3, width:'60%', background:o.preview.sk, borderRadius:1}} />
                  <div style={{height:3, width:'40%', background:o.preview.sk, borderRadius:1}} />
                  <div style={{height: 18, marginTop:'auto', background:'var(--coral)', borderRadius:3, opacity:.6}} />
                </div>
                <div style={{fontSize:12, fontWeight:500}}>{o.l}</div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection label="Week starts on">
          <div className="view-picker" style={{width:'fit-content'}}>
            <button aria-pressed="true">Monday</button>
            <button aria-pressed="false">Sunday</button>
            <button aria-pressed="false">Saturday</button>
          </div>
        </FormSection>

        <FormSection label="Time format">
          <div className="view-picker" style={{width:'fit-content'}}>
            <button aria-pressed="false">12-hour</button>
            <button aria-pressed="true">24-hour</button>
          </div>
        </FormSection>

        <FormSection label="Event chip style">
          <div className="view-picker" style={{width:'fit-content'}}>
            <button aria-pressed="false">Fill</button>
            <button aria-pressed="true">Tinted</button>
            <button aria-pressed="false">Outline</button>
          </div>
        </FormSection>

        <FormSection label="Density">
          <div className="view-picker" style={{width:'fit-content'}}>
            <button aria-pressed="false">Compact</button>
            <button aria-pressed="true">Regular</button>
            <button aria-pressed="false">Comfy</button>
          </div>
        </FormSection>

        <div style={{marginTop: 40, paddingTop: 24, borderTop:'1px solid var(--hairline-strong)'}}>
          <h3 style={{fontSize:13, fontWeight:600, color:'var(--text-2)', margin:'0 0 8px'}}>Danger zone</h3>
          <button style={{padding:'8px 12px', borderRadius:7, border:'1px solid var(--border)', fontSize:12.5, color:'var(--text-2)', background:'var(--bg)'}}>Disconnect all accounts</button>
          <button style={{padding:'8px 12px', borderRadius:7, border:'1px solid var(--border)', fontSize:12.5, color:'var(--text-2)', background:'var(--bg)', marginLeft: 8}}>Delete account</button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ label, children }) {
  return (
    <div style={{marginBottom: 22}}>
      <div style={{fontSize:10.5, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:8}}>{label}</div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:"'Geist'"}}>
      <div style={{height: 52, borderBottom:'1px solid var(--hairline)', display:'flex', alignItems:'center', padding:'0 16px', gap:10}}>
        <div className="topbar__brand-mark" style={{width:20, height:20, fontSize:11}}>E</div>
        <span style={{fontSize:13, fontWeight:600}}>May 18 – 24, 2026</span>
        <span style={{flex:1}} />
        <button className="today-btn" style={{padding:'4px 10px'}}>Today</button>
      </div>
      <div style={{flex:1, display:'grid', placeItems:'center'}}>
        <div style={{textAlign:'center', maxWidth: 360}}>
          <svg width="92" height="76" viewBox="0 0 92 76" fill="none" style={{margin:'0 auto 22px'}}>
            <rect x="8" y="14" width="76" height="56" rx="6" stroke="var(--border)" strokeWidth="1.5" />
            <line x1="8" y1="28" x2="84" y2="28" stroke="var(--border)" strokeWidth="1.5" />
            <line x1="22" y1="6" x2="22" y2="20" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="70" y1="6" x2="70" y2="20" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="34" cy="42" r="3" fill="var(--coral-subtle)" />
            <circle cx="54" cy="50" r="3" fill="var(--coral-subtle)" />
            <circle cx="68" cy="58" r="3" fill="var(--coral)" />
          </svg>
          <h3 style={{fontSize:20, fontWeight:600, letterSpacing:'-0.015em', margin:'0 0 6px'}}>Your week is clear.</h3>
          <p style={{fontSize:13.5, color:'var(--text-2)', margin:'0 0 22px', lineHeight: 1.55}}>Drag in the grid to block out time, or press <span className="kbd">C</span> to create your first event.</p>
          <button className="new-event-btn" style={{padding:'8px 14px'}}>+ New event</button>
        </div>
      </div>
    </div>
  );
}

function MobileDay() {
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:"'Geist'", borderRadius: 22, overflow:'hidden', border:'1px solid var(--border-strong)'}}>
      {/* status bar */}
      <div style={{height:28, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', fontFamily:'Geist Mono', fontSize:12, fontWeight:600, paddingTop: 6}}>
        <span>9:41</span>
        <span>● ● ●</span>
      </div>
      <div style={{padding:'10px 18px 12px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--hairline)'}}>
        <div className="topbar__brand-mark" style={{width:24, height:24, fontSize:12}}>E</div>
        <div style={{flex:1}}>
          <div style={{fontSize:9, color:'var(--text-3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase'}}>Wednesday</div>
          <div style={{fontSize:17, fontWeight:600, letterSpacing:'-0.01em'}}>May 20</div>
        </div>
        <button className="icon-btn" style={{width:32, height:32}}><IconSearch /></button>
      </div>

      {/* Mini week strip */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'8px 12px', gap:3}}>
        {['M','T','W','T','F','S','S'].map((d,i) => (
          <div key={i} style={{textAlign:'center', padding:'6px 0', borderRadius:8, background: i===2?'var(--coral)':'transparent', color: i===2?'#fff':'var(--text-2)'}}>
            <div style={{fontSize:9, opacity:0.7}}>{d}</div>
            <div style={{fontSize:13, fontWeight:600, fontFamily:'Geist Mono', marginTop:1}}>{18+i}</div>
          </div>
        ))}
      </div>

      <div style={{flex:1, overflowY:'auto', padding:'8px 14px 14px', position:'relative'}}>
        {[
          {t:'9:00', d:'Daily standup', dur:'15m', c:'coral'},
          {t:'10:00', d:'Coffee w/ Jamie', dur:'45m', c:'sage', loc:'Verve'},
          {t:'11:30', d:'Roadmap review · Q3', dur:'1h', c:'coral', loc:'Office'},
          {t:'12:30', d:'Team lunch', dur:'1h', c:'sage'},
          {t:'2:00', d:'Focus · calendar grid', dur:'2h', c:'sand'},
          {t:'4:30', d:'1:1 with Sam', dur:'30m', c:'coral', loc:'Office', now: true},
          {t:'6:30', d:'Founders drinks · YC', dur:'1h 30m', c:'plum', loc:'Mission SF'},
        ].map((e, i) => (
          <div key={i} style={{display:'flex', gap:12, padding:'10px 0', borderBottom: i<6?'1px solid var(--hairline)':'0', alignItems:'center'}}>
            <div style={{width: 44, textAlign:'right'}}>
              <div style={{fontSize:12, fontFamily:'Geist Mono', fontWeight:600, color: e.now?'var(--coral)':'var(--text)'}}>{e.t}</div>
              <div style={{fontSize:9.5, color:'var(--text-3)'}}>{e.dur}</div>
            </div>
            <div className="event event--tinted" style={{
              flex:1, position:'relative', left: 0, right: 0,
              '--chip-bg': `var(--chip-${e.c}-bg)`,
              '--chip-bar': `var(--chip-${e.c}-bar)`,
              '--chip-text': `var(--chip-${e.c}-text)`,
              padding:'8px 11px', borderLeftWidth: 3, borderRadius: 7,
              outline: e.now?'2px solid var(--coral)':'none', outlineOffset: 1,
            }}>
              <div style={{fontSize:13, fontWeight:500}}>{e.d}</div>
              {e.loc && <div style={{fontSize:10.5, opacity:.75, marginTop:1}}>{e.loc}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', borderTop:'1px solid var(--hairline)', background:'var(--bg)', padding: '8px 10px 16px'}}>
        {[
          { i: <IconCalendar />, l:'Today', a: true },
          { i: <IconSearch />,   l:'Search' },
          { i: <IconPlus size={20} stroke={2.2} />, l:'New', primary:true },
          { i: <IconSettings />, l:'Settings' },
        ].map((b, i) => (
          <button key={i} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'6px 0', fontSize:9.5, color: b.a?'var(--coral)':'var(--text-3)'}}>
            <span style={{
              width:32, height:32, borderRadius: b.primary?16:8,
              background: b.primary?'var(--coral)':'transparent', color: b.primary?'#fff':'inherit',
              display:'grid', placeItems:'center'
            }}>{b.i}</span>
            {!b.primary && b.l}
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { PublicBooking, MonthGrid, SchedulingManager, Settings, EmptyState, MobileDay });
