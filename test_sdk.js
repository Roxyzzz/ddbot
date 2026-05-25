require('dotenv').config();
const line = require('@line/bot-sdk');
const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: process.env.LINE_ACCESS_TOKEN || "test" });
async function run() {
  try {
    await client.multicast(['U1'], [{type: 'text', text: 'hi'}]);
  } catch(e) {
    console.log("e.message:", e.message);
  }
}
run();
