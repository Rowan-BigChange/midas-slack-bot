import { App } from '@slack/bolt';
import { slack } from './config.ts';
import handleMessage from './handlers/message.ts';
import handleReaction from './handlers/reaction.ts';

const app = new App({
  token: slack.token,
  appToken: slack.appToken,
  socketMode: true,
});

app.event('message', handleMessage);
app.event('reaction_added', handleReaction);

(async () => {
  await app.start();
  console.log('⚡️ Midas bot is running!');
})();
