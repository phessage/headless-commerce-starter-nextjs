import { NextRequest, NextResponse } from "next/server";
import { commerceFetch } from '../../../lib/headless-transport';
import { headlessRuntime } from "../../../lib/headless-runtime";

export async function GET(request: NextRequest) {
  try {
    const runtime = await headlessRuntime();
    const upstream = new URL("/v1/headless/products", runtime.apiUrl);
    request.nextUrl.searchParams.forEach((value, name) => upstream.searchParams.set(name, value));
    const { response, text } = await commerceFetch(upstream, { headers: { accept: "application/json", "x-publishable-key": runtime.publishableKey }, signal: request.signal });
    return new NextResponse(text, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Store is not configured for headless commerce" }, { status: 503 });
  }
}
