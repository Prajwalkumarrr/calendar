'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import '../calendar/proto.css';
import './inbox.css';
import {
  IconCalendar, IconChevronLeft, IconChevronRight, IconLink, IconMoon,
  IconPlus, IconSearch, IconSettings, IconSidebar,
} from '../calendar/Icons';
import type { NotificationDTO } from '@/lib/notifications';
import { useAppearance } from '@/lib/useAppearance';

const KIND_ICON: Record<string, string> = {
  'booking.created': '📅',
  'booking.cancelled': '🚫',
  'booking.rescheduled': '↻',
  'event.invited': '✉️',
  'event.updated': '✏️',
  'event.cancelled': '🗑️',
  'rsvp.received': '✓',
  'system': 'ⓘ',
};

const KIND_LABEL: Record<string, string> = {
  'booking.created': 'New booking',
  'booking.cancelled': 'Booking cancelled',
  'booking.rescheduled': 'Booking rescheduled',
  'event.invited': 'Event invitation',
  'event.updated': 'Event updated',
  'event.cancelled': 'Event cancelled',
  'rsvp.received': 'RSVP received',
  'system': 'System',
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function actorInitial(n?: string): string {
  return (n ?? '?').trim()[0]?.toUpperCase() ?? '?';
}

export function InboxApp({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const fetchInbox = useCallback(async () => {
    const res = await fetch('/api/inbox');
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
    setUnread(data.unreadCount ?? 0);
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // Theme — managed by useAppearance hook
  const [appearance, setAppearance] = useAppearance();
  const theme = appearance.theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : appearance.theme;
  const toggleTheme = () => {
    setAppearance('theme', theme === 'light' ? 'dark' : 'light');
  };

  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter((i) => !i.read);
    return items;
  }, [items, filter]);

  const active = useMemo(() => items.find((i) => i.id === activeId) ?? null, [items, activeId]);

  // Auto-mark active item as read
  useEffect(() => {
    if (!active || active.read) return;
    fetch(`/api/inbox/${active.id}`, { method: 'PATCH' }).then(() => fetchInbox());
  }, [active, fetchInbox]);

  async function markAllRead() {
    await fetch('/api/inbox', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allRead: true }),
    });
    fetchInbox();
  }

  async function removeItem(id: string) {
    await fetch(`/api/inbox/${id}`, { method: 'DELETE' });
    if (activeId === id) setActiveId(null);
    fetchInbox();
  }

  const userInitial = (userName ?? userEmail ?? 'U').trim()[0]?.toUpperCase() ?? 'U';

  return (
    <div className="ib-shell">
      {/* Topbar (reused from proto.css) */}
      <header className="topbar">
        <button className="icon-btn" title="Toggle sidebar"><IconSidebar /></button>
        <Link href="/home" className="topbar__brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="topbar__brand-mark">E</div>
          ElevAIte
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn"><IconChevronLeft /></button>
          <button className="icon-btn"><IconChevronRight /></button>
        </div>
        <div className="topbar__date">Inbox</div>
        <div style={{ flex: 1 }} />
        <button className="search-trigger">
          <IconSearch size={14} />
          <span className="search-trigger__placeholder">Search or command…</span>
          <span className="kbd">⌘K</span>
        </button>
        <button className="icon-btn" onClick={toggleTheme}><IconMoon /></button>
        <button
          className="avatar"
          onClick={() => signOut({ callbackUrl: '/' })}
          title={userEmail}
        >
          {userInitial}
        </button>
      </header>

      <div className="ib-main">
        {/* Sidebar — same shape as /home */}
        <aside className="ib-side">
          <Link className="ib-nav-item" href="/home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
            Home
          </Link>
          <Link className="ib-nav-item" href="/calendar">
            <IconCalendar size={14} />
            Calendar
          </Link>
          <Link className="ib-nav-item on" href="/inbox">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
            Inbox
            {unread > 0 && <span className="ib-nav-item__badge">{unread}</span>}
          </Link>
          <Link className="ib-nav-item" href="/scheduling">
            <IconLink size={14} />
            Scheduling links
          </Link>
          <Link className="ib-nav-item" href="/settings">
            <IconSettings size={14} />
            Settings
          </Link>
        </aside>

        {/* List column */}
        <div className="ib-list">
          <div className="ib-list__head">
            <h2>Inbox</h2>
            <span className="ib-list__count">
              {unread > 0 ? `${unread} unread` : 'all caught up'}
            </span>
            <button
              className="ib-list__action"
              onClick={markAllRead}
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>
          <div className="ib-filters">
            <button className={`ib-filter ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
              All
            </button>
            <button className={`ib-filter ${filter === 'unread' ? 'on' : ''}`} onClick={() => setFilter('unread')}>
              Unread{unread > 0 && ` (${unread})`}
            </button>
          </div>

          <div className="ib-scroll">
            {filtered.length === 0 ? (
              <div className="ib-empty">
                {filter === 'unread' ? "You're caught up. 🎉" : 'No notifications yet.'}
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`ib-item ${activeId === n.id ? 'on' : ''} ${!n.read ? 'unread' : ''}`}
                  onClick={() => setActiveId(n.id)}
                >
                  <span className="ib-item__dot" />
                  <div className="ib-item__body">
                    <div className="ib-item__row1">
                      <span className="ib-item__title">
                        {KIND_ICON[n.kind] ?? '•'} {n.title}
                      </span>
                      <span className="ib-item__time">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.body && <div className="ib-item__body2">{n.body}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail column */}
        <div className="ib-detail">
          {!active ? (
            <div className="ib-detail__empty">Pick a notification to view it.</div>
          ) : (
            <>
              <div className="ib-detail__kind">{KIND_LABEL[active.kind] ?? 'Notification'}</div>
              <h1 className="ib-detail__title">{active.title}</h1>
              <div className="ib-detail__time">{new Date(active.createdAt).toLocaleString()}</div>
              {active.body && <div className="ib-detail__body">{active.body}</div>}

              {active.actorName && (
                <div className="ib-detail__actor">
                  <div className="ib-detail__actor-avatar">{actorInitial(active.actorName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ib-detail__actor-name">{active.actorName}</div>
                    {active.actorEmail && <div className="ib-detail__actor-email">{active.actorEmail}</div>}
                  </div>
                </div>
              )}

              <div className="ib-detail__actions">
                {active.href && (
                  <Link href={active.href} className="ib-detail__cta">
                    Open
                  </Link>
                )}
                <button className="ib-detail__ghost" onClick={() => removeItem(active.id)}>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
