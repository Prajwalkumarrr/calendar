import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getProvider, makeOAuthState, type ProviderId } from '@/lib/integrations';

function appBase(req: NextRequest): string {
  return process.env.PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const user = await requireUser();
    const { provider } = await params;
    const meta = getProvider(provider as ProviderId);
    if (!meta) return NextResponse.json({ error: 'unknown_provider' }, { status: 404 });
    if (meta.status === 'coming-soon') {
      return NextResponse.json({ error: 'provider_not_available_yet' }, { status: 400 });
    }
    if (meta.status === 'needs-credentials' || !meta.authorizeUrl) {
      return NextResponse.json({
        error: 'provider_not_configured',
        message: `Add ${meta.envHint} to your environment, then try again.`,
      }, { status: 400 });
    }

    const clientIdEnv = meta.envClientId ?? `${meta.id.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`;
    const clientId = process.env[clientIdEnv];
    if (!clientId) {
      return NextResponse.json({ error: 'provider_not_configured', missing: clientIdEnv }, { status: 400 });
    }

    const state = makeOAuthState(user.id, meta.id);
    const redirectUri = `${appBase(req)}/api/integrations/${meta.id}/callback`;

    const url = new URL(meta.authorizeUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    if (meta.scope) url.searchParams.set('scope', meta.scope);
    // Provider-specific extras
    if (meta.id === 'notion') {
      url.searchParams.set('owner', 'user');
    }
    if (meta.id === 'google-calendar') {
      // Required to receive a refresh_token; prompt=consent forces it even on re-auth
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('include_granted_scopes', 'true');
    }
    if (meta.id === 'outlook') {
      // prompt=consent ensures refresh_token is always returned
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('response_mode', 'query');
    }

    return NextResponse.redirect(url.toString());
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/integrations/connect]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
