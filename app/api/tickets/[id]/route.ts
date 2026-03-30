import { NextRequest, NextResponse } from 'next/server';
import { updateTicketStatus } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json();
  const valid = ['open', 'in_progress', 'resolved', 'closed'];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  try {
    const ticket = await updateTicketStatus(params.id, status);
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
