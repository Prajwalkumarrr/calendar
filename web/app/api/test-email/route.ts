import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '@/lib/email';

// GET /api/test-email?to=someone@example.com
// Sends a test verification email via Resend to validate the integration.
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'Pass ?to=your@email.com' }, { status: 400 });
  }

  try {
    await sendVerificationCode({ toEmail: to, toName: 'Test User', code: '123456' });
    return NextResponse.json({ ok: true, sentTo: to });
  } catch (err) {
    console.error('[test-email]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
