import { NextRequest, NextResponse } from "next/server";
import { headlessRuntime } from "../../../lib/headless-runtime";

export async function GET(request: NextRequest) {
  try {
    const runtime = await headlessRuntime();
    const upstream = new URL("/v1/headless/products", runtime.apiUrl);
    request.nextUrl.searchParams.forEach((value, name) => upstream.searchParams.set(name, value));
    const response = await fetch(upstream, { headers: { accept: "application/json", "x-publishable-key": runtime.publishableKey }, next: { revalidate: 60 } });
    return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ error: "Store is not configured for headless commerce" }, { status: 503 });
  }
}
