require('dotenv').config();
const BetterSqlite = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

const SQLITE_PATH = path.join(__dirname, 'ddbot.db');

async function migrate() {
  console.log('🔄 Starting migration from SQLite → MySQL...');

  let sqlite;
  try {
    sqlite = new BetterSqlite(SQLITE_PATH, { readonly: true });
  } catch (e) {
    console.error('❌ Cannot open ddbot.db:', e.message);
    process.exit(1);
  }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ddbot_db',
    multipleStatements: false,
  });

  try {
    // ── users ──────────────────────────────────────────────
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`📦 Migrating ${users.length} users...`);
    for (const u of users) {
      await pool.execute(`INSERT IGNORE INTO users
        (user_id,line_name,line_picture,credit,last_purchase,referral_code,referred_by,
         subscription_expires_at,daily_reads_count,daily_reads_reset_at,dob,zodiac,
         assigned_reader_id,reader_memo)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [u.user_id, u.line_name||null, u.line_picture||null, u.credit||0,
         u.last_purchase||null, u.referral_code||null, u.referred_by||null,
         u.subscription_expires_at||null, u.daily_reads_count||0,
         u.daily_reads_reset_at||null, u.dob||null, u.zodiac||null,
         u.assigned_reader_id||null, u.reader_memo||null]);
    }
    console.log('✅ users done');

    // ── readers ────────────────────────────────────────────
    const readers = sqlite.prepare('SELECT * FROM readers').all();
    console.log(`📦 Migrating ${readers.length} readers...`);
    for (const r of readers) {
      await pool.execute(`INSERT IGNORE INTO readers (id, username, password, name, created_at) VALUES (?,?,?,?,?)`,
        [r.id, r.username, r.password, r.name, r.created_at||null]);
    }
    console.log('✅ readers done');

    // ── transactions ───────────────────────────────────────
    const txns = sqlite.prepare('SELECT * FROM transactions').all();
    console.log(`📦 Migrating ${txns.length} transactions...`);
    for (const t of txns) {
      await pool.execute(`INSERT IGNORE INTO transactions (id, user_id, amount, type, note, created_at) VALUES (?,?,?,?,?,?)`,
        [t.id, t.user_id, t.amount, t.type, t.note||null, t.created_at||null]);
    }
    console.log('✅ transactions done');

    // ── readings ───────────────────────────────────────────
    const readings = sqlite.prepare('SELECT * FROM readings').all();
    console.log(`📦 Migrating ${readings.length} readings...`);
    for (const r of readings) {
      await pool.execute(`INSERT IGNORE INTO readings (id, user_id, service, created_at) VALUES (?,?,?,?)`,
        [r.id, r.user_id, r.service, r.created_at||null]);
    }
    console.log('✅ readings done');

    // ── pending_slips ──────────────────────────────────────
    const slips = sqlite.prepare('SELECT * FROM pending_slips').all();
    console.log(`📦 Migrating ${slips.length} pending_slips...`);
    for (const s of slips) {
      await pool.execute(`INSERT IGNORE INTO pending_slips
        (id, user_id, slip_type, filename, payment_method, angpao_link, status, created_at, resolved_at)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [s.id, s.user_id, s.slip_type, s.filename||'', s.payment_method||'slip',
         s.angpao_link||null, s.status||'pending', s.created_at||null, s.resolved_at||null]);
    }
    console.log('✅ pending_slips done');

    // ── chat_logs ──────────────────────────────────────────
    const chats = sqlite.prepare('SELECT * FROM chat_logs').all();
    console.log(`📦 Migrating ${chats.length} chat_logs...`);
    for (const c of chats) {
      await pool.execute(`INSERT IGNORE INTO chat_logs (id, user_id, message, response, created_at) VALUES (?,?,?,?,?)`,
        [c.id, c.user_id, c.message, c.response||'', c.created_at||null]);
    }
    console.log('✅ chat_logs done');

    // ── bookings ───────────────────────────────────────────
    const bookings = sqlite.prepare('SELECT * FROM bookings').all();
    console.log(`📦 Migrating ${bookings.length} bookings...`);
    for (const b of bookings) {
      await pool.execute(`INSERT IGNORE INTO bookings
        (id, user_id, preferred_date, booking_type, note, status, confirmed_date, admin_note, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [b.id, b.user_id, b.preferred_date, b.booking_type||'online', b.note||null,
         b.status||'pending', b.confirmed_date||null, b.admin_note||null,
         b.created_at||null, b.updated_at||null]);
    }
    console.log('✅ bookings done');

    // ── settings ───────────────────────────────────────────
    try {
      const settings = sqlite.prepare('SELECT * FROM settings').all();
      console.log(`📦 Migrating ${settings.length} settings...`);
      for (const s of settings) {
        await pool.execute(`INSERT INTO settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?`,
          [s.key, s.value, s.value]);
      }
      console.log('✅ settings done');
    } catch (_) { console.log('⚠️  settings table skip (not found)'); }

    // ── ai_training_data ───────────────────────────────────
    try {
      const ai = sqlite.prepare('SELECT * FROM ai_training_data').all();
      console.log(`📦 Migrating ${ai.length} ai_training_data...`);
      for (const a of ai) {
        await pool.execute(`INSERT IGNORE INTO ai_training_data
          (id, user_id, topic, user_dob, cards, prompt, response, rating, feedback, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [a.id, a.user_id, a.topic||null, a.user_dob||null, a.cards||null,
           a.prompt||null, a.response||null, a.rating||0, a.feedback||null, a.created_at||null]);
      }
      console.log('✅ ai_training_data done');
    } catch (_) { console.log('⚠️  ai_training_data skip'); }

    console.log('\n🎉 Migration complete! All data has been copied to MySQL (ddbot_db).');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrate();
