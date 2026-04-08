import { QueryType, detectQueryType, extractPersonFirstName, extractQueryBody } from './messageParser.ts';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrock } from '../config.ts';

const QUERY_CONFIG: Record<QueryType, { fallback: string; priority: string }> = {
  urgent:   { fallback: 'Slack Query - High Priority',     priority: 'High Priority' },
  priority: { fallback: 'Slack Query - Moderate Priority', priority: 'Moderate Priority' },
  xero:     { fallback: 'Xero Restart Request',            priority: 'Moderate Priority' },
  general:  { fallback: 'Slack Query - Low Priority',      priority: 'Low Priority' },
  unknown:  { fallback: 'New Slack Query',                 priority: 'Low Priority' },
};

const client = new BedrockRuntimeClient({ region: bedrock.region });

export async function generateTitle(text: string): Promise<string> {
  const queryType = detectQueryType(text);
  const fallback = QUERY_CONFIG[queryType].fallback;

  const firstName = extractPersonFirstName(text) ?? 'User';

  if (queryType === 'xero') {
    const xeroBody = extractQueryBody(text)?.toLowerCase() ?? '';
    const xeroPriority = ['urgent', 'critical', 'down', 'broken', 'not working', 'emergency', 'asap', 'immediately']
      .some(k => xeroBody.includes(k)) ? 'High Priority' : QUERY_CONFIG['xero'].priority;
    return `Support ${firstName} with Xero restart request - ${xeroPriority}`;
  }

  const queryBody = extractQueryBody(text);
  if (!queryBody) return fallback;

  const priorityLabel = QUERY_CONFIG[queryType].priority;

  try {
    const command = new ConverseCommand({
      modelId: bedrock.modelId,
      system: [{ text: 'Summarise this IT support message in 5 words or fewer. Output only the summary, no punctuation or extra text.' }],
      messages: [{ role: 'user', content: [{ text: queryBody }] }],
      inferenceConfig: { maxTokens: 20 },
    });

    const response = await client.send(command);
    const summary = response.output?.message?.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '');
    const title = summary ? `Support ${firstName} with ${summary} - ${priorityLabel}` : fallback;
    return title;
  } catch (err) {
    console.error('generateTitle failed:', err);
    return fallback;
  }
}
