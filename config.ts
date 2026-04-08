function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const adoPat = requireEnv('ADO_PAT');

export const slack = {
  token: requireEnv('SLACK_BOT_TOKEN'),
  appToken: requireEnv('SLACK_APP_TOKEN'),
};

export const ado = {
  pat: adoPat,
  org: requireEnv('ADO_ORG'),
  project: requireEnv('ADO_PROJECT'),
  team: requireEnv('ADO_TEAM'), // required for now but will be grabbed from the Slack channel name in the future
  areaPath: requireEnv('ADO_AREA_PATH'), // required for now but will be grabbed from the Slack channel name in the future
  parentWorkItem: process.env.ADO_PARENT_WORK_ITEM, // required for now but will be grabbed from the Slack channel name in the future
  workItemType: requireEnv('ADO_TASK_TYPE')
};

export const bedrock = {
  region: process.env.AWS_REGION ?? 'eu-west-1',
  modelId: requireEnv('AI_MODEL_ID'),
};