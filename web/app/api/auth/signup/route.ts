import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createCredentialsUser, findUserByEmail, setVerificationCode } from '@/lib/users';
import { sendVerificationCode } from '@/lib/email';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function makeCode(): string {
  // 6-digit numeric, leading zeros allowed
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
}

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

    const code = makeCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 min
    const hash = await bcrypt.hash(password, 10);

    const existing = await findUserByEmail(email);
    if (existing) {
      // If they already exist + verified, refuse signup. Otherwise refresh the code.
      if (existing.emailVerified) {
        return NextResponse.json({ error: 'email_in_use' }, { status: 409 });
      }
      if (!existing._id) {
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
      }
      // Unverified user re-trying signup — refresh code (but keep their existing password)
      await setVerificationCode(existing._id.toHexString(), code, expiresAt);
      void sendVerificationCode({ toEmail: email, toName: name ?? existing.name, code });
      return NextResponse.json({ ok: true, resent: true });
    }

    await createCredentialsUser({
      email,
      passwordHash: hash,
      name,
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
    });
    void sendVerificationCode({ toEmail: email, toName: name, code });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
