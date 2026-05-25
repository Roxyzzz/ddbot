require('dotenv').config();
const line = require('@line/bot-sdk');
const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: process.env.LINE_ACCESS_TOKEN });
async function run() {
  try {
    await client.multicast({
      to: ['U12345678901234567890123456789012'],
      messages: [{
        type: 'flex',
        altText: 'test',
        contents: {
          "type": "bubble",
          "body": { "type": "box", "layout": "vertical", "contents": [], "flex": 0 }
        }
      }]
    });
  } catch(e) {
    console.log("e.message:", e.message);
    console.log("e.statusCode:", e.statusCode);
    console.log("e.body:", JSON.stringify(e.body));
  }
}
run();
