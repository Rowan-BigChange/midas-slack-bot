import { mock, describe, test, expect } from 'bun:test';

const mockGetPageByIdText = mock(async () => {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from('## CLI Version\n\nRun this:\n\n```\nyour-command-here\n```\n\n## Next Section\nOther stuff');
    }
  };
});

mock.module('../../services/ado.ts', () => ({
  connection: {
    getWikiApi: mock(async () => ({
      getPageByIdText: mockGetPageByIdText,
    })),
  },
}));

mock.module('../../config.ts', () => ({
  ado: {
    org: 'test-org',
    project: 'test-project',
    pat: 'test-pat',
  },
}));

const { getXeroCliInstructions, extractSection, convertToHtml } = await import('../../services/xeroWikiService');


describe('extractSection', () => {
    test('extracts the correct section', () => {
        const markdown = '## CLI Version\n\nRun this:\n\n```\nyour-command-here\n```\n\n## Next Section\nOther stuff';
        expect(extractSection(markdown, 'CLI Version')).toBe('Run this:\n\n```\nyour-command-here\n```');
    });
    test('returns null if section not found', () => {
        const markdown = '## CLI Version\n\nRun this:\n\n```\nyour-command-here\n```\n\n## Next Section\nOther stuff';
        expect(extractSection(markdown, 'Nonexistent Section')).toBeNull();
    });
    test('handles sections at the end of the document', () => {
        const markdown = '## First Section\nContent\n\n## CLI Version\n\nRun this:\n\n```\nyour-command-here\n```';
        expect(extractSection(markdown, 'CLI Version')).toBe('Run this:\n\n```\nyour-command-here\n```');
    });
});

describe('convertToHtml', () => {
    test('converts markdown to HTML', () => {
        const markdown = '## CLI Version\n\nRun this:\n\n```\nyour-command-here\n```';
        expect(convertToHtml(markdown)).toBe('<p>CLI Version</p><p>Run this:</p><pre><code>your-command-here\n</code></pre>');
    });
    test('wraps plain text in paragraph tags', () => {
        const markdown = 'Some plain text here';
        expect(convertToHtml(markdown)).toBe('<p>Some plain text here</p>');
    });
    test('converts a fenced code block to pre and code tags', () => {
        const markdown = '```\nsome-command\n```';
        expect(convertToHtml(markdown)).toBe('<pre><code>some-command\n</code></pre>');
    });
    test('converts inline code spans to pre and code tags', () => {
        const markdown = 'Run this command:\n\n`some-inline-command`';
        expect(convertToHtml(markdown)).toBe('<p>Run this command:</p><pre><code>some-inline-command</code></pre>');
    });
});

describe('getXeroCliInstructions', () => {
    test('fetches and extracts CLI instructions', async () => {
        const instructions = await getXeroCliInstructions();
        expect(instructions).toContain('<pre><code>');
        expect(instructions).toContain('your-command-here');
    });
        test('returns fallback message if wiki read fails, network error', async () => {
        mockGetPageByIdText.mockImplementationOnce(async () => { throw new Error('Network error');
        });
        expect(await getXeroCliInstructions()).toContain('Could not fetch instructions from the wiki — hardcoded instructions below');
    });
    test('returns fallback message if wiki read returns null', async () => {
        mockGetPageByIdText.mockImplementationOnce(async () => null as any);
        expect(await getXeroCliInstructions()).toContain('Could not fetch instructions from the wiki — hardcoded instructions below');
    });
    test('returns fallback message if the CLI Version section is not present in the page', async () => {
        mockGetPageByIdText.mockImplementationOnce(async () => ({
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('## Some Other Section\n\nNo CLI content here');
            }}));
        expect(await getXeroCliInstructions()).toContain('Could not fetch instructions from the wiki — hardcoded instructions below');
    });
})
