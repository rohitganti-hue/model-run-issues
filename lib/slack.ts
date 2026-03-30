import crypto from 'crypto';

export function verifySlackSignature(signingSecret: string, body: string, timestamp: string, signature: string): boolean {
  if (!signingSecret || !timestamp || !signature) return false;
  const fiveMinutes = 60 * 5;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > fiveMinutes) return false;
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySig = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');
  try {
    if (Buffer.byteLength(mySig) !== Buffer.byteLength(signature)) return false;
    return crypto.timingSafeEqual(Buffer.from(mySig), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function extractTaskId(text: string): string | null {
  const patterns = [/task\s*#?\s*(\d+)/i, /issue\s+(?:with\s+)?(?:task\s*#?\s*)?(\d+)/i, /\btask[:\s]+(\d+)/i, /#(\d+)/];
  for (const p of patterns) { const m = text.match(p); if (m) return m[1]; }
  return null;
}

export function extractDescription(text: string, botUserId: string): string {
  return text.replace(new RegExp(`<@${botUserId}>`, 'g'), '').trim();
}

export async function getSlackUserName(userId: string, botToken: string): Promise<string> {
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, { headers: { Authorization: `Bearer ${botToken}` } });
    const data = await res.json();
    if (data.ok) return data.user?.profile?.real_name || data.user?.real_name || data.user?.name || userId;
  } catch {}
  return userId;
}

export async function getChannelName(channelId: string, botToken: string): Promise<string> {
  try {
    const res = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, { headers: { Authorization: `Bearer ${botToken}` } });
    const data = await res.json();
    if (data.ok) return `#${data.channel?.name || channelId}`;
  } catch {}
  return channelId;
}

export async function getPermalink(channelId: string, messageTs: string, botToken: string): Promise<string> {
  try {
    const res = await fetch(`https://slack.com/api/chat.getPermalink?channel=${channelId}&message_ts=${messageTs}`, { headers: { Authorization: `Bearer ${botToken}` } });
    const data = await res.json();
    if (data.ok) return data.permalink;
  } catch {}
  return '';
}

export async function postTicketReply(channelId: string, threadTs: string, ticketId: string, botToken: string) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: channelId,
      thread_ts: threadTs,
      text: `\u2705 Ticket *${ticketId}* logged!`,
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `\u2705 Ticket *${ticketId}* has been logged to the tracking dashboard.\nThe team will look into this model run issue shortly.` } }],
    }),
  });
}
