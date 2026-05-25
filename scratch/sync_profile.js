const line = require('@line/bot-sdk');
const { updateLineProfile } = require('../database');
require('dotenv').config();

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

async function run() {
  const userId = 'U9068618bad02e083bee1e96b59df3bf0';
  console.log('Syncing real profile for user:', userId);
  try {
    const profile = await client.getProfile(userId);
    console.log('Real profile found:', profile);
    await updateLineProfile(userId, profile.displayName, profile.pictureUrl);
    console.log('Successfully synced profile to MySQL database!');
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

run();
