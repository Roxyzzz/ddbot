const axios = require('axios');

async function run() {
  const res = await axios.get('http://127.0.0.1:4040/api/requests/http');
  const requests = res.data.requests;
  for (let req of requests) {
    console.log(`[${req.start}] ${req.request.method} ${req.request.uri}`);
    if (req.request.raw) {
      const rawBuf = Buffer.from(req.request.raw, 'base64').toString('utf8');
      const bodyStart = rawBuf.indexOf('\r\n\r\n');
      if (bodyStart !== -1) {
        const body = rawBuf.substring(bodyStart + 4);
        try {
          const parsed = JSON.parse(body);
          if (parsed.events && parsed.events.length > 0) {
            const ev = parsed.events[0];
            if (ev.message) {
              console.log(`  -> Text: "${ev.message.text}"`);
            } else {
              console.log(`  -> Event: ${ev.type}`);
            }
          }
        } catch(e) {
          console.log(`  -> Raw Body: ${body.substring(0, 200)}`);
        }
      }
    }
  }
}

run().catch(console.error);
