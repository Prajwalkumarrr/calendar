// screens-landing.jsx — Landing page + Auth + Menu bar popover

function Landing() {
  return (
    <div style={{width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', fontFamily: "'Geist', ui-sans-serif"}}>
      {/* Nav */}
      <div style={{display:'flex', alignItems:'center', padding:'22px 64px', borderBottom: '1px solid var(--hairline)'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div className="topbar__brand-mark" style={{width: 28, height: 28, fontSize: 14}}>E</div>
          <span style={{fontWeight:600, fontSize:16, letterSpacing:'-0.01em'}}>ElevAIte</span>
        </div>
        <div style={{flex:1}} />
        <nav style={{display:'flex', gap: 30, fontSize: 13.5, color: 'var(--text-2)'}}>
          <a>Product</a><a>Pricing</a><a>Students</a><a>Teams</a><a>Changelog</a>
        </nav>
        <div style={{flex:1}} />
        <button style={{fontSize:13.5, color:'var(--text-2)', marginRight: 18}}>Sign in</button>
        <button className="new-event-btn" style={{padding:'7px 14px'}}>Get ElevAIte</button>
      </div>

      {/* Hero */}
      <div style={{padding:'80px 64px 40px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center'}}>
        <div>
          <div style={{display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:999, background:'var(--coral-subtle)', color:'var(--coral-strong)', fontSize:12, fontWeight:500, marginBottom:24}}>
            <span style={{width:6, height:6, borderRadius:'50%', background:'var(--coral)'}} /> Now in beta — free for students
          </div>
          <h1 style={{fontSize:64, fontWeight:600, lineHeight:1.02, letterSpacing:'-0.025em', margin:'0 0 22px', color:'var(--text)'}}>
            The calendar<br/>that fits how<br/>you actually work.
          </h1>
          <p style={{fontSize:17.5, lineHeight:1.5, color:'var(--text-2)', maxWidth:460, margin:'0 0 32px'}}>
            Built for students and startup teams. Keyboard-first, time-zone aware, and free for anyone with a .edu email.
          </p>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <button className="new-event-btn" style={{padding:'10px 18px', fontSize:14, fontWeight:600}}>Get ElevAIte free</button>
            <button style={{padding:'10px 14px', fontSize:13.5, color:'var(--text-2)', fontWeight:500}}>Watch the 90-sec tour →</button>
          </div>
          <div style={{display:'flex', gap:24, marginTop: 36, fontSize:12, color:'var(--text-3)'}}>
            <span>Mac · Windows · iOS · Web</span><span>·</span>
            <span>Connects Google, iCloud, Outlook</span>
          </div>
        </div>

        {/* Calendar preview */}
        <div style={{background:'var(--bg)', borderRadius:16, boxShadow:'var(--shadow-lg)', overflow:'hidden', border:'1px solid var(--hairline-strong)'}}>
          <div style={{display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderBottom:'1px solid var(--hairline)', background:'var(--surface-sunken)'}}>
            <span style={{width:10, height:10, borderRadius:'50%', background:'#E37A6B'}} />
            <span style={{width:10, height:10, borderRadius:'50%', background:'#E8C26C'}} />
            <span style={{width:10, height:10, borderRadius:'50%', background:'#7FB58A'}} />
            <span style={{marginLeft:14, fontSize:11.5, color:'var(--text-3)', fontFamily:'Geist Mono'}}>elevaite.so</span>
          </div>
          <MiniCal />
        </div>
      </div>

      {/* Features */}
      <div style={{padding:'80px 64px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 28, borderTop:'1px solid var(--hairline)'}}>
        {[
          { icon: <IconCommand />, h: 'Keyboard-first', p: 'Every action has a shortcut. Press ⌘K and you’ll never reach for your mouse again.' },
          { icon: <IconCalendar />, h: 'Designed for focus', p: 'Today’s column is highlighted. Now-line moves with you. Skeletons, never spinners.' },
          { icon: <IconLink />, h: 'Connects everything', p: 'Google, iCloud, and Outlook side-by-side. Meet, Zoom, Teams — one click to launch.' },
        ].map((f, i) => (
          <div key={i} style={{padding:24, borderRadius: 14, background:'var(--surface)', border:'1px solid var(--hairline)'}}>
            <div style={{width:36, height:36, borderRadius:8, background:'var(--coral-subtle)', color:'var(--coral)', display:'grid', placeItems:'center', marginBottom:18}}>{f.icon}</div>
            <h3 style={{fontSize:17, fontWeight:600, margin:'0 0 6px', letterSpacing:'-0.01em'}}>{f.h}</h3>
            <p style={{fontSize:13.5, lineHeight:1.5, color:'var(--text-2)', margin:0}}>{f.p}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{padding:'30px 64px 40px', display:'flex', alignItems:'center', gap: 24, borderTop:'1px solid var(--hairline)', fontSize:12, color:'var(--text-3)'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div className="topbar__brand-mark" style={{width:18, height:18, fontSize:10}}>E</div>
          <span>ElevAIte</span>
        </div>
        <div style={{flex:1}} />
        <a>Privacy</a><a>Terms</a><a>Status</a>
        <span style={{marginLeft:18}}>© 2026</span>
      </div>
    </div>
  );
}

function MiniCal() {
  // A condensed 3-day slice of the week
  const cols = ['MON 18', 'TUE 19', 'WED 20'];
  const events = [
    [ {t:9.0, h:0.5, title:'Standup', color:'coral'}, {t:10.5, h:0.75, title:'1:1 Maya', color:'coral'}, {t:12.0, h:1, title:'Design review', color:'plum'}, {t:14, h:2.5, title:'Focus', color:'sand'} ],
    [ {t:9.0, h:0.5, title:'Standup', color:'coral'}, {t:11, h:1, title:'Eng weekly', color:'coral'}, {t:13.5, h:1.5, title:'CS 224N', color:'plum'} ],
    [ {t:9.0, h:0.5, title:'Standup', color:'coral'}, {t:10, h:0.75, title:'Coffee · Jamie', color:'sage'}, {t:11.5, h:1, title:'Roadmap', color:'coral'}, {t:14, h:2, title:'Focus · grid', color:'sand'} ],
  ];
  const H = 26;
  return (
    <div style={{padding:'12px 14px 14px', position:'relative'}}>
      <div style={{display:'grid', gridTemplateColumns:'42px 1fr 1fr 1fr', alignItems:'end', marginBottom:6}}>
        <div></div>
        {cols.map((c, i) => (
          <div key={i} style={{textAlign:'center', fontSize:10, color:'var(--text-3)', fontWeight:500, letterSpacing:'.04em'}}>
            {c.split(' ')[0]} <span style={{
              fontFamily:'Geist Mono', color:i===2?'#fff':'var(--text)',
              background:i===2?'var(--coral)':'transparent',
              padding:'1px 5px', borderRadius:8, marginLeft:3
            }}>{c.split(' ')[1]}</span>
          </div>
        ))}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'42px 1fr 1fr 1fr', position:'relative', height:H*10, borderTop:'1px solid var(--hairline)'}}>
        <div style={{borderRight:'1px solid var(--hairline)'}}>
          {Array.from({length:10}).map((_, i) => (
            <div key={i} style={{height:H, position:'relative', textAlign:'right', paddingRight:6}}>
              <span style={{fontFamily:'Geist Mono', fontSize:9, color:'var(--text-3)', position:'absolute', right:6, top:-4, background:'var(--bg)', padding:'0 2px'}}>{(9+i)>12?(9+i-12)+'P':(9+i)+'A'}</span>
            </div>
          ))}
        </div>
        {events.map((day, di) => (
          <div key={di} style={{position:'relative', borderRight: di < 2 ? '1px solid var(--hairline)' : '0', background: di===2?'rgba(217,119,87,.04)':'transparent'}}>
            {Array.from({length:10}).map((_, i) => (
              <div key={i} style={{height:H, borderTop: i>0?'1px solid var(--hairline)':'0'}} />
            ))}
            {day.map((e, i) => (
              <div key={i} className="event event--tinted" style={{
                position:'absolute', top: (e.t-9)*H, height:e.h*H-2, left:3, right:3,
                '--chip-bg': `var(--chip-${e.color}-bg)`,
                '--chip-bar': `var(--chip-${e.color}-bar)`,
                '--chip-text': `var(--chip-${e.color}-text)`,
                fontSize:10, padding:'2px 6px', borderLeftWidth:2,
              }}>{e.title}</div>
            ))}
          </div>
        ))}
        {/* now line */}
        <div style={{position:'absolute', left:42, right:0, top: (14.8-9)*H, height:0, pointerEvents:'none'}}>
          <div style={{position:'absolute', left:0, right:0, height:1.5, background:'var(--coral)'}} />
          <div style={{position:'absolute', left:`${(2/3)*100}%`, top:-3.5, width:7, height:7, borderRadius:'50%', background:'var(--coral)'}} />
        </div>
      </div>
    </div>
  );
}

function AuthScreen() {
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'grid', placeItems:'center', fontFamily:"'Geist'"}}>
      <div style={{width: 380, padding: 36, background:'var(--bg)', border:'1px solid var(--hairline-strong)', borderRadius: 16, boxShadow: 'var(--shadow)', textAlign:'center'}}>
        <div className="topbar__brand-mark" style={{width:40, height:40, fontSize:18, margin:'0 auto 22px', borderRadius:10}}>E</div>
        <h2 style={{fontSize:22, fontWeight:600, letterSpacing:'-0.015em', margin:'0 0 6px'}}>Welcome to ElevAIte</h2>
        <p style={{fontSize:13.5, color:'var(--text-2)', margin:'0 0 26px'}}>The calendar built for students and small teams.</p>

        <button className="new-event-btn" style={{width:'100%', padding:'11px', justifyContent:'center', fontSize:14, fontWeight:500, marginBottom:10}}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.18h5.59c-.26 1.34-1.55 3.93-5.59 3.93A6.21 6.21 0 1112 5.82c1.96 0 3.28.84 4.03 1.55l2.74-2.65A9.55 9.55 0 0012 3a9 9 0 100 18c5.2 0 8.64-3.65 8.64-8.79 0-.59-.06-1.04-.13-1.11z"/></svg>
          Continue with Google
        </button>
        <button style={{width:'100%', padding:'11px', justifyContent:'center', display:'inline-flex', alignItems:'center', gap:8, fontSize:14, fontWeight:500, background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:7, marginBottom: 10}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.04 12.81c0-2.34 1.92-3.46 2.01-3.52-1.1-1.61-2.81-1.83-3.42-1.85-1.45-.15-2.83.86-3.57.86-.74 0-1.87-.84-3.08-.82-1.58.02-3.04.92-3.86 2.33-1.65 2.85-.42 7.07 1.18 9.39.78 1.13 1.71 2.4 2.93 2.36 1.18-.05 1.62-.76 3.05-.76s1.83.76 3.08.73c1.27-.02 2.08-1.15 2.86-2.29.9-1.31 1.27-2.59 1.29-2.66-.03-.01-2.47-.95-2.47-3.77zM14.7 5.43c.65-.79 1.09-1.88.97-2.97-.94.04-2.08.63-2.75 1.41-.6.69-1.13 1.81-.99 2.87 1.05.08 2.12-.53 2.77-1.31z"/></svg>
          Continue with Apple
        </button>
        <button style={{width:'100%', padding:'11px', justifyContent:'center', display:'inline-flex', alignItems:'center', gap:8, fontSize:14, fontWeight:500, background:'var(--bg)', color:'var(--text-2)', border:'1px solid var(--border)', borderRadius:7}}>
          Use a magic link
        </button>

        <p style={{fontSize:11, color:'var(--text-3)', margin:'24px 0 0', lineHeight: 1.55}}>
          By continuing, you agree to our <u>Terms</u> and <u>Privacy Policy</u>.<br/>
          Free for personal use · <span style={{color:'var(--coral)'}}>Free for students with a .edu email</span>.
        </p>
      </div>
    </div>
  );
}

function MenuBar() {
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', borderRadius:14, overflow:'hidden', boxShadow:'var(--shadow-lg)', display:'flex', flexDirection:'column', fontFamily:"'Geist'"}}>
      <div style={{padding:'13px 16px', borderBottom:'1px solid var(--hairline)', display:'flex', alignItems:'center', gap:10}}>
        <div className="topbar__brand-mark" style={{width:20, height:20, fontSize:11}}>E</div>
        <span style={{fontSize:13, fontWeight:600}}>ElevAIte</span>
        <span style={{flex:1}} />
        <span style={{fontSize:11, color:'var(--text-3)', fontFamily:'Geist Mono'}}>2:48 PM</span>
      </div>

      <div style={{padding: 14}}>
        <div style={{padding:14, borderRadius:12, background:'var(--coral-subtle)', border:'1px solid var(--coral)', position:'relative'}}>
          <div style={{fontSize:11, fontWeight:600, color:'var(--coral-strong)', letterSpacing:'.06em', textTransform:'uppercase'}}>Up next · in 12 min</div>
          <div style={{fontSize:15.5, fontWeight:600, margin:'4px 0 2px', letterSpacing:'-0.01em'}}>1:1 with Sam</div>
          <div style={{fontSize:12, color:'var(--text-2)', fontFamily:'Geist Mono'}}>4:30 PM – 5:00 PM · Office</div>
          <button className="new-event-btn" style={{marginTop:12, padding:'6px 12px', fontSize:12}}>Join meeting</button>
        </div>
      </div>

      <div style={{padding:'4px 14px 0', fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--text-3)'}}>Today</div>
      <div style={{padding:'6px 6px', flex:1, overflowY:'auto'}}>
        {[
          {t:'9:00 AM', d:'Daily standup', c:'coral', past:true},
          {t:'10:00 AM', d:'Coffee w/ Jamie', c:'sage', past:true},
          {t:'11:30 AM', d:'Roadmap review · Q3', c:'coral', past:true},
          {t:'12:30 PM', d:'Team lunch', c:'sage', past:true},
          {t:'2:00 PM', d:'Focus · calendar grid', c:'sand', past:true},
          {t:'4:30 PM', d:'1:1 with Sam', c:'coral', now:true},
          {t:'6:30 PM', d:'Founders drinks · YC', c:'plum'},
        ].map((e, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:7, background: e.now?'var(--surface)':'transparent', opacity: e.past?0.45:1}}>
            <span style={{width:9, height:9, borderRadius:3, background:`var(--chip-${e.c}-bar)`, flexShrink:0}} />
            <span style={{fontFamily:'Geist Mono', fontSize:11, color:'var(--text-3)', width:56}}>{e.t}</span>
            <span style={{flex:1, fontSize:12.5}}>{e.d}</span>
            {e.now && <span style={{fontSize:10, color:'var(--coral)', fontWeight:600}}>NOW</span>}
          </div>
        ))}
      </div>

      <div style={{padding:'10px 14px', borderTop:'1px solid var(--hairline)', display:'flex', alignItems:'center', gap:10, background:'var(--surface-sunken)'}}>
        <button style={{fontSize:12, color:'var(--text-2)', fontWeight:500}}>Open ElevAIte ↗</button>
        <span style={{flex:1}} />
        <button className="icon-btn" style={{width:26, height:26}}><IconSettings size={14} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { Landing, AuthScreen, MenuBar, MiniCal });
