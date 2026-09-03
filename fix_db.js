const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ddbot_db',
  });
  try {
    await pool.execute("ALTER TABLE settings MODIFY COLUMN value MEDIUMTEXT NOT NULL;");
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
