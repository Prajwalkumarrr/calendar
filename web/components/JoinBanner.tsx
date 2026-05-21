'use client';

import { useEffect, useState } from 'react';
import { useJoinBanner } from '@/lib/useJoinBanner';

function pad(n: number) { return String(n).padStart(2, '0'); }

function countdown(start: Date): string {
  const diff = Math.max(0, Math.round((start.getTime() - Date.now()) / 1000));
  if (diff === 0) return 'starting now';
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m > 0 ? `${m}:${pad(s)}` : `${s}s`;
}

function providerLabel(p?: string) {
  if (p === 'zoom') return 'Zoom';
  if (p === 'meet') return 'Meet';
  if (p === 'teams') return 'Teams';
  return 'Join';
}

export function JoinBanner() {
  const { meeting, dismiss } = useJoinBanner();
  const [tick, setTick] = useState(0);

  // Re-render every second for the live countdown
  useEffect(() => {
    if (!meeting) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [meeting]);

  if (!meeting) return null;

  const cd = countdown(meeting.start);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      background: 'var(--bg)',
      border: '1px solid var(--hairline-strong)',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '16px 18px',
      maxWidth: '300px',
      width: '100%',
      fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
      animation: 'join-banner-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
    }}>
      <style>{`
        @keyframes join-banner-in {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Dismiss */}
      <button onClick={dismiss} style={{
        position: 'absolute', top: '10px', right: '12px',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-3)', fontSize: '16px', lineHeight: 1, padding: '2px 4px',
      }}>×</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--coral)', display: 'grid', placeItems: 'center',
          color: '#fff', fontSize: '15px', flexShrink: 0,
        }}>
          {meeting.provider === 'zoom' ? 'Z' : meeting.provider === 'meet' ? 'M' : '▶'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '1px' }}>Meeting starting</div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meeting.title}
          </div>
        </div>
      </div>

      {/* Countdown + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '20px', fontWeight: 700,
          color: cd === 'starting now' ? 'var(--coral)' : 'var(--text)',
          letterSpacing: '-0.02em',
        }}>
          {cd}
        </span>
        <a
          href={meeting.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'var(--coral)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {providerLabel(meeting.provider)} →
        </a>
      </div>
    </div>
  );
}
