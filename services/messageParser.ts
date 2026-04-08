export type QueryType = 'urgent' | 'priority' | 'xero' | 'general' | 'unknown';

export function detectQueryType(text: string): QueryType {
  const lower = text.toLowerCase();
  if (lower.includes('urgent query')) return 'urgent';
  if (lower.includes('priority query')) return 'priority';
  if (lower.includes('xero service restart request')) return 'xero';
  if (lower.includes('general query')) return 'general';
  return 'unknown';
}

export function extractPersonFirstName(text: string): string | null {
  const lines = text.split('\n');
  const triggerIdx = lines.findIndex(l => l.includes('Midas Slack Bot'));
  if (triggerIdx === -1) return null;

  const afterTrigger = lines.slice(triggerIdx + 1);
  const personLine = afterTrigger.find(l => l.trim() !== '');
  if (!personLine) return null;

  return personLine.trim().split(' ')[0] ?? null;
}

export function extractQueryBody(text: string): string | null {
  const lines = text.split('\n');
  const triggerIdx = lines.findIndex(l => l.includes('Midas Slack Bot'));
  if (triggerIdx === -1) return null;

  const afterTrigger = lines.slice(triggerIdx + 1);
  const personIdx = afterTrigger.findIndex(l => l.trim() !== '');
  if (personIdx === -1) return null;

  const bodyLines = afterTrigger.slice(personIdx + 1);
  const meaningful = bodyLines
    .map(l => l.trim())
    .map(l => l.replace(/<!here>|<!channel>/g, '').trim())
    .filter(l => l && l!== 'Restart requested.');

  return meaningful.join(' ').trim() || null;
}