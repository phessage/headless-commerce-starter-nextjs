import { NextRequest, NextResponse } from "next/server";
import { headlessRuntime } from "../../../../lib/headless-runtime";

const allowed = /^(?:v1\/headless\/carts(?:\/current(?:\/items(?:\/[0-9a-f-]+)?|\/checkout(?:\/(?:shipping-method|payment-method|order))?)?)?|v1\/headless\/orders\/lookup)$/;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  let runtime;
  try { runtime = await headlessRuntime(); } catch { return NextResponse.json({ error: "Store is not configured for headless commerce" }, { status: 503 }); }
  const path = (await context.params).path.join("/");
  if (!allowed.test(path))
    return NextResponse.json(
      { error: "Unsupported headless route" },
      { status: 404 },
    );
  const upstream = new URL(`/${path}`, runtime.apiUrl);
  request.nextUrl.searchParams.forEach((value, name) =>
    upstream.searchParams.append(name, value),
  );
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-publishable-key": runtime.publishableKey,
  };
  const cartToken = request.headers.get("x-cart-token");
  if (cartToken) headers["x-cart-token"] = cartToken;
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (request.headers.get("content-type"))
    headers["content-type"] = "application/json";
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.text(),
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
