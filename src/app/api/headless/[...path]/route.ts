import { NextRequest, NextResponse } from "next/server";

const allowed =
  /^v1\/headless\/carts(?:\/current(?:\/items(?:\/[0-9a-f-]+)?|\/checkout(?:\/(?:shipping-method|payment-method))?)?)?$/;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const apiUrl = process.env.HEADLESS_API_URL;
  const key = process.env.HEADLESS_PUBLISHABLE_KEY;
  const path = (await context.params).path.join("/");
  if (!apiUrl || !key)
    return NextResponse.json(
      { error: "Live headless API is not configured" },
      { status: 503 },
    );
  if (!allowed.test(path))
    return NextResponse.json(
      { error: "Unsupported headless route" },
      { status: 404 },
    );
  const upstream = new URL(`/${path}`, apiUrl);
  request.nextUrl.searchParams.forEach((value, name) =>
    upstream.searchParams.append(name, value),
  );
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-publishable-key": key,
  };
  const cartToken = request.headers.get("x-cart-token");
  if (cartToken) headers["x-cart-token"] = cartToken;
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
