import * as azdev from 'azure-devops-node-api';
import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { JsonPatchOperation } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';
import { ado } from '../config.ts';

export const connection = new azdev.WebApi(
  `https://dev.azure.com/${ado.org}`,
  azdev.getPersonalAccessTokenHandler(ado.pat)
);

export async function getCurrentSprint(): Promise<string | null> {
  const client = await connection.getWorkApi();
  const iterations = await client.getTeamIterations({ project: ado.project, team: ado.team} , 'current' );
  return iterations[0]?.path ?? null;
}

export async function createWorkItem(document: JsonPatchOperation[]): Promise<WorkItem> {
  const client = await connection.getWorkItemTrackingApi();
  const workItem = await client.createWorkItem(null, document, ado.project, ado.workItemType)
  if (!workItem) throw new Error('Failed to create work item');
  return workItem;
}

export async function assignWorkItem(document: JsonPatchOperation[], ticketId: number): Promise<void> {
  const client = await connection.getWorkItemTrackingApi();
  await client.updateWorkItem(null, document, ticketId);
}

export async function closeWorkItem(document: JsonPatchOperation[], ticketId: number): Promise<void> {
  const client = await connection.getWorkItemTrackingApi();
  await client.updateWorkItem(null, document, ticketId);
}
