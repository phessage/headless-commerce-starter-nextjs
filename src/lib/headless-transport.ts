/** Shared bounded transport for bootstrap, catalog and the fixed commerce proxy. */
export const UPSTREAM_TIMEOUT_MS = 10_000;
export const MAX_REQUEST_BYTES = 64 * 1024;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export function trustedOrigin(value: string): string {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !(url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && loopback && url.protocol === 'http:'))) {
    throw new Error('Invalid commerce origin');
  }
  return url.origin;
}

export async function boundedText(stream: ReadableStream<Uint8Array> | null, limit: number, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  if (!stream) return '';
  const reader = stream.getReader();
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal?.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('Payload exceeds limit');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally { signal?.removeEventListener('abort', abort); reader.releaseLock(); }
}

export async function commerceFetch(url: URL | string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init, redirect: 'error', cache: 'no-store',
    signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]) : AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  const text = await boundedText(response.body, MAX_RESPONSE_BYTES);
  return { response, text };
}
