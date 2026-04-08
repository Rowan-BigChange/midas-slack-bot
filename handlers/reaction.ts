import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { assignWorkItem, closeWorkItem } from '../services/ado.ts';
import { JsonPatchOperation, Operation } from 'azure-devops-node-api/interfaces/common/VSSInterfaces';

const ASSIGN_EMOJI = 'eyes';
const CLOSE_EMOJI = 'white_check_mark';

export default async ({ event, client, logger }: SlackEventMiddlewareArgs<'reaction_added'> & AllMiddlewareArgs): Promise<void> => {
  try {
    if (event.reaction !== ASSIGN_EMOJI && event.reaction !== CLOSE_EMOJI) return;

    const thread = await client.conversations.replies({
      channel: event.item.channel,
      ts: event.item.ts,
    });

    const botReply = thread.messages?.find(m => m.text && m.text.includes('*(ID: '));
    if (!botReply) return;

    const match = botReply.text?.match(/\(ID: (\d+)\)/);
    const ticketId = match ? match[1] : null;
    if (!ticketId) return;

    if (event.reaction === ASSIGN_EMOJI) {
      const userInfo = await client.users.info({ user: event.user });
      const userEmail = userInfo.user?.profile?.email;
      if (!userEmail) return;

      const document: JsonPatchOperation[] = [
        { op: Operation.Add, path: '/fields/System.AssignedTo', value: userEmail },
      ];
      await assignWorkItem(document, parseInt(ticketId));

      await client.chat.postMessage({
        channel: event.item.channel,
        thread_ts: event.item.ts,
        text: `🙋‍♂️ Ticket assigned to <@${event.user}>`,
      });
    }

    if (event.reaction === CLOSE_EMOJI) {
      const document: JsonPatchOperation[] = [
        { op: Operation.Add, path: '/fields/System.State', value: 'Closed' }
      ];
      await closeWorkItem(document, parseInt(ticketId));

      await client.chat.postMessage({
        channel: event.item.channel,
        thread_ts: event.item.ts,
        text: `Ticket closed.`,
      });
    }
  } catch (error) {
    logger.error('Error updating ticket:', (error as Error).message);
  }
};
