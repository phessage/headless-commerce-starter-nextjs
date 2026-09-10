import { NextResponse } from 'next/server';
import { headlessRuntime } from '../../../lib/headless-runtime';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const runtime = await headlessRuntime();
    return NextResponse.json({ status: 'ready', storeId: runtime.storeId, apiOrigin: runtime.apiUrl }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
