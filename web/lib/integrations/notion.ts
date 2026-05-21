import { getIntegration, saveTokens } from '@/lib/integrations';

const TOKEN_URL = 'https://api.notion.com/v1/oauth/token';
const NOTION_VERSION = '2022-06-28';
const GRAPH_BASE = 'https://api.notion.com/v1';

type NotionTokenResponse = {
  access_token: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string;
  owner?: { user?: { id?: string; name?: string; person?: { email?: string } } };
  duplicated_template_id?: string | null;
};

export async function exchangeNotionCode(args: {
  userId: string;
  code: string;
  redirectUri: string;
}): Promise<boolean> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  // Notion requires Basic auth — credentials in Authorization header, not request body
  const body = JSON.stringify({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Notion-Version': NOTION_VERSION,
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body,
  });

  if (!res.ok) {
    console.error('[notion] token exchange failed:', res.status, await res.text());
    return false;
  }

  const data: NotionTokenResponse = await res.json();
  if (!data.access_token) {
    console.error('[notion] no access_token in response');
    return false;
  }

  await saveTokens({
    userId: args.userId,
    provider: 'notion',
    accessToken: data.access_token,
    accountInfo: {
      id: data.workspace_id,
      workspace: data.workspace_name,
      email: data.owner?.user?.person?.email,
      name: data.owner?.user?.name,
    },
  });

  return true;
}

// ── Database picker ───────────────────────────────────────────────────

type NotionDatabase = {
  id: string;
  title: string;
};

export async function listNotionDatabases(userId: string): Promise<NotionDatabase[]> {
  const integration = await getIntegration(userId, 'notion');
  if (!integration) return [];

  const res = await fetch(`${GRAPH_BASE}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({ filter: { value: 'database', property: 'object' } }),
  });

  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).map((db: { id: string; title?: { plain_text?: string }[] }) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text ?? 'Untitled',
  }));
}

// ── Mirror event to Notion database ──────────────────────────────────

type NotionEventInput = {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
};

export async function mirrorEventToNotion(
  userId: string,
  databaseId: string,
  event: NotionEventInput,
): Promise<string | null> {
  const integration = await getIntegration(userId, 'notion');
  if (!integration) return null;

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: event.title } }] },
    Date: {
      date: {
        start: event.start.toISOString(),
        end: event.end.toISOString(),
      },
    },
  };

  if (event.location) {
    properties['Location'] = { rich_text: [{ text: { content: event.location } }] };
  }

  const children = event.description
    ? [{
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: event.description.slice(0, 2000) } }] },
      }]
    : [];

  const res = await fetch(`${GRAPH_BASE}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children,
    }),
  });

  if (!res.ok) {
    console.error('[notion] createPage failed:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.id ?? null;
}
