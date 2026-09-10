import { deploymentMode } from './deployment-policy';
import config from '../../headless.config.json';
import { commerceFetch, trustedOrigin } from './headless-transport';

export type HeadlessRuntime = { storeId: string; apiUrl: string; publishableKey: string; deploymentMode: 'merchant' | 'acceptance' };
let cached: { until: number; promise: Promise<HeadlessRuntime> } | undefined;
export function headlessRuntime(): Promise<HeadlessRuntime> {
  if (cached && cached.until > Date.now()) return cached.promise;
  const pending = (async () => {
    const storeId = process.env.HEADLESS_STORE_ID ?? config.storeId;
    if (!/^[0-9a-f-]{36}$/i.test(storeId)) throw new Error('A valid store ID is required');
    const mode = deploymentMode(storeId, process.env);
    const bootstrapUrl = trustedOrigin(process.env.HEADLESS_BOOTSTRAP_URL ?? 'https://api.1ecomm.com');
    // The operator, never a browser/bootstrap response, chooses the API trust root.
    const apiUrl = trustedOrigin(process.env.HEADLESS_API_URL ?? bootstrapUrl);
    if (process.env.HEADLESS_PUBLISHABLE_KEY) {
      const publishableKey = process.env.HEADLESS_PUBLISHABLE_KEY;
      if (!publishableKey.startsWith('pk_')) throw new Error('Expected a publishable key');
      return { storeId, apiUrl, publishableKey, deploymentMode: mode };
    }
    const { response, text } = await commerceFetch(`${bootstrapUrl}/v1/headless/stores/${encodeURIComponent(storeId)}/config`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Headless store bootstrap failed (${response.status})`);
    const value: unknown = JSON.parse(text);
    const runtime = (value as { data?: Partial<HeadlessRuntime> & { apiVersion?: string } })?.data;
    if (!runtime || runtime.storeId !== storeId || typeof runtime.publishableKey !== 'string' || !runtime.publishableKey.startsWith('pk_') || runtime.apiVersion !== 'v1' || typeof runtime.apiUrl !== 'string' || trustedOrigin(runtime.apiUrl) !== apiUrl) {
      throw new Error('Invalid headless store bootstrap response');
    }
    return { storeId, apiUrl, publishableKey: runtime.publishableKey, deploymentMode: mode };
  })();
  cached = { until: Date.now() + 60_000, promise: pending };
  void pending.catch(() => { if (cached?.promise === pending) cached = undefined; });
  return pending;
}
