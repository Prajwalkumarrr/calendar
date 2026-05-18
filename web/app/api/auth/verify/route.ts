import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, markEmailVerified } from '@/lib/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').toLowerCase().trim();
    const code = String(body.code ?? '').trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'email_and_code_required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      return NextResponse.json({ error: 'no_code_pending' }, { status: 400 });
    }
    if (new Date() > new Date(user.verificationCodeExpiresAt)) {
      return NextResponse.json({ error: 'code_expired' }, { status: 410 });
    }
    if (user.verificationCode !== code) {
      return NextResponse.json({ error: 'wrong_code' }, { status: 400 });
    }

    if (!user._id) return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    await markEmailVerified(user._id.toHexString());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/verify]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
