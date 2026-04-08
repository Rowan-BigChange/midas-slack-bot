import { mock, describe, test, expect } from 'bun:test';

const mockCreateWorkItem = mock(async (): Promise<{ id: number; _links: { html: { href: string } } } | null> => ({  
  id: 123, 
  _links: { html: { href: 'https://dev.azure.com/test' } } 
}));

const mockGetTeamIterations = mock(async () => [{ path: 'test-sprint-path' }]);

mock.module('../../config.ts', () => ({
  ado: {
    org: 'test-org',
    project: 'test-project',
    team: 'test-team',
    pat: 'test-pat',
    workItemType: 'User Story',
    areaPath: 'test-area',
    parentWorkItem: undefined,
  },
  bedrock: { region: 'eu-west-1' }
}));

mock.module('azure-devops-node-api', () => ({
  getPersonalAccessTokenHandler: () => ({}),
  WebApi: class {
        getWorkApi = mock(async () => ({
          getTeamIterations: mockGetTeamIterations,
        }));
        getWorkItemTrackingApi = mock(async () => ({
          createWorkItem: mockCreateWorkItem,
          updateWorkItem: mock(async () => ({})),
        }));
  }
}));

const { getCurrentSprint, createWorkItem, assignWorkItem, closeWorkItem } = await import('../../services/ado');


describe('getCurrentSprint', () => {
    test('returns current sprint path', async () => {
        expect(await getCurrentSprint()).toBe('test-sprint-path');
    });
    test('returns null if no current sprint is found', async () => {
        mockGetTeamIterations.mockImplementationOnce(async () => []);
        expect(await getCurrentSprint()).toBe(null);
    });
});

describe('createWorkItem', () => {
    test('creates a work item and returns it', async () => {
        expect(await createWorkItem([])).toEqual({ id: 123, _links: { html: { href: 'https://dev.azure.com/test' } } });
    });
    test('throws an error if work item creation fails', async () => {
        mockCreateWorkItem.mockImplementationOnce(async () => null);
        await expect(createWorkItem([])).rejects.toThrow('Failed to create work item');
    });
});

describe('assignWorkItem', () => {
    test('assigns a work item without error', async () => {
        await expect(assignWorkItem([], 123)).resolves.toBeUndefined();
    });
});

describe('closeWorkItem', () => {
    test('closes a work item without error', async () => {
        await expect(closeWorkItem([], 123)).resolves.toBeUndefined();
    });
});