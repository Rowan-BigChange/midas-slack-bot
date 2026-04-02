import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { assignWorkItem, closeWorkItem } from '../services/ado.ts';

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

      await assignWorkItem(ticketId, userEmail);

      await client.chat.postMessage({
        channel: event.item.channel,
        thread_ts: event.item.ts,
        text: `🙋‍♂️ Ticket assigned to <@${event.user}>`,
      });
    }

    if (event.reaction === CLOSE_EMOJI) {
      await closeWorkItem(ticketId);

      await client.chat.postMessage({
        channel: event.item.channel,
        thread_ts: event.item.ts,
        text: `The query has been answered and the ticket is now closed.`,
      });
    }
  } catch (error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    const adoMessage = axiosError.response?.data?.message ?? '';
    if (adoMessage.includes('does not exist')) {
      await client.chat.postMessage({
        channel: event.item.channel,
        thread_ts: event.item.ts,
        text: `Work item could not be found, assume closed.`,
      });
    } else {
      logger.error('Error updating ticket:', axiosError.response ? axiosError.response.data : (error as Error).message);
    }
  }
};
