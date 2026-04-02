import axios from 'axios';
import { anthropic } from '../config.ts';

type QueryType = 'urgent' | 'priority' | 'xero' | 'general' | 'unknown';

const FALLBACK_TITLES: Record<QueryType, string> = {
  urgent: 'Slack Query - High Priority',
  priority: 'Slack Query - Priority',
  xero: 'Xero Restart Request',
  general: 'Slack Query - General',
  unknown: 'New Slack Query',
};

const TYPE_DESCRIPTIONS: Record<QueryType, string> = {
  urgent: 'urgent (something is broken in production)',
  priority: 'priority',
  xero: 'Xero service restart',
  general: 'general',
  unknown: 'general',
};

function detectQueryType(text: string): QueryType {
  const lower = text.toLowerCase();
  if (lower.includes('urgent query')) return 'urgent';
  if (lower.includes('priority query')) return 'priority';
  if (lower.includes('xero service restart request')) return 'xero';
  if (lower.includes('general query')) return 'general';
  return 'unknown';
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

export async function generateTitle(text: string): Promise<string> {
  const queryType = detectQueryType(text);
  const fallback = FALLBACK_TITLES[queryType];

  if (!anthropic.apiKey) return fallback;

  const queryBody = extractQueryBody(text);
  if (!queryBody) return fallback;

  const prompt = `You are generating a concise work item title for a support ticket raised via Slack.

Query type: ${TYPE_DESCRIPTIONS[queryType]}
Message content: ${queryBody}

Write a short, descriptive work item title (max 10 words) that captures what the requester needs. Be specific about the actual request. Do not include words like "Slack", "query", "ticket", or "request" unless essential. Output only the title, nothing else.`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 64,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 8000,
      }
    );

    const title = (response.data?.content?.[0]?.text as string | undefined)?.trim();
    return title || fallback;
  } catch {
    return fallback;
  }
}
