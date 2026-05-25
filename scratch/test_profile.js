const line = require('@line/bot-sdk');
require('dotenv').config();

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

async function run() {
  const userId = 'U9068618bad02e083bee1e96b59df3bf0';
  console.log('Testing getProfile for user:', userId);
  try {
    const profile = await client.getProfile(userId);
    console.log('Success:', profile);
  } catch (err) {
    console.error('Failed:', err.message);
    if (err.statusCode) console.error('Status Code:', err.statusCode);
    if (err.originalError && err.originalError.response) {
      console.error('Response Body:', err.originalError.response.data);
    }
  }
}

run();
