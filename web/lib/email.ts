// Email module — disabled until Resend is installed.
// To enable: `npm install resend` in web/, then restore the Resend implementation
// from git history (commit 4c6fd33 "phase 5 (partial): booking emails").

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
  // No-op for now. Just log so we can confirm the call site fires.
  console.log(
    '[email] (disabled) would have sent confirmation to',
    args.inviteeEmail,
    'and notification to',
    args.hostEmail,
  );
}
