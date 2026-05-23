// Email sender — Resend-backed when RESEND_API_KEY is set,
// dev-console-logger fallback when it isn't (so local dev works without email).
//
// IMPORTANT — Resend free-tier sender restriction:
//   The default "onboarding@resend.dev" sender ONLY delivers to the email
//   address you signed up to Resend with. Every other recipient is silently
//   dropped. To send to real users you must verify a custom domain and set:
//     EMAIL_FROM=ElevAIte <noreply@yourdomain.com>
//   in your .env.local / Vercel environment variables.

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? 'ElevAIte <onboarding@resend.dev>';
const APP_URL = (process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const resend = apiKey ? new Resend(apiKey) : null;

// ─── Helpers ───────────────────────────────────────────────────────────

function fmt(d: Date) {
  return d.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function fmtShort(d: Date) {
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const p = {
  bg: '#F7F6F2',
  card: '#FFFFFF',
  border: '#E8E6DF',
  text: '#1A1917',
  muted: '#6B6862',
  subtle: '#A19D94',
  accent: '#D97757',
  accentLight: '#FDF1EC',
  green: '#2D9B6F',
  greenLight: '#EBF7F2',
};

function layout(content: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ElevAIte</title>
</head>
<body style="margin:0;padding:0;background:${p.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${p.text};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">
        <!-- Logo bar -->
        <tr><td style="padding-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:30px;height:30px;background:${p.accent};border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-weight:700;font-size:16px;line-height:30px;">E</span>
              </td>
              <td style="padding-left:10px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:${p.text};">ElevAIte</td>
            </tr>
          </table>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:${p.card};border:1px solid ${p.border};border-radius:16px;padding:36px 40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;font-size:12px;color:${p.subtle};line-height:1.6;">
          ElevAIte Calendar &nbsp;·&nbsp; <a href="${APP_URL}" style="color:${p.subtle};text-decoration:underline;">elevAIte.app</a>
          <br/>You're receiving this because you interacted with an ElevAIte scheduling link.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;background:${bg};color:${color};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:20px;">${text}</span>`;
}

function divider(): string {
  return `<div style="height:1px;background:${p.border};margin:24px 0;"></div>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:13px 22px;background:${p.text};color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:-0.01em;">${label}</a>`;
}

function metaRow(icon: string, label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;width:20px;vertical-align:top;font-size:15px;">${icon}</td>
    <td style="padding:7px 0 7px 10px;">
      <span style="font-size:12px;color:${p.subtle};display:block;margin-bottom:1px;">${label}</span>
      <span style="font-size:14px;color:${p.text};font-weight:500;">${value}</span>
    </td>
  </tr>`;
}

// ─── OTP / Verification ────────────────────────────────────────────────

export async function sendVerificationCode(args: {
  toEmail: string;
  toName?: string;
  code: string;
}): Promise<void> {
  const firstName = args.toName?.split(' ')[0] ?? 'there';

  if (!resend) {
    console.warn(
      `\n[email] RESEND_API_KEY not set — would send OTP to ${args.toEmail}\n` +
      `       Code: ${args.code}\n` +
      `       Paste this code into the verification form to test locally.\n`,
    );
    return;
  }

  const digits = args.code.split('').join('&thinsp;');

  const html = layout(`
    ${badge('Email Verification', p.accent, p.accentLight)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      Hey ${firstName}, verify your email
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      Use the code below to finish creating your ElevAIte account. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${p.subtle};margin-bottom:10px;">Your one-time code</div>
      <div style="font-family:'SF Mono','Geist Mono','Courier New',monospace;font-size:42px;font-weight:700;letter-spacing:0.18em;color:${p.text};line-height:1;">${digits}</div>
    </div>

    <p style="margin:0;font-size:13px;color:${p.subtle};line-height:1.6;">
      If you didn't create an ElevAIte account, you can safely ignore this email — no action is needed.
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: `${args.code} is your ElevAIte verification code`,
      html,
    });
  } catch (err) {
    console.error('[email] verification send failed:', err);
  }
}

// ─── Booking confirmations ─────────────────────────────────────────────

export type BookingEmailArgs = {
  inviteeName: string;
  inviteeEmail: string;
  hostName: string;
  hostEmail: string | null;   // null = skip host notification
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
      '[email] (disabled) would have sent booking confirmation to', args.inviteeEmail,
      args.hostEmail ? `and notification to ${args.hostEmail}` : '(host notifications off)',
    );
    return;
  }

  const startFmt = fmt(args.start);
  const dur = `${args.durationMin} min`;
  const confirmUrl = `${APP_URL}/booked/${args.bookingId}`;
  const providerLabel = args.meetingProvider === 'zoom' ? 'Zoom' : args.meetingProvider === 'meet' ? 'Google Meet' : 'Meeting link';

  const meetingSection = args.meetingUrl
    ? `${divider()}
       <p style="margin:0 0 6px;font-size:12px;color:${p.subtle};font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Join meeting</p>
       <a href="${args.meetingUrl}" style="display:inline-flex;align-items:center;gap:8px;padding:11px 16px;background:${p.greenLight};border:1px solid #B6E3D1;border-radius:10px;text-decoration:none;color:${p.green};font-size:14px;font-weight:500;">
         🎥&nbsp; ${providerLabel}: Join now
       </a>`
    : '';

  const noteSection = args.note
    ? `<div style="margin-top:16px;padding:14px 16px;background:${p.bg};border-left:3px solid ${p.accent};border-radius:0 8px 8px 0;font-size:14px;color:${p.muted};font-style:italic;">"${args.note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</div>`
    : '';

  // ── Invitee email ──
  const inviteeHtml = layout(`
    ${badge("You're confirmed", p.green, p.greenLight)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      Your meeting is booked!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      You have a <strong>${args.linkTitle}</strong> with <strong>${args.hostName}</strong>. Here are your details:
    </p>

    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('📅', 'Date & time', startFmt)}
        ${metaRow('⏱', 'Duration', dur)}
        ${metaRow('👤', 'With', args.hostName)}
      </table>
    </div>

    ${noteSection}
    ${meetingSection}

    ${divider()}
    <div style="margin-bottom:8px;">
      ${ctaButton(confirmUrl, 'View booking details')}
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:${p.subtle};line-height:1.6;">
      Need to cancel or reschedule? Use the link above to manage your booking.
    </p>
  `);

  // ── Host email ──
  const hostHtml = args.hostEmail ? layout(`
    ${badge('New booking', p.accent, p.accentLight)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      ${args.inviteeName} just booked you
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      Someone scheduled a <strong>${args.linkTitle}</strong> on your calendar.
    </p>

    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('👤', 'Guest', `${args.inviteeName} &lt;${args.inviteeEmail}&gt;`)}
        ${metaRow('📅', 'Date & time', startFmt)}
        ${metaRow('⏱', 'Duration', dur)}
        ${metaRow('🔗', 'Link', args.linkTitle)}
      </table>
    </div>

    ${noteSection}
    ${meetingSection}

    ${divider()}
    ${ctaButton(`${APP_URL}/calendar`, 'Open calendar')}
  `) : null;

  const sends = [
    resend.emails.send({
      from: FROM,
      to: args.inviteeEmail,
      subject: `Confirmed: ${args.linkTitle} with ${args.hostName} · ${fmtShort(args.start)}`,
      html: inviteeHtml,
    }),
  ];
  if (hostHtml && args.hostEmail) {
    sends.push(resend.emails.send({
      from: FROM,
      to: args.hostEmail,
      subject: `New booking: ${args.inviteeName} · ${fmtShort(args.start)}`,
      html: hostHtml,
    }));
  }

  try {
    await Promise.allSettled(sends);
  } catch (err) {
    console.error('[email] booking send failed:', err);
  }
}

// ─── Cancellation ─────────────────────────────────────────────────────

export type CancellationEmailArgs = {
  inviteeName: string;
  inviteeEmail: string;
  hostName: string;
  hostEmail: string;
  linkTitle: string;
  start: Date;
  durationMin: number;
};

export async function sendCancellationEmails(args: CancellationEmailArgs): Promise<void> {
  if (!resend) {
    console.log('[email] (disabled) would have sent cancellation to', args.inviteeEmail);
    return;
  }

  const startFmt = fmt(args.start);
  const dur = `${args.durationMin} min`;

  const inviteeHtml = layout(`
    ${badge('Booking cancelled', p.muted, p.bg)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      Your booking has been cancelled
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      Your <strong>${args.linkTitle}</strong> with <strong>${args.hostName}</strong> has been cancelled.
    </p>
    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('📅', 'Was scheduled for', startFmt)}
        ${metaRow('⏱', 'Duration', dur)}
      </table>
    </div>
    ${divider()}
    <p style="margin:0;font-size:14px;color:${p.muted};">Want to reschedule? Visit the original booking link to pick a new time.</p>
  `);

  const hostHtml = layout(`
    ${badge('Booking cancelled', p.muted, p.bg)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      ${args.inviteeName} cancelled their booking
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      The <strong>${args.linkTitle}</strong> slot on your calendar has been freed up.
    </p>
    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('📅', 'Was scheduled for', startFmt)}
        ${metaRow('⏱', 'Duration', dur)}
      </table>
    </div>
    ${divider()}
    ${ctaButton(`${APP_URL}/calendar`, 'Open calendar')}
  `);

  try {
    await Promise.allSettled([
      resend.emails.send({ from: FROM, to: args.inviteeEmail, subject: `Cancelled: ${args.linkTitle} with ${args.hostName}`, html: inviteeHtml }),
      resend.emails.send({ from: FROM, to: args.hostEmail, subject: `Booking cancelled: ${args.inviteeName} · ${fmtShort(args.start)}`, html: hostHtml }),
    ]);
  } catch (err) {
    console.error('[email] cancellation send failed:', err);
  }
}

// ─── Workspace invitation ──────────────────────────────────────────────

export async function sendWorkspaceInviteEmail(args: {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<void> {
  if (!resend) {
    console.log(
      `\n[email] RESEND_API_KEY not set — would send workspace invite to ${args.toEmail}\n` +
      `       Accept link: ${args.inviteUrl}\n`,
    );
    return;
  }

  const html = layout(`
    ${badge("You're invited", p.accent, p.accentLight)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      Join ${args.workspaceName} on ElevAIte
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      <strong>${args.inviterName}</strong> has invited you to join <strong>${args.workspaceName}</strong> as a <strong>${args.role}</strong>.
    </p>

    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;margin-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('🏢', 'Workspace', args.workspaceName)}
        ${metaRow('🎭', 'Your role', args.role.charAt(0).toUpperCase() + args.role.slice(1))}
        ${metaRow('⏳', 'Offer expires', args.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}
      </table>
    </div>

    ${ctaButton(args.inviteUrl, 'Accept invitation')}

    ${divider()}
    <p style="margin:0;font-size:13px;color:${p.subtle};line-height:1.6;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: args.toEmail,
      subject: `${args.inviterName} invited you to join ${args.workspaceName} on ElevAIte`,
      html,
    });
  } catch (err) {
    console.error('[email] workspace invite send failed:', err);
  }
}

// ─── Reschedule ────────────────────────────────────────────────────────

export type RescheduleEmailArgs = {
  inviteeName: string;
  inviteeEmail: string;
  hostName: string;
  hostEmail: string;
  linkTitle: string;
  oldStart: Date;
  newStart: Date;
  durationMin: number;
  bookingId: string;
};

export async function sendRescheduleEmails(args: RescheduleEmailArgs): Promise<void> {
  if (!resend) {
    console.log('[email] (disabled) would have sent reschedule notice to', args.inviteeEmail);
    return;
  }

  const newFmt = fmt(args.newStart);
  const oldFmt = fmt(args.oldStart);
  const dur = `${args.durationMin} min`;
  const confirmUrl = `${APP_URL}/booked/${args.bookingId}`;

  const inviteeHtml = layout(`
    ${badge('Rescheduled', p.accent, p.accentLight)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      Your meeting has been moved
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${p.muted};line-height:1.6;">
      Your <strong>${args.linkTitle}</strong> with <strong>${args.hostName}</strong> has been rescheduled.
    </p>
    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('📅', 'New date & time', newFmt)}
        ${metaRow('🔄', 'Previously', `<s style="color:${p.subtle};">${oldFmt}</s>`)}
        ${metaRow('⏱', 'Duration', dur)}
      </table>
    </div>
    ${divider()}
    ${ctaButton(confirmUrl, 'View updated booking')}
  `);

  const hostHtml = layout(`
    ${badge('Rescheduled', p.accent, p.accentLight)}
    <h1 style="margin:16px 0 6px;font-size:26px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;">
      ${args.inviteeName} rescheduled their booking
    </h1>
    <div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:20px 20px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${metaRow('📅', 'New date & time', newFmt)}
        ${metaRow('🔄', 'Previously', `<s style="color:${p.subtle};">${oldFmt}</s>`)}
        ${metaRow('⏱', 'Duration', dur)}
      </table>
    </div>
    ${divider()}
    ${ctaButton(`${APP_URL}/calendar`, 'Open calendar')}
  `);

  try {
    await Promise.allSettled([
      resend.emails.send({ from: FROM, to: args.inviteeEmail, subject: `Rescheduled: ${args.linkTitle} with ${args.hostName} · ${fmtShort(args.newStart)}`, html: inviteeHtml }),
      resend.emails.send({ from: FROM, to: args.hostEmail, subject: `Rescheduled: ${args.inviteeName} · ${fmtShort(args.newStart)}`, html: hostHtml }),
    ]);
  } catch (err) {
    console.error('[email] reschedule send failed:', err);
  }
}
