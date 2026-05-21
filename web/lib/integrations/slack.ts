import { getIntegration, saveTokens } from '@/lib/integrations';

const TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const CHAT_POST = 'https://slack.com/api/chat.postMessage';

type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  access_token?: string; // bot token (xoxb-...)
  authed_user?: { id?: string };
  team?: { id?: string; name?: string };
  bot_user_id?: string;
  incoming_webhook?: { channel?: string; channel_id?: string; url?: string };
};

export async function exchangeSlackCode(args: {
  userId: string;
  code: string;
  redirectUri: string;
}): Promise<boolean> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  // Slack uses Basic auth for token exchange
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body,
  });

  if (!res.ok) {
    console.error('[slack] token exchange HTTP error:', res.status);
    return false;
  }

  const data: SlackOAuthResponse = await res.json();
  if (!data.ok || !data.access_token) {
    console.error('[slack] token exchange failed:', data.error);
    return false;
  }

  await saveTokens({
    userId: args.userId,
    provider: 'slack',
    accessToken: data.access_token,
    accountInfo: {
      id: data.authed_user?.id,
      workspace: data.team?.name,
      // Store default channel from incoming_webhook if granted
      name: data.incoming_webhook?.channel ?? data.team?.name,
    },
  });

  return true;
}

export async function postSlackMessage(
  userId: string,
  text: string,
  channel?: string,
): Promise<boolean> {
  const integration = await getIntegration(userId, 'slack');
  if (!integration) return false;

  // Use stored default channel or provided one
  const target = channel ?? integration.accountInfo?.name ?? '#general';

  const res = await fetch(CHAT_POST, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: target, text }),
  });

  if (!res.ok) {
    console.error('[slack] chat.postMessage HTTP error:', res.status);
    return false;
  }
  const data = await res.json();
  if (!data.ok) {
    console.error('[slack] chat.postMessage failed:', data.error);
    return false;
  }
  return true;
}
