import { NextRequest, NextResponse } from 'next/server';
import {
  verifySlackSignature,
  extractTaskId,
  extractDescription,
  getSlackUserName,
  getChannelName,
  getPermalink,
  postTicketReply,
} from '@/lib/slack';
import { createTicket, getNextTicketId, getMercorWorkspaceInfo } from '@/lib/db';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const timestamp = req.headers.get('x-slack-request-timestamp') ?? '';
  const signature = req.headers.get('x-slack-signature') ?? '';
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';

  if (!verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.event?.type === 'app_mention') {
    const event = body.event;
    if (event.bot_id) return NextResponse.json({ ok: true });

    const userId = event.user;
    const channelId = event.channel;
    const messageTs = event.ts;
    const text: string = event.text ?? '';
    const botUserId = body.authorizations?.[0]?.user_id ?? '';

    // Use workspace-specific bot token if available (multi-workspace support)
    // Falls back to SLACK_BOT_TOKEN env var for single-workspace installs
    const botToken = body.authorizations?.[0]?.access_token ?? process.env.SLACK_BOT_TOKEN ?? '';

    const teamId: string = body.team_id ?? event.team ?? '';

    // Use hardcoded workspace map — reliable for Mercor Enterprise Grid
    // No Slack API call needed; avoids cross-workspace token issues
    const { name: workspaceName, prefix } = getMercorWorkspaceInfo(teamId);

    const [reporterName, channelName, permalink] = await Promise.all([
      getSlackUserName(userId, botToken),
      getChannelName(channelId, botToken),
      getPermalink(channelId, messageTs, botToken),
    ]);

    const description = extractDescription(text, botUserId) || text;
    const taskId = extractTaskId(text);
    const ticketId = await getNextTicketId(teamId, prefix);

    await createTicket({
      ticket_id: ticketId,
      workspace_id: teamId,
      workspace_name: workspaceName,
      reporter: reporterName,
      slack_user_id: userId,
      description,
      task_id: taskId,
      channel: channelName,
      channel_id: channelId,
      message_ts: messageTs,
      permalink,
    });

    await postTicketReply(channelId, messageTs, ticketId, botToken);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
