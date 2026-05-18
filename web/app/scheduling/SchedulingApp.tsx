'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './scheduling.module.css';
import type { SchedulingLinkDTO } from '@/lib/scheduling';

export function SchedulingApp() {
  const [links, setLinks] = useState<SchedulingLinkDTO[]>([]);
  const [loading, setLoading] = useState(true);

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
          <p className={styles.sub}>
            Share a link, let people pick a time. Bookings land on your calendar.
          </p>
        </div>
        <Link href="/scheduling/new" className={styles.newBtn}>+ New link</Link>
      </div>

      {!loading && links.length === 0 && (
        <div className={styles.empty}>
          <h2 className={styles.emptyH}>No links yet.</h2>
          <p className={styles.emptyP}>Create your first booking link in 10 seconds.</p>
          <Link href="/scheduling/new" className={styles.newBtn}>Create your first link</Link>
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
              {l.description && (
                <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{l.description}</div>
              )}
              <div className={styles.cardRow}>
                <a className={styles.linkBtn} href={`/book/${l.slug}`} target="_blank" rel="noreferrer">
                  Open ↗
                </a>
                <button className={styles.copyBtn} onClick={() => copyLink(l.slug)}>
                  Copy link
                </button>
                <button className={styles.delBtn} onClick={() => remove(l.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
