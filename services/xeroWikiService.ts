import { connection } from './ado.ts';
import { ado } from '../config.ts';

const WIKI_IDENTIFIER = 'BigChange.wiki';
const XERO_RESTART_PAGE_ID = 44432;

const FALLBACK_STEPS = '<ol><li>Log in to the Production AWS Account.</li><li>Navigate to EC2 > Instances.</li><li>Locate the instance named XeroIntegration-Service-Prod.</li><li>Click to Connect.</li><li>Choose Session Manager > Connect.</li><li>On CLI invite.</li></ol>';
const FALLBACK_CLI_COMMAND = '$svc = Get-WmiObject Win32_Service -Filter "Name=\'BigChange.XeroIntegration.Service\'"; $svcPid = $svc.ProcessId; if ($svcPid -and $svcPid -ne $PID -and $svcPid -ne 0) { taskkill /F /PID $svcPid } elseif ($svcPid -eq $PID) { Write-Host "Refusing to kill this shell (PID: $svcPid)." } else { Write-Host "No running process to kill (PID: $svcPid)." }';
const FALLBACK_MESSAGE = `<p><em>Could not fetch instructions from the wiki — hardcoded instructions below. Please verify these are up to date.</em></p><p><strong>CLI Version</strong></p><p>Run the following command to restart the Xero Integration Service:</p><p>${FALLBACK_STEPS}</p><pre><code>${FALLBACK_CLI_COMMAND}</code></pre>`;


async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function fetchWikiPageContent(): Promise<string | null> {
  const wikiClient = await connection.getWikiApi();
  const stream = await wikiClient.getPageByIdText(
    ado.project,
    WIKI_IDENTIFIER,
    XERO_RESTART_PAGE_ID,
    undefined,
    true
  );

  if (!stream) return null;
  return streamToString(stream);
}

export function extractSection(markdown: string, sectionName: string): string | null {
  const lines = markdown.split('\n');

  const headingIdx = lines.findIndex(l =>
    /^#{1,6}\s/.test(l) && l.toLowerCase().includes(sectionName.toLowerCase())
  );
  if (headingIdx === -1) return null;

  const headingLevel = lines[headingIdx].match(/^(#+)/)?.[1].length ?? 1;

  const endIdx = lines.findIndex((l, i) =>
    i > headingIdx &&
    /^#{1,6}\s/.test(l) &&
    (l.match(/^(#+)/)?.[1].length ?? 7) <= headingLevel
  );

  const sectionLines = endIdx === -1
    ? lines.slice(headingIdx + 1)
    : lines.slice(headingIdx + 1, endIdx);

  return sectionLines.join('\n').trim() || null;
}

export function convertToHtml(markdown: string): string {
  let html = markdown.replace(/```[^\n]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<pre><code>$1</code></pre>');

  return html
    .split(/\n\n+/)
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => {
      if (block.startsWith('<pre>')) return block;
      return `<p>${block.replace(/^#{1,6}\s+/, '').replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

export async function getXeroCliInstructions(): Promise<string> {
  try {
    const pageContent = await fetchWikiPageContent();
    if (pageContent) {
      const section = extractSection(pageContent, 'CLI Version');
      if (section) {
        return convertToHtml(section);
      }
    }
  } catch {
    // Network errors, stream failures, unexpected response shapes — all fall through
  }

  return FALLBACK_MESSAGE;
}
