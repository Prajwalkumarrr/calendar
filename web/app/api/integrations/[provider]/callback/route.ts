import { NextRequest, NextResponse } from 'next/server';
import { parseOAuthState, getProvider, type ProviderId } from '@/lib/integrations';
import { exchangeZoomCode } from '@/lib/integrations/zoom';
import { exchangeGoogleCalendarCode } from '@/lib/integrations/google-calendar';

function appBase(req: NextRequest): string {
  return process.env.PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) {
      return NextResponse.redirect(`${appBase(req)}/integrations?error=missing_code_or_state`);
    }
    const parsed = parseOAuthState(state);
    if (!parsed) return NextResponse.redirect(`${appBase(req)}/integrations?error=invalid_state`);
    if (parsed.provider !== provider) {
      return NextResponse.redirect(`${appBase(req)}/integrations?error=provider_mismatch`);
    }

    const meta = getProvider(provider as ProviderId);
    if (!meta) return NextResponse.redirect(`${appBase(req)}/integrations?error=unknown_provider`);

    const redirectUri = `${appBase(req)}/api/integrations/${meta.id}/callback`;

    let ok = false;
    if (meta.id === 'zoom') {
      ok = await exchangeZoomCode({ userId: parsed.userId, code, redirectUri });
    } else if (meta.id === 'google-calendar') {
      ok = await exchangeGoogleCalendarCode({ userId: parsed.userId, code, redirectUri });
    } else {
      // Slack / Notion handlers stubbed — same shape as Zoom; add when you're ready to wire each
      console.warn(`[integrations] callback for ${meta.id} not yet implemented`);
      return NextResponse.redirect(`${appBase(req)}/integrations?error=provider_not_wired&provider=${meta.id}`);
    }

    if (!ok) {
      return NextResponse.redirect(`${appBase(req)}/integrations?error=token_exchange_failed&provider=${meta.id}`);
    }
    return NextResponse.redirect(`${appBase(req)}/integrations?connected=${meta.id}`);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/integrations/callback]', err);
    return NextResponse.redirect(`${appBase(req)}/integrations?error=callback_failed`);
  }
}
