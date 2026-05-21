import { getCurrentUser } from '@/lib/session';
import { getProviders, listIntegrations, type ProviderMeta, type IntegrationDTO } from '@/lib/integrations';
import { IntegrationsApp } from './IntegrationsApp';

export const metadata = { title: 'Integrations · ElevAIte' };
export const dynamic = 'force-dynamic';

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; provider?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const providers: ProviderMeta[] = getProviders();
  const connected: IntegrationDTO[] = user ? await listIntegrations(user.id) : [];
  return (
    <IntegrationsApp
      signedIn={Boolean(user)}
      providers={providers}
      connected={connected}
      flash={{
        connected: sp.connected,
        error: sp.error,
        provider: sp.provider,
      }}
    />
  );
}
