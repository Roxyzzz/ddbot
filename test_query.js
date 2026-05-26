const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [readers] = await pool.execute('SELECT * FROM readers');
  console.log('Readers:', readers);
  const [users] = await pool.execute('SELECT user_id, assigned_reader_id FROM users');
  console.log('Users:', users);
  process.exit(0);
}
main();
