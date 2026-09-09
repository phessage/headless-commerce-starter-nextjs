import { NextRequest, NextResponse } from 'next/server';
import { headlessRuntime } from '../../../../lib/headless-runtime';
import { boundedText, commerceFetch, MAX_REQUEST_BYTES } from '../../../../lib/headless-transport';

const routes: Array<[RegExp, readonly string[]]> = [
  [/^v1\/headless\/products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/variants$/i, ['GET']],
  [/^v1\/headless\/carts$/, ['POST']],
  [/^v1\/headless\/carts\/current$/, ['GET']],
  [/^v1\/headless\/carts\/current\/items$/, ['POST']],
  [/^v1\/headless\/carts\/current\/items\/[0-9a-f-]{36}$/i, ['PATCH', 'DELETE']],
  [/^v1\/headless\/carts\/current\/checkout$/, ['GET', 'PATCH']],
  [/^v1\/headless\/carts\/current\/checkout\/(shipping-method|payment-method)$/, ['PUT']],
  [/^v1\/headless\/carts\/current\/checkout\/(order|payment-session)$/, ['POST']],
  [/^v1\/headless\/orders\/lookup$/, ['POST']],
];
const problem = (status: number, title: string, headers: Record<string, string> = {}) =>
  NextResponse.json({ type: 'about:blank', title, status }, { status, headers: { 'cache-control': 'no-store', 'content-type': 'application/problem+json', ...headers } });

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  const route = routes.find(([pattern]) => pattern.test(path));
  if (!route) return problem(404, 'Unsupported headless route');
  if (!route[1].includes(request.method)) return problem(405, 'Method not allowed', { allow: route[1].join(', ') });
  if (request.nextUrl.search) return problem(400, 'Query parameters are not supported on this route');
  const origin = request.headers.get('origin');
  const requestHost = request.headers.get('host');
  const requestProtocol = process.env.NODE_ENV === 'production' ? 'https:' : request.nextUrl.protocol;
  if (origin && origin !== `${requestProtocol}//${requestHost}`) return problem(403, 'Cross-origin request refused');
  let runtime;
  try { runtime = await headlessRuntime(); } catch { return problem(503, 'Store is not configured for headless commerce'); }
  const headers: Record<string, string> = { accept: 'application/json', 'x-publishable-key': runtime.publishableKey };
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-1ecomm-cart' : '1ecomm-cart';
  const token = request.cookies.get(cookieName)?.value ?? request.headers.get('x-cart-token');
  if (token) {
    if (!/^hc_[A-Za-z0-9_-]{43}$/.test(token)) return problem(400, 'Invalid cart capability');
    headers['x-cart-token'] = token;
  }
  const key = request.headers.get('idempotency-key');
  if (key) {
    if (!key.trim() || key.length > 120) return problem(400, 'Invalid intent key');
    headers['Idempotency-Key'] = key;
  }
  let body: string | undefined;
  if (request.method !== 'GET') {
    try {
      body = await boundedText(request.body, MAX_REQUEST_BYTES,
        AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]));
      if (body) { JSON.parse(body); headers['content-type'] = 'application/json'; }
    } catch { return problem(400, 'Invalid or oversized JSON body'); }
  }
  try {
    const { response, text } = await commerceFetch(new URL(`/${path}`, runtime.apiUrl), { method: request.method, headers, body, signal: request.signal });
    const responseHeaders: Record<string, string> = { 'content-type': response.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' };
    for (const name of ['x-request-id', 'retry-after', 'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset']) {
      const value = response.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    if (path === 'v1/headless/carts' && response.ok) {
      const created = JSON.parse(text) as Record<string, unknown>;
      const cartToken = created.cartToken;
      if (typeof cartToken !== 'string' || !/^hc_[A-Za-z0-9_-]{43}$/.test(cartToken)) throw new Error('Invalid upstream cart');
      delete created.cartToken;
      const result = NextResponse.json(created, { status: response.status, headers: responseHeaders });
      result.cookies.set(cookieName, cartToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
      return result;
    }
    return new NextResponse(response.status === 204 ? null : text, { status: response.status, headers: responseHeaders });
  } catch { return problem(502, 'Commerce service unavailable; retry with the same checkout intent'); }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
