import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { ado as adoConfig } from '../config.ts';
import { getCurrentSprint, createWorkItem } from '../services/ado.ts';
import { JsonPatchOperation, Operation } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';
import { generateTitle } from '../services/bedrock.ts';
import { detectQueryType } from '../services/messageParser.ts';
import { getXeroCliInstructions } from '../services/xeroWikiService.ts';

async function buildDescription(text: string, queryType:string): Promise<string> {
  const lines = text.split('\n');

  const triggerIdx = lines.findIndex(l => l.includes('Midas Slack Bot'));
  if (triggerIdx === -1) return `<p>${text}</p>`;

  const afterTrigger = lines.slice(triggerIdx + 1);

  const personIdx = afterTrigger.findIndex(l => l.trim() !== '');
  if (personIdx === -1) return `<p>Query received from: Unknown</p><p>Answer to: No query provided</p>`;

  const person = afterTrigger[personIdx].trim();
  const query = afterTrigger.slice(personIdx + 1).join('\n').trim() || 'No query provided';

  let description = `<p>Query received from: ${person}</p><p>Query: ${query}</p>`;

  if (queryType === 'xero') {
    const cliInstructions = await getXeroCliInstructions();
    description += `<hr><p><strong>Restart Instructions:</strong></p>${cliInstructions}`;
  }

  return description;
}

export default async ({ event, client, logger }: SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs): Promise<void> => {
  try {
    if (event.subtype === 'message_changed' || event.subtype === 'message_deleted') return;

    const text = (event as { text?: string }).text;
    if (!text?.includes('Midas Slack Bot')) return;

    let iterationPath: string | null = null;
    try {
      iterationPath = await getCurrentSprint();
    } catch {
      logger.error('Could not fetch active sprint. Ticket will default to backlog.');
    }

    const queryType = detectQueryType(text);

    const ticketData: JsonPatchOperation[] = [
      { op: Operation.Add, path: '/fields/System.Title', value: await generateTitle(text) },
      { op: Operation.Add, path: '/fields/System.Description', value: await buildDescription(text, queryType) },
      { op: Operation.Add, path: '/fields/System.AreaPath', value: adoConfig.areaPath },
      { op: Operation.Add, path: '/fields/Microsoft.VSTS.Common.Priority', value: 4 },
      { op: Operation.Add, path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: 0.5 },
      { op: Operation.Add, path: '/fields/Microsoft.VSTS.Common.StackRank', value: 999999999 }
    ];

    if (iterationPath) {
      ticketData.push({ op: Operation.Add, path: '/fields/System.IterationPath', value: iterationPath });
    }

    if (adoConfig.parentWorkItem) {
      ticketData.push({
        op: Operation.Add, 
        path: '/relations/-',
        value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `https://dev.azure.com/${adoConfig.org}/${adoConfig.project}/_apis/wit/workItems/${adoConfig.parentWorkItem}`,
        }
      });
    }

    const workItem = await createWorkItem(ticketData);

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `*Ticket Created:* ${workItem._links?.html?.href}\n*(ID: ${workItem.id})*`,
    });
  } catch (error) {
    logger.error('Error creating ticket:', (error as Error).message);
  }
};
