// Email sender — Resend-backed when RESEND_API_KEY is set,
// dev-console-logger fallback when it isn't (so local dev works without email).
//
// To go live:
//   1. npm install (resend is in deps)
//   2. Sign up at https://resend.com, copy API key
//   3. Set RESEND_API_KEY in web/.env.local
//   4. Set EMAIL_FROM to "Your Name <you@yourdomain.com>" once you verify a domain
//      (Until then, the default "onboarding@resend.dev" sender only delivers to
//      the email you signed up to Resend with.)

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? 'ElevAIte <onboarding@resend.dev>';
const APP_URL = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';

const resend = apiKey ? new Resend(apiKey) : null;

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const palette = {
  bg: '#FAF9F5',
  surface: '#F5F4ED',
  surfaceUp: '#FDFCF8',
  text: '#1F1E1B',
  text2: '#6B6862',
  text3: '#A19D94',
  coral: '#D97757',
  hairline: 'rgba(31,30,27,0.1)',
};

function shellHtml(args: {
  eyebrow: string;
  headline: string;
  body: string;
  cta?: { href: string; label: string };
}): string {
  const { eyebrow, headline, body, cta } = args;
  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:${palette.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${palette.text};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${palette.bg};padding:32px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" width="520" style="background:${palette.surfaceUp};border:1px solid ${palette.hairline};border-radius:14px;padding:32px;">
      <tr><td>
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:24px;height:24px;border-radius:6px;background:${palette.coral};display:inline-block;line-height:24px;color:#fff;text-align:center;font-weight:700;">E</div>
          <span style="font-weight:600;font-size:15px;letter-spacing:-0.01em;">ElevAIte</span>
        </div>
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${palette.coral};font-weight:600;margin-bottom:10px;">${eyebrow}</div>
        <h1 style="font-size:24px;font-weight:600;letter-spacing:-0.018em;margin:0 0 14px;line-height:1.2;">${headline}</h1>
        <div style="font-size:14.5px;line-height:1.6;color:${palette.text2};">${body}</div>
        ${
          cta
            ? `<div style="margin-top:24px;"><a href="${cta.href}" style="display:inline-block;padding:12px 18px;background:${palette.text};color:${palette.bg};text-decoration:none;border-radius:9px;font-size:13.5px;font-weight:500;">${cta.label}</a></div>`
            : ''
        }
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${palette.hairline};font-size:11.5px;color:${palette.text3};">
          Sent by ElevAIte Calendar.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── Verification code ─────────────────────────────────────────────

export async function sendVerificationCode(args: {
  toEmail: string;
  toName?: string;
  code: string;
}): Promise<void> {
  if (!resend) {
    console.warn(
      `\n[email] RESEND_API_KEY not set — would send verification code to ${args.toEmail}\n` +
      `       Code: ${args.code}\n` +
      `       Copy that code into the verification form to test locally.\n`,
    );
    return;
  }

  const html = shellHtml({
    eyebrow: 'Verify your email',
    headline: `Welcome${args.toName ? `, ${args.toName}` : ''} 👋`,
    body: `
      <p style="margin:0 0 14px;">Enter this code in ElevAIte to finish creating your account:</p>
      <div style="font-family:'SF Mono','Geist Mono',monospace;font-size:36px;font-weight:600;letter-spacing:0.16em;color:${palette.text};padding:18px 0;text-align:center;background:${palette.surface};border-radius:10px;">
        ${args.code}
      </div>
      <p style="margin:14px 0 0;font-size:13px;color:${palette.text3};">This code expires in 10 minutes. If you didn't sign up, you can safely ignore this email.</p>
    `,
  });

  try {
    await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: `Your ElevAIte code: ${args.code}`,
      html,
    });
  } catch (err) {
    console.error('[email] verification send failed:', err);
  }
}

// ─── Booking confirmations (existing) ────────────────────────────────

export type BookingEmailArgs = {
  inviteeName: string;
  inviteeEmail: string;
  hostName: string;
  hostEmail: string;
  linkTitle: string;
  start: Date;
  end: Date;
  durationMin: number;
  bookingId: string;
  note?: string;
  meetingUrl?: string;
  meetingProvider?: 'zoom' | 'meet' | 'custom';
};

export async function sendBookingEmails(args: BookingEmailArgs): Promise<void> {
  if (!resend) {
    console.log(
      '[email] (disabled) would have sent booking confirmation to',
      args.inviteeEmail,
      'and notification to',
      args.hostEmail,
    );
    return;
  }

  const time = `${fmt(args.start)} — ${args.durationMin} min`;
  const confirmUrl = `${APP_URL}/booked/${args.bookingId}`;
  const providerLabel = args.meetingProvider === 'zoom' ? 'Zoom' : args.meetingProvider === 'meet' ? 'Google Meet' : 'Video';
  const meetingBlock = args.meetingUrl
    ? `<p style="margin:0 0 12px;padding:10px 12px;background:${palette.surface};border-radius:8px;">
         <strong>${providerLabel}:</strong>
         <a href="${args.meetingUrl}" style="color:${palette.coral};text-decoration:none;">${args.meetingUrl}</a>
       </p>`
    : '';

  const inviteeHtml = shellHtml({
    eyebrow: "You're scheduled",
    headline: `Booked with ${args.hostName}`,
    body: `
      <p style="margin:0 0 12px;"><strong>${args.linkTitle}</strong></p>
      <p style="margin:0 0 12px;">${time}</p>
      ${meetingBlock}
      ${args.note ? `<p style="margin:0 0 12px;padding:10px 12px;background:${palette.surface};border-radius:8px;font-style:italic;">"${args.note.replace(/</g, '&lt;')}"</p>` : ''}
      <p style="margin:14px 0 0;">A calendar event has been added to ${args.hostName}'s calendar. You'll receive a reminder before it starts.</p>
    `,
    cta: { href: confirmUrl, label: 'View booking' },
  });

  const hostHtml = shellHtml({
    eyebrow: 'New booking',
    headline: `${args.inviteeName} just booked you`,
    body: `
      <p style="margin:0 0 12px;"><strong>${args.linkTitle}</strong></p>
      <p style="margin:0 0 12px;">${time}</p>
      <p style="margin:0 0 12px;color:${palette.text2};">From: <strong>${args.inviteeName}</strong> (${args.inviteeEmail})</p>
      ${meetingBlock}
      ${args.note ? `<p style="margin:0 0 12px;padding:10px 12px;background:${palette.surface};border-radius:8px;font-style:italic;">"${args.note.replace(/</g, '&lt;')}"</p>` : ''}
      <p style="margin:14px 0 0;">This event has been added to your ElevAIte calendar.</p>
    `,
    cta: { href: `${APP_URL}/calendar`, label: 'Open calendar' },
  });

  try {
    await Promise.allSettled([
      resend.emails.send({ from: FROM, to: args.inviteeEmail, subject: `Booked: ${args.linkTitle} with ${args.hostName}`, html: inviteeHtml }),
      resend.emails.send({ from: FROM, to: args.hostEmail, subject: `New booking · ${args.inviteeName}`, html: hostHtml }),
    ]);
  } catch (err) {
    console.error('[email] send failed:', err);
  }
}
