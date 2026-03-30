import { NextRequest, NextResponse } from 'next/server';
import { getTickets, getStats } from '@/lib/db';

export async function GET(req: NextRequest) {
  const status = new URL(req.url).searchParams.get('status') ?? 'all';
  try {
    const [tickets, stats] = await Promise.all([getTickets(status), getStats()]);
    return NextResponse.json({ tickets, stats });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
