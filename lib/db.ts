import { sql } from '@vercel/postgres';

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(20) UNIQUE NOT NULL,
      workspace_id VARCHAR(50) DEFAULT 'unknown',
      workspace_name VARCHAR(100) DEFAULT 'Unknown',
      reporter VARCHAR(255),
      slack_user_id VARCHAR(50),
      description TEXT,
      task_id VARCHAR(50),
      status VARCHAR(20) DEFAULT 'open',
      channel VARCHAR(100),
      channel_id VARCHAR(50),
      message_ts VARCHAR(50),
      permalink VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  // Migrate existing tables
  await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(50) DEFAULT 'unknown';`;
  await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS workspace_name VARCHAR(100) DEFAULT 'Unknown';`;
}

export function getWorkspacePrefix(workspaceName: string): string {
  const clean = workspaceName.replace(/[^a-zA-Z]/g, '');
  return (clean.substring(0, 3) || 'GEN').toUpperCase();
}

export async function getNextTicketId(workspaceId: string, prefix: string): Promise<string> {
  const result = await sql`
    SELECT ticket_id FROM tickets
    WHERE workspace_id = ${workspaceId}
    ORDER BY id DESC LIMIT 1;
  `;
  if (result.rows.length === 0) return `${prefix}-0001`;
  const last = result.rows[0].ticket_id as string;
  const parts = last.split('-');
  const num = parseInt(parts[parts.length - 1], 10);
  return `${prefix}-${String(num + 1).padStart(4, '0')}`;
}

export async function createTicket(data: {
  ticket_id: string;
  workspace_id: string;
  workspace_name: string;
  reporter: string;
  slack_user_id: string;
  description: string;
  task_id: string | null;
  channel: string;
  channel_id: string;
  message_ts: string;
  permalink: string;
}) {
  const result = await sql`
    INSERT INTO tickets (ticket_id, workspace_id, workspace_name, reporter, slack_user_id, description, task_id, channel, channel_id, message_ts, permalink)
    VALUES (${data.ticket_id}, ${data.workspace_id}, ${data.workspace_name}, ${data.reporter}, ${data.slack_user_id}, ${data.description}, ${data.task_id}, ${data.channel}, ${data.channel_id}, ${data.message_ts}, ${data.permalink})
    RETURNING *;
  `;
  return result.rows[0];
}

export async function getTickets(status?: string, workspaceId?: string) {
  if (workspaceId && workspaceId !== 'all') {
    if (status && status !== 'all') {
      return (await sql`SELECT * FROM tickets WHERE workspace_id = ${workspaceId} AND status = ${status} ORDER BY created_at DESC;`).rows;
    }
    return (await sql`SELECT * FROM tickets WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC;`).rows;
  }
  if (status && status !== 'all') {
    return (await sql`SELECT * FROM tickets WHERE status = ${status} ORDER BY created_at DESC;`).rows;
  }
  return (await sql`SELECT * FROM tickets ORDER BY created_at DESC;`).rows;
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const result = await sql`UPDATE tickets SET status = ${status}, updated_at = NOW() WHERE ticket_id = ${ticketId} RETURNING *;`;
  return result.rows[0];
}

export async function getStats(workspaceId?: string) {
  if (workspaceId && workspaceId !== 'all') {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) AS total
      FROM tickets
      WHERE workspace_id = ${workspaceId};
    `;
    return result.rows[0];
  }
  const result = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open') AS open,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
      COUNT(*) AS total
    FROM tickets;
  `;
  return result.rows[0];
}

export async function getWorkspaces() {
  const result = await sql`
    SELECT DISTINCT workspace_id, workspace_name, COUNT(*) as ticket_count
    FROM tickets
    GROUP BY workspace_id, workspace_name
    ORDER BY workspace_name;
  `;
  return result.rows;
}
