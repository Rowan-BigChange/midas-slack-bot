import { mock, describe, test, expect, beforeEach } from 'bun:test';

const mockAssignWorkItem = mock(async () => ({}));
const mockCloseWorkItem = mock(async () => ({}));

mock.module('../../services/ado.ts', () => ({
  assignWorkItem: mockAssignWorkItem,
  closeWorkItem: mockCloseWorkItem,
}));

const mockReplies = mock(async () => ({
    messages: [{ text: 'Ticket Created: https://dev.azure.com/test *(ID: 123)*' }],
}));
const mockUserInfo = mock(async () => ({
    user: { profile: { email: 'john@example.com' }}
}));
const mockPostMessage = mock (async () => ({}));

const mockClient = {
    conversations: { replies: mockReplies },
    users: { info: mockUserInfo },
    chat: { postMessage: mockPostMessage },
};
const mockLogger = { error: mock(() => {}) };

const createMockEvent = (overrides = {}) => ({
    reaction: 'eyes',
    user: 'U123456',
    item: { channel: 'C123456', ts: '1234567890.123' },
    ...overrides,
});

const { default: handler } = await import('../../handlers/reaction');

beforeEach(() => {
    mockAssignWorkItem.mockClear();
    mockCloseWorkItem.mockClear();
    mockPostMessage.mockClear();
});

describe('reaction handler', () => {
    test(':eyes: assigns the work item and sets state to Active', async () => {
      await handler({ event: createMockEvent(), client: mockClient, logger: mockLogger } as any);
      expect(mockAssignWorkItem).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: '/fields/System.AssignedTo', value: 'john@example.com' }),
          expect.objectContaining({ path: '/fields/System.State', value: 'Active' }),
        ]),
        123
      );
    });
    test(':white_check_mark: closes the work item and sets state to Closed', async () => {
      await handler({ event: createMockEvent({reaction: 'white_check_mark'}), client: mockClient, logger: mockLogger } as any);
      expect(mockCloseWorkItem).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: '/fields/System.State', value: 'Closed' }),
        ]),
        123
      );
    });
    test('other reaction does not assign the work item', async () => {
        await handler({ event: createMockEvent({reaction: 'other'}), client: mockClient, logger: mockLogger } as any);
        expect(mockAssignWorkItem).not.toHaveBeenCalled();
    });
    test('other reaction does not close the work item', async () => {
        await handler({ event: createMockEvent({reaction: 'other'}), client: mockClient, logger: mockLogger } as any);
        expect(mockCloseWorkItem).not.toHaveBeenCalled();
    });
});

