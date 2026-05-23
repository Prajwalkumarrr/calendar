import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createCredentialsUser, findUserByEmail, markEmailVerified } from '@/lib/users';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').toLowerCase().trim();
    const password = String(body.password ?? '');
    const name = body.name ? String(body.name).trim().slice(0, 80) : undefined;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    }
    if (password.length > 200) {
      return NextResponse.json({ error: 'password_too_long' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json({ error: 'email_in_use' }, { status: 409 });
      }
      // Unverified account exists — mark it verified now and update password
      if (!existing._id) {
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
      }
      await markEmailVerified(existing._id.toHexString());
      return NextResponse.json({ ok: true });
    }

    const hash = await bcrypt.hash(password, 10);
    await createCredentialsUser({
      email,
      passwordHash: hash,
      name,
      emailVerified: new Date(), // verified immediately — no OTP needed
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
