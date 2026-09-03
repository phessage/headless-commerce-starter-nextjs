import config from "../../headless.config.json";

export type HeadlessRuntime = { storeId: string; apiUrl: string; publishableKey: string };
let cached: Promise<HeadlessRuntime> | undefined;
export function headlessRuntime(): Promise<HeadlessRuntime> {
  if (cached) return cached;
  if (process.env.HEADLESS_PUBLISHABLE_KEY) {
    return Promise.resolve({ storeId: process.env.HEADLESS_STORE_ID ?? '', apiUrl: process.env.HEADLESS_API_URL ?? 'https://api.1ecomm.com', publishableKey: process.env.HEADLESS_PUBLISHABLE_KEY });
  }
  const pending = (async () => {
    const storeId = process.env.HEADLESS_STORE_ID ?? config.storeId;
    const bootstrapUrl = (process.env.HEADLESS_BOOTSTRAP_URL ?? config.bootstrapUrl).replace(/\/$/, "");
    const response = await fetch(`${bootstrapUrl}/v1/headless/stores/${encodeURIComponent(storeId)}/config`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Headless store bootstrap failed (${response.status})`);
    const runtime = (await response.json()).data as HeadlessRuntime;
    if (runtime.storeId !== storeId || !runtime.publishableKey?.startsWith("pk_")) throw new Error("Invalid headless store bootstrap response");
    return runtime;
  })();
  cached = pending;
  void pending.catch(() => {
    if (cached === pending) cached = undefined;
  });
  return pending;
}
