import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrock } from '../config.ts';

type QueryType = 'urgent' | 'priority' | 'xero' | 'general' | 'unknown';

const FALLBACK_TITLES: Record<QueryType, string> = {
  urgent: 'Slack Query - High Priority',
  priority: 'Slack Query - Moderate Priority',
  xero: 'Xero Restart Request',
  general: 'Slack Query - Low Priority',
  unknown: 'New Slack Query',
};

const PRIORITY_LABELS: Record<QueryType, string> = {
  urgent: 'High Priority',
  priority: 'Moderate Priority',
  xero: 'Moderate Priority',
  general: 'Low Priority',
  unknown: 'Low Priority',
};

const URGENCY_KEYWORDS = ['urgent', 'critical', 'down', 'broken', 'not working', 'emergency', 'asap', 'immediately'];

function detectQueryType(text: string): QueryType {
  const lower = text.toLowerCase();
  if (lower.includes('urgent query')) return 'urgent';
  if (lower.includes('priority query')) return 'priority';
  if (lower.includes('xero service restart request')) return 'xero';
  if (lower.includes('general query')) return 'general';
  return 'unknown';
}

function extractPersonFirstName(text: string): string | null {
  const lines = text.split('\n');
  const triggerIdx = lines.findIndex(l => l.includes('Midas Slack Bot'));
  if (triggerIdx === -1) return null;

  const afterTrigger = lines.slice(triggerIdx + 1);
  const personLine = afterTrigger.find(l => l.trim() !== '');
  if (!personLine) return null;

  return personLine.trim().split(' ')[0] ?? null;
}

function extractQueryBody(text: string): string | null {
  const lines = text.split('\n');
  const triggerIdx = lines.findIndex(l => l.includes('Midas Slack Bot'));
  if (triggerIdx === -1) return null;

  const afterTrigger = lines.slice(triggerIdx + 1);
  const personIdx = afterTrigger.findIndex(l => l.trim() !== '');
  if (personIdx === -1) return null;

  const bodyLines = afterTrigger.slice(personIdx + 1);
  const meaningful = bodyLines
    .map(l => l.trim())
    .filter(l => l && !l.match(/^<[@!#][^>]+>$/) && l !== 'Restart requested.');

  return meaningful.join(' ').trim() || null;
}

const client = new BedrockRuntimeClient({
  region: bedrock.region,
  credentials: {
    accessKeyId: bedrock.accessKeyId,
    secretAccessKey: bedrock.secretAccessKey,
    ...(bedrock.sessionToken ? { sessionToken: bedrock.sessionToken } : {}),
  },
});

export async function generateTitle(text: string): Promise<string> {
  const queryType = detectQueryType(text);
  const fallback = FALLBACK_TITLES[queryType];

  if (!bedrock.accessKeyId || !bedrock.secretAccessKey) return fallback;

  const firstName = extractPersonFirstName(text) ?? 'User';

  if (queryType === 'xero') {
    const xeroBody = extractQueryBody(text)?.toLowerCase() ?? '';
    const xeroPriority = URGENCY_KEYWORDS.some(k => xeroBody.includes(k)) ? 'High Priority' : PRIORITY_LABELS.xero;
    return `Support ${firstName} with Xero restart request - ${xeroPriority}`;
  }

  const queryBody = extractQueryBody(text);
  if (!queryBody) return fallback;

  const priorityLabel = PRIORITY_LABELS[queryType];

  const prompt = `Summarise this IT support message in 5 words or fewer. Output only the summary, no punctuation or extra text.

Message: ${queryBody}`;

  try {
    const command = new ConverseCommand({
      modelId: 'eu.amazon.nova-micro-v1:0',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 20 },
    });

    const response = await client.send(command);
    const summary = response.output?.message?.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '');
    const title = summary ? `Support ${firstName} with ${summary} - ${priorityLabel}` : fallback;
    return title;
  } catch (err) {
    console.error('[claude] generateTitle failed:', err);
    return fallback;
  }
}
