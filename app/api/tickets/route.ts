import { NextRequest, NextResponse } from 'next/server';
import { getTickets, getStats, getWorkspaces } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'all';
  const workspace = url.searchParams.get('workspace') ?? 'all';
  try {
    const [tickets, stats, workspaces] = await Promise.all([
      getTickets(status, workspace),
      getStats(workspace),
      getWorkspaces(),
    ]);
    return NextResponse.json({ tickets, stats, workspaces });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
