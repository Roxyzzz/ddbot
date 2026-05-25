require('dotenv').config();
const { getSetting } = require('./database');
async function run() {
  const ad = await getSetting('flex_ad');
  console.log(ad);
  process.exit(0);
}
run();
