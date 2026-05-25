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

  const [rows] = await pool.execute('SELECT user_id, line_name, line_picture, credit FROM users');
  console.log('--- USERS IN MYSQL ---');
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

run().catch(console.error);
