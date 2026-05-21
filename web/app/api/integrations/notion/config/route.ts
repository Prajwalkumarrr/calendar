import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getIntegration, saveTokens } from '@/lib/integrations';

// PATCH /api/integrations/notion/config { databaseId, databaseName }
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const { databaseId, databaseName } = await req.json();
    if (typeof databaseId !== 'string') {
      return NextResponse.json({ error: 'databaseId required' }, { status: 400 });
    }

    const integration = await getIntegration(user.id, 'notion');
    if (!integration) {
      return NextResponse.json({ error: 'notion_not_connected' }, { status: 404 });
    }

    await saveTokens({
      userId: user.id,
      provider: 'notion',
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken,
      accountInfo: {
        ...integration.accountInfo,
        // Reuse the `id` field for the chosen database
        id: databaseId,
        name: databaseName ?? integration.accountInfo?.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/integrations/notion/config]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const integration = await getIntegration(user.id, 'notion');
    if (!integration) return NextResponse.json({ configured: false });
    return NextResponse.json({
      configured: !!integration.accountInfo?.id,
      databaseId: integration.accountInfo?.id,
      databaseName: integration.accountInfo?.name,
      workspace: integration.accountInfo?.workspace,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
