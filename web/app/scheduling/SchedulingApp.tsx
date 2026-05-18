'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './scheduling.module.css';
import type { SchedulingLinkDTO } from '@/lib/scheduling';

const DURATIONS = [15, 30, 45, 60, 90];

export function SchedulingApp() {
  const [links, setLinks] = useState<SchedulingLinkDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/scheduling-links');
      const data = await res.json();
      setLinks(data.links ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('Delete this link? Existing bookings stay on your calendar.')) return;
    await fetch(`/api/scheduling-links/${id}`, { method: 'DELETE' });
    load();
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className={styles.page}>
      <Link href="/calendar" className={styles.back}>← Calendar</Link>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <h1 className={styles.title}>Scheduling links</h1>
          <p className={styles.sub}>Share a link, let people pick a time. Bookings land on your calendar.</p>
        </div>
        <button className={styles.newBtn} onClick={() => setShowNew(true)}>+ New link</button>
      </div>

      {!loading && links.length === 0 && (
        <div className={styles.empty}>
          <h2 className={styles.emptyH}>No links yet.</h2>
          <p className={styles.emptyP}>Create your first booking link in 10 seconds.</p>
          <button className={styles.newBtn} onClick={() => setShowNew(true)}>Create your first link</button>
        </div>
      )}

      {links.length > 0 && (
        <div className={styles.grid}>
          {links.map((l) => (
            <div key={l.id} className={styles.card}>
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{l.title}</h3>
                <span className={styles.duration}>{l.durationMin} min</span>
              </div>
              <div className={styles.slug}>/book/{l.slug}</div>
              {l.description && <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{l.description}</div>}
              <div className={styles.cardRow}>
                <a className={styles.linkBtn} href={`/book/${l.slug}`} target="_blank" rel="noreferrer">Open ↗</a>
                <button className={styles.copyBtn} onClick={() => copyLink(l.slug)}>Copy link</button>
                <button className={styles.delBtn} onClick={() => remove(l.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewLinkModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function NewLinkModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('30-min meeting');
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/scheduling-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, durationMin: duration, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.scrim} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2 className={styles.modalH}>New scheduling link</h2>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Title</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Duration</span>
          <select className={styles.select} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Description (optional)</span>
          <textarea className={styles.textarea} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything the invitee should know" />
        </label>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -6 }}>
          Default availability: Mon–Fri 9am–5pm in your local time. You can change this later.
        </div>
        {error && <div className={styles.err}>{error}</div>}
        <div className={styles.modalFoot}>
          <button className={styles.btn} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={busy}>
            {busy ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </div>
    </div>
  );
}
