require('dotenv').config();
const { getAllUserIds } = require('./database');
async function run() {
  const users = await getAllUserIds();
  console.log("getAllUserIds count:", users.length);
  console.log("users:", users);
  process.exit(0);
}
run();
