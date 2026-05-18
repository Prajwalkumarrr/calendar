import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? 'ElevAIte <onboarding@resend.dev>';
const APP_URL = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';

const resend = apiKey ? new Resend(apiKey) : null;

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function shellHtml(args: { eyebrow: string; headline: string; body: string; cta?: { href: string; label: string } }) {
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
          Sent by ElevAIte Calendar — the warm, fast calendar for students and startup teams.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

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
};

export async function sendBookingEmails(args: BookingEmailArgs): Promise<void> {
  if (!resend) {
    console.warn(
      '[email] RESEND_API_KEY not set — would have sent emails to:',
      args.inviteeEmail,
      'and',
      args.hostEmail,
    );
    return;
  }

  const time = `${fmt(args.start)} — ${args.durationMin} min`;
  const confirmUrl = `${APP_URL}/booked/${args.bookingId}`;

  // To invitee
  const inviteeHtml = shellHtml({
    eyebrow: "You're scheduled",
    headline: `Booked with ${args.hostName}`,
    body: `
      <p style="margin:0 0 12px;"><strong>${args.linkTitle}</strong></p>
      <p style="margin:0 0 12px;">${time}</p>
      ${args.note ? `<p style="margin:0 0 12px;padding:10px 12px;background:${palette.surface};border-radius:8px;font-style:italic;">"${args.note.replace(/</g, '&lt;')}"</p>` : ''}
      <p style="margin:14px 0 0;">A calendar event has been added to ${args.hostName}'s calendar. You'll receive a reminder before it starts.</p>
    `,
    cta: { href: confirmUrl, label: 'View booking' },
  });

  // To host
  const hostHtml = shellHtml({
    eyebrow: 'New booking',
    headline: `${args.inviteeName} just booked you`,
    body: `
      <p style="margin:0 0 12px;"><strong>${args.linkTitle}</strong></p>
      <p style="margin:0 0 12px;">${time}</p>
      <p style="margin:0 0 12px;color:${palette.text2};">From: <strong>${args.inviteeName}</strong> (${args.inviteeEmail})</p>
      ${args.note ? `<p style="margin:0 0 12px;padding:10px 12px;background:${palette.surface};border-radius:8px;font-style:italic;">"${args.note.replace(/</g, '&lt;')}"</p>` : ''}
      <p style="margin:14px 0 0;">This event has been added to your ElevAIte calendar.</p>
    `,
    cta: { href: `${APP_URL}/calendar`, label: 'Open calendar' },
  });

  try {
    await Promise.allSettled([
      resend.emails.send({
        from: FROM,
        to: args.inviteeEmail,
        subject: `Booked: ${args.linkTitle} with ${args.hostName}`,
        html: inviteeHtml,
      }),
      resend.emails.send({
        from: FROM,
        to: args.hostEmail,
        subject: `New booking · ${args.inviteeName}`,
        html: hostHtml,
      }),
    ]);
  } catch (err) {
    console.error('[email] send failed:', err);
  }
}
