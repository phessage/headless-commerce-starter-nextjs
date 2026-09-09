import { NextResponse } from 'next/server';
import { headlessRuntime } from '../../../lib/headless-runtime';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await headlessRuntime();
    return NextResponse.json({ status: 'ready' }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
