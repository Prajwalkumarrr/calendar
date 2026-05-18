import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, setVerificationCode } from '@/lib/users';
import { sendVerificationCode } from '@/lib/email';

function makeCode(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });

    const user = await findUserByEmail(email);
    // For privacy, return ok=true whether the user exists or not.
    if (!user || !user._id) return NextResponse.json({ ok: true });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const code = makeCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await setVerificationCode(user._id.toHexString(), code, expiresAt);
    void sendVerificationCode({ toEmail: email, toName: user.name, code });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/resend-code]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
