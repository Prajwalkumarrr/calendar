// screens-onboarding.jsx — 3-step onboarding flow

function OnboardingStep({ step, title, sub, body }) {
  return (
    <div style={{width:'100%', height:'100%', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:"'Geist'"}}>
      {/* Progress dots */}
      <div style={{padding:'24px 28px', display:'flex', alignItems:'center', gap:14}}>
        <div className="topbar__brand-mark" style={{width:24, height:24, fontSize:12}}>E</div>
        <span style={{flex:1}} />
        {[1,2,3].map(s => (
          <span key={s} style={{
            width: s===step?22:8, height:8, borderRadius:4,
            background: s<=step?'var(--coral)':'var(--surface-sunken)',
            border: s<step?'0':s===step?'0':'1px solid var(--border)',
            transition:'all 200ms var(--ease)',
          }} />
        ))}
        <span style={{flex:1}} />
        <button style={{fontSize:12.5, color:'var(--text-3)', fontWeight:500}}>Skip</button>
      </div>

      <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 40px 40px'}}>
        <div style={{fontSize:11, fontWeight:600, color:'var(--coral)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10}}>Step {step} of 3</div>
        <h2 style={{fontSize:32, fontWeight:600, letterSpacing:'-0.02em', margin:'0 0 8px', lineHeight:1.1}}>{title}</h2>
        <p style={{fontSize:14, color:'var(--text-2)', margin:'0 0 28px', lineHeight:1.45, maxWidth: 380}}>{sub}</p>

        <div style={{flex: 1, minHeight: 0}}>{body}</div>
      </div>

      <div style={{padding:'18px 40px', borderTop:'1px solid var(--hairline)', display:'flex', alignItems:'center', gap:10}}>
        {step > 1 && <button style={{fontSize:13, color:'var(--text-2)', padding:'8px 12px', fontWeight:500}}>← Back</button>}
        <span style={{flex:1}} />
        <button className="new-event-btn" style={{padding:'9px 18px', fontSize:13.5, fontWeight:600}}>
          {step === 3 ? 'Open ElevAIte' : 'Continue'} →
        </button>
      </div>
    </div>
  );
}

function OnboardA() {
  return <OnboardingStep
    step={1}
    title="Who are you using ElevAIte for?"
    sub="Pick one — we’ll tailor color presets and shortcuts. You can change this anytime."
    body={
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom: 14}}>
        {[
          { k:'student',  e:'🎓', t:'Student',  s:'Classes, study blocks, group work',  selected: true },
          { k:'startup',  e:'⚡',  t:'Startup',  s:'Standups, customer calls, shipping' },
          { k:'just-me',  e:'🧘', t:'Just me',  s:'Personal life, focus, friends' },
        ].map(o => (
          <div key={o.k} style={{
            padding:16,
            borderRadius:12,
            background: o.selected ? 'var(--coral-subtle)' : 'var(--surface)',
            border: o.selected ? '1.5px solid var(--coral)' : '1px solid var(--hairline-strong)',
            cursor:'pointer',
            position:'relative',
          }}>
            <div style={{fontSize:22, marginBottom:6}}>{o.e}</div>
            <div style={{fontSize:14, fontWeight:600, marginBottom: 2}}>{o.t}</div>
            <div style={{fontSize:11.5, color:'var(--text-2)', lineHeight:1.4}}>{o.s}</div>
            {o.selected && <div style={{position:'absolute', top:10, right:10, width:18, height:18, borderRadius:'50%', background:'var(--coral)', color:'#fff', display:'grid', placeItems:'center'}}><IconCheck size={11} stroke={3} /></div>}
          </div>
        ))}
      </div>
    } />;
}

function OnboardB() {
  const accounts = [
    {p: 'google',    e:'prem@stanford.edu',  connected:true },
    {p: 'google',    e:'prem@elevaite.so',   connected:true },
    {p: 'apple',     e:'iCloud · Family',    connected:true },
    {p: 'outlook',   e:'prem@outlook.com',   connected:false },
  ];
  return <OnboardingStep
    step={2}
    title="Connect your calendars"
    sub="Bring everything into one view. We never store your event data — it stays on your devices."
    body={
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        {accounts.map((a, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', borderRadius:10, border:'1px solid var(--hairline-strong)'}}>
            <ProviderIcon kind={a.p} />
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13.5, fontWeight:500}}>{a.e}</div>
              <div style={{fontSize:11, color:'var(--text-3)', textTransform:'capitalize'}}>{a.p}</div>
            </div>
            {a.connected ? (
              <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, color:'#3E5639', fontWeight:600, padding:'4px 9px', borderRadius:5, background:'var(--chip-sage-bg)'}}>
                <IconCheck size={11} stroke={3} /> Connected
              </span>
            ) : (
              <button style={{fontSize:12, color:'var(--coral-strong)', fontWeight:500, padding:'5px 10px', border:'1px solid var(--coral)', borderRadius:6}}>Connect</button>
            )}
          </div>
        ))}
        <button style={{marginTop: 4, fontSize:12.5, color:'var(--text-3)', textAlign:'left', padding:'6px 0', fontWeight:500}}>+ Add another account</button>
      </div>
    } />;
}

function OnboardC() {
  return <OnboardingStep
    step={3}
    title="A few things worth knowing"
    sub="ElevAIte is keyboard-first. These three shortcuts will get you 80% of the way."
    body={
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
        {[
          { k: '⌘K', t: 'Command palette', s: 'Search events, jump to dates, run any action.', vis: 'cmd' },
          { k: 'Drag', t: 'Drag to create', s: 'Drag in the grid to block off time — no popups.', vis: 'drag' },
          { k: '⌘L', t: 'Share availability', s: 'Send a link with your free slots in seconds.', vis: 'link' },
        ].map((c, i) => (
          <div key={i} style={{padding:16, borderRadius:12, background:'var(--surface)', border:'1px solid var(--hairline-strong)'}}>
            <div style={{height: 90, background:'var(--bg)', borderRadius:8, marginBottom:12, position:'relative', overflow:'hidden', border:'1px solid var(--hairline)'}}>
              <TourVis kind={c.vis} />
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom: 4}}>
              <span className="kbd" style={{fontSize:10.5}}>{c.k}</span>
              <span style={{fontSize:13.5, fontWeight:600}}>{c.t}</span>
            </div>
            <div style={{fontSize:11.5, color:'var(--text-2)', lineHeight:1.45}}>{c.s}</div>
          </div>
        ))}
      </div>
    } />;
}

function TourVis({ kind }) {
  if (kind === 'cmd') return (
    <div style={{position:'absolute', inset:8, background:'var(--bg)', border:'1px solid var(--hairline)', borderRadius:6, padding:'5px 8px', boxShadow:'var(--shadow)'}}>
      <div style={{fontSize:9.5, color:'var(--text-3)', borderBottom:'1px solid var(--hairline)', paddingBottom:4, marginBottom: 4}}>Type a command…</div>
      <div style={{fontSize:9, padding:'3px 4px', borderRadius:3, background:'var(--coral-subtle)', color:'var(--coral-strong)'}}>Go to today</div>
      <div style={{fontSize:9, padding:'3px 4px', color:'var(--text-2)'}}>Create event</div>
    </div>
  );
  if (kind === 'drag') return (
    <div style={{position:'absolute', inset: 8, display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4}}>
      {[0,1,2].map(i => (
        <div key={i} style={{background:'var(--surface-sunken)', borderRadius:4, position:'relative'}}>
          {i === 1 && <div style={{position:'absolute', top:8, left:3, right:3, height:50, background:'var(--coral-subtle)', border:'1.5px dashed var(--coral)', borderRadius:4}} />}
        </div>
      ))}
    </div>
  );
  if (kind === 'link') return (
    <div style={{position:'absolute', inset:14, background:'var(--surface)', borderRadius:6, padding:8, fontSize:9, color:'var(--text-2)'}}>
      <div style={{fontFamily:'Geist Mono', fontSize:8.5, padding:'3px 5px', background:'var(--bg)', borderRadius:3, border:'1px solid var(--hairline)', marginBottom:5}}>elevaite.so/prem/30min</div>
      <div style={{display:'flex', gap:3, flexWrap:'wrap'}}>
        {['Mon 2:00', 'Tue 11:00', 'Wed 4:00', 'Thu 10:30'].map(s => (
          <span key={s} style={{padding:'2px 4px', fontSize:8, border:'1px solid var(--coral)', borderRadius:3, color:'var(--coral-strong)'}}>{s}</span>
        ))}
      </div>
    </div>
  );
  return null;
}

function ProviderIcon({ kind }) {
  const map = {
    google: { bg: '#fff', content: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg> },
    apple:  { bg: '#000', content: <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 12.04c0-2.94 2.42-4.36 2.53-4.42-1.38-2.02-3.53-2.3-4.3-2.33-1.83-.19-3.57 1.08-4.5 1.08-.92 0-2.35-1.05-3.86-1.02-1.99.03-3.82 1.15-4.84 2.93-2.07 3.58-.53 8.87 1.49 11.78 1 1.43 2.18 3.02 3.72 2.97 1.5-.06 2.06-.96 3.86-.96s2.31.96 3.88.93c1.6-.03 2.61-1.44 3.6-2.88 1.13-1.66 1.6-3.27 1.63-3.36-.04-.01-3.13-1.2-3.16-4.76zM14.83 4.42c.83-1 1.39-2.4 1.24-3.79-1.2.05-2.65.8-3.5 1.8-.77.88-1.44 2.31-1.26 3.67 1.33.1 2.69-.68 3.52-1.68z"/></svg> },
    outlook: { bg: '#0078d4', content: <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M2 4h10v6H2zm0 7h10v6H2zm11-7h9v6h-9zm0 7h9v6h-9z"/></svg> },
  };
  const cfg = map[kind] || map.google;
  return (
    <div style={{width:32, height:32, borderRadius:7, background:cfg.bg, display:'grid', placeItems:'center', flexShrink:0, border:'1px solid var(--hairline-strong)'}}>
      {cfg.content}
    </div>
  );
}

Object.assign(window, { OnboardA, OnboardB, OnboardC });
