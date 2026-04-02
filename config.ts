const adoPat = process.env.ADO_PAT ?? '';

export const slack = {
  token: process.env.SLACK_BOT_TOKEN ?? '',
  appToken: process.env.SLACK_APP_TOKEN ?? '',
};

export const ado = {
  org: process.env.ADO_ORG ?? '',
  project: process.env.ADO_PROJECT ?? '',
  team: process.env.ADO_TEAM ?? '',
  areaPath: process.env.ADO_AREA_PATH ?? '',
  auth: Buffer.from(`:${adoPat}`).toString('base64'),
};
