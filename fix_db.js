require('dotenv').config();
const { getSetting, setSetting } = require('./database');
async function run() {
  let ad = await getSetting('flex_ad');
  if (ad) {
    let parsed = JSON.parse(ad);
    if (parsed.footer && parsed.footer.flex === 0) {
      delete parsed.footer.flex;
      await setSetting('flex_ad', JSON.stringify(parsed));
      console.log('Fixed flex_ad in DB');
    }
  }
  process.exit(0);
}
run();
