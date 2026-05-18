'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      style={{
        flex: 1,
        height: 40,
        padding: '0 14px',
        background: 'var(--text)',
        color: 'var(--bg)',
        border: 0,
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      Sign out
    </button>
  );
}
