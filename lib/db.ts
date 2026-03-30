import { sql } from '@vercel/postgres';

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS tickets (
      id            SERIAL PRIMARY KEY,
      ticket_id     VARCHAR(20)  UNIQUE NOT NULL,
      reporter      VARCHAR(255),
      slack_user_id VARCHAR(50),
      description   TEXT,
      task_id       VARCHAR(50),
      status        VARCHAR(20)  DEFAULT 'open',
      channel       VARCHAR(100),
      channel_id    VARCHAR(50),
      message_ts    VARCHAR(50),
      permalink     VARCHAR(500),
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  DEFAULT NOW()
    );
  `;
}

export async function getNextTicketId(): Promise<string> {
  const result = await sql`SELECT ticket_id FROM tickets ORDER BY id DESC LIMIT 1;`;
  if (result.rows.length === 0) return 'YOS-0001';
  const last = result.rows[0].ticket_id as string;
  const num = parseInt(last.replace('YOS-', ''), 10);
  return `YOS-${String(num + 1).padStart(4, '0')}`;
}

export async function createTicket(data: {
  ticket_id: string; reporter: string; slack_user_id: string;
  description: string; task_id: string | null;
  channel: string; channel_id: string; message_ts: string; permalink: string;
}) {
  const result = await sql`
    INSERT INTO tickets (ticket_id, reporter, slack_user_id, description, task_id, channel, channel_id, message_ts, permalink)
    VALUES (${data.ticket_id}, ${data.reporter}, ${data.slack_user_id}, ${data.description},
            ${data.task_id}, ${data.channel}, ${data.channel_id}, ${data.message_ts}, ${data.permalink})
    RETURNING *;
  `;
  return result.rows[0];
}

export async function getTickets(status?: string) {
  if (status && status !== 'all') {
    return (await sql`SELECT * FROM tickets WHERE status = ${status} ORDER BY created_at DESC;`).rows;
  }
  return (await sql`SELECT * FROM tickets ORDER BY created_at DESC;`).rows;
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const result = await sql`UPDATE tickets SET status = ${status}, updated_at = NOW() WHERE ticket_id = ${ticketId} RETURNING *;`;
  return result.rows[0];
}

export async function getStats() {
  const result = await sql`
    SELECT COUNT(*) FILTER (WHERE status = 'open') AS open,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
           COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
           COUNT(*) AS total FROM tickets;
  `;
  return result.rows[0];
}
