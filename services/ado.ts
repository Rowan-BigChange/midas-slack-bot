import axios from 'axios';
import { ado } from '../config.ts';

interface WorkItemOperation {
  op: string;
  path: string;
  value: string | number;
}

interface WorkItem {
  id: number;
  _links: { html: { href: string } };
}

const authHeaders = {
  'Authorization': `Basic ${ado.auth}`,
  'Content-Type': 'application/json-patch+json',
};

export async function getCurrentSprint(): Promise<string | null> {
  const response = await axios.get(
    `https://dev.azure.com/${ado.org}/${ado.project}/${ado.team}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0`,
    { headers: { 'Authorization': `Basic ${ado.auth}` } }
  );
  const values = response.data?.value as { path: string }[] | undefined;
  return values && values.length > 0 ? values[0].path : null;
}

export async function createWorkItem(ticketData: WorkItemOperation[]): Promise<WorkItem> {
  const response = await axios.post(
    `https://dev.azure.com/${ado.org}/${ado.project}/_apis/wit/workitems/$Task?api-version=7.0`,
    ticketData,
    { headers: authHeaders }
  );
  return response.data as WorkItem;
}

export async function assignWorkItem(ticketId: string, email: string): Promise<void> {
  await axios.patch(
    `https://dev.azure.com/${ado.org}/${ado.project}/_apis/wit/workitems/${ticketId}?api-version=7.0`,
    [{ op: 'add', path: '/fields/System.AssignedTo', value: email }],
    { headers: authHeaders }
  );
}

export async function closeWorkItem(ticketId: string): Promise<void> {
  await axios.patch(
    `https://dev.azure.com/${ado.org}/${ado.project}/_apis/wit/workitems/${ticketId}?api-version=7.0`,
    [{ op: 'add', path: '/fields/System.State', value: 'Done' }],
    { headers: authHeaders }
  );
}
