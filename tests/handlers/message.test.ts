import { mock, describe, test, expect, beforeEach } from 'bun:test';

const mockGetCurrentSprint = mock(async () => 'test-sprint-path');
const mockCreateWorkItem = mock(async () => ({ id: 123, _links: { html: { href: 'https://dev.azure.com/test' } } }));
const mockGenerateTitle = mock(async () => 'Generated Title');
const mockGetXeroCliInstructions = mock(async () => '<p>CLI Instructions</p>');

const createMockEvent = (overrides = {}) => ({
  subtype: undefined,
  channel: 'C123456',
  ts: '1234567890.123',
  text: `Midas Slack Bot\nJohn Smith\nI need help with a job finance issue`,
  ...overrides,
});
const mockPostMessage = mock(async () => ({}));
const mockClient = { chat: { postMessage: mockPostMessage } };
const mockLogger = { error: mock(() => {}) };

mock.module('../../config.ts', () => ({
  ado: {
    org: 'test-org',
    project: 'test-project',
    pat: 'test-pat',
  },
}));

mock.module('../../services/ado.ts', () => ({
  getCurrentSprint: mockGetCurrentSprint,
  createWorkItem: mockCreateWorkItem,
}));

mock.module('../../services/bedrock.ts', () => ({
    generateTitle: mockGenerateTitle,
}))

mock.module('../../services/xeroWikiService.ts', () => ({
    getXeroCliInstructions: mockGetXeroCliInstructions,
}));

const { default: handler } = await import('../../handlers/message');
beforeEach(() => {
  mockCreateWorkItem.mockClear();
  mockPostMessage.mockClear();
  mockLogger.error.mockClear();
});

describe('create work item and should post message with link', () => {
    test('should create a work item', async () => {
        await handler({ event: createMockEvent(), client: mockClient, logger: mockLogger} as any);
        expect(mockCreateWorkItem).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining('https://dev.azure.com/test'),
        }));
    })
    test('should not create a work item for message changes', async () => {
        await handler({ event: createMockEvent({ subtype: 'message_changed'}), client: mockClient, logger: mockLogger} as any);
        expect(mockCreateWorkItem).not.toHaveBeenCalled();
    })
    test('should not create a work item for message is deleted', async () => {
        await handler({ event: createMockEvent({ subtype: 'message_deleted'}), client: mockClient, logger: mockLogger} as any);
        expect(mockCreateWorkItem).not.toHaveBeenCalled();
    })
    test('should not create a work item for message not containing "Midas Slack Bot"', async () => {
        await handler({ event: createMockEvent({text: 'Some other message' }), client: mockClient, logger: mockLogger} as any);
        expect(mockCreateWorkItem).not.toHaveBeenCalled();
    })
});