require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ddbot_db',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    line_name TEXT, line_picture TEXT,
    credit INT DEFAULT 0, last_purchase TEXT,
    referral_code VARCHAR(20) UNIQUE, referred_by VARCHAR(20),
    subscription_expires_at TEXT,
    daily_reads_count INT DEFAULT 0, daily_reads_reset_at TEXT,
    dob TEXT, zodiac TEXT,
    assigned_reader_id INT, reader_memo TEXT
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(100),
    amount INT, type VARCHAR(20), note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS readings (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(100) NOT NULL,
    service VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS pending_slips (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(100) NOT NULL,
    slip_type VARCHAR(50) NOT NULL, filename TEXT NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'slip', angpao_link TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, resolved_at TEXT
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(100) NOT NULL,
    message MEDIUMTEXT NOT NULL, response MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(100) NOT NULL,
    reader_id INT NULL,
    preferred_date TEXT NOT NULL, booking_type VARCHAR(20) DEFAULT 'online',
    note TEXT, status VARCHAR(20) DEFAULT 'pending',
    confirmed_date TEXT, admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TEXT
  )`);
  try {
    await pool.execute('ALTER TABLE bookings ADD COLUMN reader_id INT NULL AFTER user_id');
  } catch (e) {}

  try {
    await pool.execute('ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  } catch (e) {}

  await pool.execute(`CREATE TABLE IF NOT EXISTS readers (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS reader_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY, reader_id INT NOT NULL,
    user_id VARCHAR(100), rating INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(100) PRIMARY KEY, value MEDIUMTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS ai_training_data (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(100) NOT NULL,
    topic VARCHAR(100), user_dob VARCHAR(20), cards TEXT, prompt MEDIUMTEXT, response MEDIUMTEXT,
    rating INT DEFAULT 0, feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.execute(`INSERT IGNORE INTO settings (\`key\`, value) VALUES ('stripe_enabled', '1')`);
  console.log('📦 Database: MySQL (ddbot_db)');
}
initDB().catch(e => { console.error('DB init error:', e); process.exit(1); });

// Settings
async function getSetting(key) {
  const [[row]] = await pool.execute('SELECT value FROM settings WHERE `key` = ?', [key]);
  return row ? row.value : null;
}
async function setSetting(key, value) {
  await pool.execute('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', [key, String(value), String(value)]);
}
async function isStripeEnabled() { return (await getSetting('stripe_enabled')) === '1'; }
async function getAllSettings() {
  const [rows] = await pool.execute('SELECT `key`, value FROM settings');
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

// Credit
async function getCredit(userId) {
  const [[row]] = await pool.execute('SELECT credit FROM users WHERE user_id = ?', [userId]);
  return row ? row.credit : 0;
}
async function addCredit(userId, amount = 1, note = '') {
  await pool.execute(`INSERT INTO users (user_id, credit, last_purchase) VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE credit = credit + ?, last_purchase = NOW()`, [userId, amount, amount]);
  await pool.execute(`INSERT INTO transactions (user_id, amount, type, note) VALUES (?, ?, 'purchase', ?)`, [userId, amount, note]);
}
async function useCredit(userId, amount = 20) {
  const credit = await getCredit(userId);
  if (credit < amount) return false;
  await pool.execute('UPDATE users SET credit = credit - ? WHERE user_id = ?', [amount, userId]);
  await pool.execute(`INSERT INTO transactions (user_id, amount, type, note) VALUES (?, ?, 'use', 'detailed reading')`, [userId, -amount]);
  return true;
}

// Referral
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
async function getReferralCode(userId) {
  await pool.execute('INSERT IGNORE INTO users (user_id, credit) VALUES (?, 0)', [userId]);
  const [[row]] = await pool.execute('SELECT referral_code FROM users WHERE user_id = ?', [userId]);
  if (row && row.referral_code) return row.referral_code;
  let code, attempts = 0;
  do {
    code = generateCode(); attempts++;
    if (attempts > 20) throw new Error('Cannot generate unique referral code');
    const [[existing]] = await pool.execute('SELECT 1 FROM users WHERE referral_code = ?', [code]);
    if (!existing) break;
  } while (true);
  await pool.execute('UPDATE users SET referral_code = ? WHERE user_id = ?', [code, userId]);
  return code;
}
async function applyReferralCode(userId, code) {
  const upperCode = code.toUpperCase();
  const [[self]] = await pool.execute('SELECT referred_by FROM users WHERE user_id = ?', [userId]);
  if (self && self.referred_by) return { success: false, message: 'คุณเคยใช้โค้ดชวนเพื่อนไปแล้วค่ะ 🙏' };
  const [[referrer]] = await pool.execute('SELECT user_id FROM users WHERE referral_code = ?', [upperCode]);
  if (!referrer) return { success: false, message: `ไม่พบโค้ด "${upperCode}" ค่ะ กรุณาตรวจสอบอีกครั้งนะคะ 🙏` };
  if (referrer.user_id === userId) return { success: false, message: 'ไม่สามารถใช้โค้ดของตัวเองได้นะคะ 😅' };
  await addCredit(userId, 5, `referral from ${referrer.user_id}`);
  await addCredit(referrer.user_id, 5, `referral to ${userId}`);
  await pool.execute('UPDATE users SET referred_by = ? WHERE user_id = ?', [upperCode, userId]);
  return { success: true, referrerId: referrer.user_id };
}

// Subscription
async function hasActiveSubscription(userId) {
  const [[row]] = await pool.execute('SELECT subscription_expires_at FROM users WHERE user_id = ?', [userId]);
  if (!row || !row.subscription_expires_at) return false;
  return new Date(row.subscription_expires_at) > new Date();
}
async function activateSubscription(userId, months = 1) {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);
  const expiresStr = expires.toISOString();
  await pool.execute(`INSERT INTO users (user_id, credit, subscription_expires_at) VALUES (?, 0, ?)
    ON DUPLICATE KEY UPDATE subscription_expires_at = ?`, [userId, expiresStr, expiresStr]);
  return expiresStr;
}
async function revokeSubscription(userId) {
  await pool.execute('UPDATE users SET subscription_expires_at = NULL WHERE user_id = ?', [userId]);
}
async function getAllVIPs() {
  const [rows] = await pool.execute('SELECT user_id, subscription_expires_at FROM users WHERE subscription_expires_at IS NOT NULL');
  return rows.filter(r => new Date(r.subscription_expires_at) > new Date());
}
async function getSubscriptionInfo(userId) {
  const [[row]] = await pool.execute('SELECT subscription_expires_at, daily_reads_count, daily_reads_reset_at FROM users WHERE user_id = ?', [userId]);
  if (!row) return { active: false, expiresAt: null, dailyReads: 0 };
  const active = row.subscription_expires_at && new Date(row.subscription_expires_at) > new Date();
  return { active: !!active, expiresAt: row.subscription_expires_at, dailyReads: row.daily_reads_count || 0, dailyResetAt: row.daily_reads_reset_at };
}
async function canUseSubscriptionDaily(userId, maxPerDay = 2) {
  const [[row]] = await pool.execute('SELECT daily_reads_count, daily_reads_reset_at FROM users WHERE user_id = ?', [userId]);
  if (!row) return { canRead: true, remaining: maxPerDay };
  const today = new Date().toLocaleDateString('th-TH');
  const resetDate = row.daily_reads_reset_at ? new Date(row.daily_reads_reset_at).toLocaleDateString('th-TH') : null;
  if (resetDate !== today) return { canRead: true, remaining: maxPerDay };
  const used = row.daily_reads_count || 0;
  return { canRead: used < maxPerDay, remaining: Math.max(0, maxPerDay - used) };
}
async function recordSubscriptionRead(userId) {
  const [[row]] = await pool.execute('SELECT daily_reads_count, daily_reads_reset_at FROM users WHERE user_id = ?', [userId]);
  if (!row) return;
  const today = new Date().toLocaleDateString('th-TH');
  const resetDate = row.daily_reads_reset_at ? new Date(row.daily_reads_reset_at).toLocaleDateString('th-TH') : null;
  if (resetDate !== today) {
    await pool.execute('UPDATE users SET daily_reads_count = 1, daily_reads_reset_at = ? WHERE user_id = ?', [new Date().toISOString(), userId]);
  } else {
    await pool.execute('UPDATE users SET daily_reads_count = daily_reads_count + 1 WHERE user_id = ?', [userId]);
  }
}
async function getUserProfile(userId) {
  const [[row]] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
  return row || null;
}

// DOB
async function saveUserDOB(userId, dob, zodiac) {
  await pool.execute(`INSERT INTO users (user_id, credit, dob, zodiac) VALUES (?, 0, ?, ?)
    ON DUPLICATE KEY UPDATE dob = ?, zodiac = ?`, [userId, dob, zodiac, dob, zodiac]);
}
async function getUserDOB(userId) {
  const [[row]] = await pool.execute('SELECT dob, zodiac FROM users WHERE user_id = ?', [userId]);
  return row && row.dob ? { dob: row.dob, zodiac: row.zodiac } : null;
}

// Readings
async function saveReading(userId, service) {
  await pool.execute('INSERT INTO readings (user_id, service) VALUES (?, ?)', [userId, service]);
}
async function hasDailyReadingToday(userId) {
  const [[row]] = await pool.execute(`SELECT 1 FROM readings WHERE user_id = ? AND service = 'ดูดวงรายวัน' AND DATE(created_at) = CURDATE() LIMIT 1`, [userId]);
  return !!row;
}
async function getTopServices(userId, limit = 5) {
  const [rows] = await pool.execute('SELECT service, COUNT(*) as count FROM readings WHERE user_id = ? GROUP BY service ORDER BY count DESC LIMIT ?', [userId, limit]);
  return rows;
}
async function getReadingStats(userId) {
  const [[total]] = await pool.execute('SELECT COUNT(*) as n FROM readings WHERE user_id = ?', [userId]);
  const topServices = await getTopServices(userId, 10);
  const [[lastRead]] = await pool.execute('SELECT service, created_at FROM readings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
  return { total: total.n, topServices, lastRead: lastRead || null };
}
async function getGlobalStats() {
  const [rows] = await pool.execute('SELECT service, COUNT(*) as count FROM readings GROUP BY service ORDER BY count DESC');
  return rows;
}

// Pending Slips
async function addPendingSlip(userId, slipType, filename) {
  const [result] = await pool.execute(`INSERT INTO pending_slips (user_id, slip_type, filename, payment_method) VALUES (?, ?, ?, 'slip')`, [userId, slipType, filename]);
  return result.insertId;
}
async function addStripeRecord(userId, slipType, sessionId) {
  const [result] = await pool.execute(`INSERT INTO pending_slips (user_id, slip_type, filename, payment_method, status, resolved_at) VALUES (?, ?, ?, 'stripe', 'approved', NOW())`, [userId, slipType, sessionId]);
  return result.insertId;
}
async function addPendingAngPao(userId, slipType, angpaoLink) {
  const [result] = await pool.execute(`INSERT INTO pending_slips (user_id, slip_type, filename, payment_method, angpao_link) VALUES (?, ?, '', 'angpao', ?)`, [userId, slipType, angpaoLink]);
  return result.insertId;
}
async function getPendingSlips(status = 'pending') {
  const [rows] = await pool.execute(`SELECT p.*, u.line_name FROM pending_slips p LEFT JOIN users u ON p.user_id = u.user_id WHERE p.status = ? ORDER BY p.created_at DESC`, [status]);
  return rows;
}
async function resolvePendingSlip(slipId, status) {
  await pool.execute('UPDATE pending_slips SET status = ?, resolved_at = NOW() WHERE id = ?', [status, slipId]);
}
async function getPendingSlipById(slipId) {
  const [[row]] = await pool.execute('SELECT * FROM pending_slips WHERE id = ?', [slipId]);
  return row || null;
}
async function getPendingSlipCount() {
  const [[row]] = await pool.execute(`SELECT COUNT(*) as n FROM pending_slips WHERE status = 'pending'`);
  return row ? row.n : 0;
}

// Admin - Users
async function getAllUsers(limit = 200, offset = 0) {
  const [rows] = await pool.execute(`
    SELECT u.user_id, u.line_name, u.line_picture, u.credit, u.subscription_expires_at,
      u.daily_reads_count, u.last_purchase, u.assigned_reader_id, r.name as reader_name,
      (SELECT COUNT(*) FROM readings r2 WHERE r2.user_id = u.user_id) as total_readings
    FROM users u LEFT JOIN readers r ON u.assigned_reader_id = r.id
    ORDER BY (CASE WHEN u.last_purchase IS NULL THEN 1 ELSE 0 END), u.last_purchase DESC
    LIMIT ? OFFSET ?`, [limit, offset]);
  return rows;
}
async function getUserCount() {
  const [[row]] = await pool.execute('SELECT COUNT(*) as n FROM users');
  return row.n;
}
async function getTransactionHistory(userId, limit = 20) {
  const [rows] = await pool.execute('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
  return rows;
}
async function getRevenueStats() {
  const [[cr]] = await pool.execute(`SELECT SUM(amount) as total FROM transactions WHERE type = 'purchase'`);
  const [[sc]] = await pool.execute(`SELECT COUNT(*) as n FROM pending_slips WHERE slip_type = 'subscription' AND status = 'approved'`);
  const creditRevenue = parseFloat(cr.total) || 0;
  const subRevenue = sc.n * 199;
  return { creditRevenue, subRevenue, totalRevenue: creditRevenue + subRevenue };
}
async function getTodayStats() {
  const [[rr]] = await pool.execute(`SELECT COUNT(*) as n FROM readings WHERE DATE(created_at) = CURDATE()`);
  const [[cr]] = await pool.execute(`SELECT SUM(amount) as total FROM transactions WHERE type = 'purchase' AND DATE(created_at) = CURDATE()`);
  const [[sr]] = await pool.execute(`SELECT COUNT(*) as n FROM pending_slips WHERE slip_type = 'subscription' AND status = 'approved' AND DATE(resolved_at) = CURDATE()`);
  const credits = parseFloat(cr.total) || 0;
  return { readings: rr.n, credits, revenueToday: credits + (sr.n * 199) };
}

// Chat Logs
async function saveChatLog(userId, message, response) {
  await pool.execute('INSERT INTO chat_logs (user_id, message, response) VALUES (?, ?, ?)', [userId, message, response || '']);
}
async function updateLastFaceReadingLog(userId, rawImage, markedImage, textResponse) {
  await pool.execute(
    'UPDATE chat_logs SET message = ?, response = ? WHERE user_id = ? AND message = "วิเคราะห์โหงวเฮ้งใบหน้าจากรูปภาพ" ORDER BY id DESC LIMIT 1',
    [rawImage, `${markedImage}\n\n${textResponse}`, userId]
  );
}
async function updateLastPalmReadingLog(userId, rawImage, markedImage, textResponse) {
  await pool.execute(
    'UPDATE chat_logs SET message = ?, response = ? WHERE user_id = ? AND message = "วิเคราะห์ลายมือ" ORDER BY id DESC LIMIT 1',
    [rawImage, `${markedImage}\n\n${textResponse}`, userId]
  );
}
async function getChatLog(userId, limit = 50, since = null) {
  if (since) {
    const [rows] = await pool.execute('SELECT id, user_id, message, response, created_at FROM chat_logs WHERE user_id = ? AND created_at >= FROM_UNIXTIME(?) ORDER BY created_at DESC LIMIT ?', [userId, Math.floor(since/1000), limit]);
    return rows;
  }
  const [rows] = await pool.execute('SELECT id, user_id, message, response, created_at FROM chat_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
  return rows;
}
async function getRecentChats(limit = 100) {
  const [rows] = await pool.execute('SELECT id, user_id, message, response, created_at FROM chat_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows;
}
async function getRecentChatUsers(readerId = null, limit = 30) {
  if (readerId) {
    const [rows] = await pool.execute(`SELECT u.user_id, u.assigned_reader_id, u.line_name, u.line_picture,
      (SELECT MAX(created_at) FROM chat_logs WHERE user_id = u.user_id) as last_active,
      (SELECT message FROM chat_logs WHERE user_id = u.user_id ORDER BY created_at DESC LIMIT 1) as message,
      (SELECT COUNT(*) FROM chat_logs WHERE user_id = u.user_id AND message != '') as message_count
      FROM users u
      WHERE u.assigned_reader_id = ? ORDER BY last_active DESC LIMIT ?`, [readerId, limit]);
    return rows;
  }
  const [rows] = await pool.execute(`SELECT c.user_id, MAX(c.created_at) as last_active, ANY_VALUE(c.message) as message, ANY_VALUE(c.response) as response, ANY_VALUE(u.assigned_reader_id) as assigned_reader_id, ANY_VALUE(u.line_name) as line_name, ANY_VALUE(u.line_picture) as line_picture,
    (SELECT COUNT(*) FROM chat_logs WHERE user_id = c.user_id AND message != '') as message_count
    FROM chat_logs c LEFT JOIN users u ON c.user_id = u.user_id
    GROUP BY c.user_id ORDER BY last_active DESC LIMIT ?`, [limit]);
  return rows;
}

// Bookings
async function createBooking(userId, preferredDate, bookingType = 'online', note = '') {
  const [result] = await pool.execute('INSERT INTO bookings (user_id, preferred_date, booking_type, note) VALUES (?, ?, ?, ?)', [userId, preferredDate, bookingType, note]);
  return result.insertId;
}
async function getBookings(status = 'pending') {
  if (status === 'all') {
    const [rows] = await pool.execute(`SELECT b.*, u.line_name FROM bookings b LEFT JOIN users u ON b.user_id = u.user_id ORDER BY b.created_at DESC LIMIT 200`);
    return rows;
  }
  const [rows] = await pool.execute(`SELECT b.*, u.line_name FROM bookings b LEFT JOIN users u ON b.user_id = u.user_id WHERE b.status = ? ORDER BY b.created_at DESC`, [status]);
  return rows;
}
async function getBookingById(id) {
  const [[row]] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
  return row || null;
}
async function updateBookingStatus(id, status, confirmedDate = null, adminNote = '') {
  if (status === 'completed') {
    const [[booking]] = await pool.execute('SELECT user_id, reader_id FROM bookings WHERE id = ?', [id]);
    if (booking) {
      const [[user]] = await pool.execute('SELECT assigned_reader_id FROM users WHERE user_id = ?', [booking.user_id]);
      const readerId = booking.reader_id || (user ? user.assigned_reader_id : null);
      await pool.execute('UPDATE bookings SET status = ?, confirmed_date = ?, admin_note = ?, reader_id = ?, updated_at = NOW() WHERE id = ?', [status, confirmedDate, adminNote, readerId, id]);
      return;
    }
  }
  await pool.execute('UPDATE bookings SET status = ?, confirmed_date = ?, admin_note = ?, updated_at = NOW() WHERE id = ?', [status, confirmedDate, adminNote, id]);
}
async function getUserBookings(userId, limit = 5) {
  const [rows] = await pool.execute('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
  return rows;
}
async function getPendingBookingCount() {
  const [[row]] = await pool.execute(`SELECT COUNT(*) as n FROM bookings WHERE status = 'pending'`);
  return row ? row.n : 0;
}

// Readers
async function createReader(username, password, name) {
  try {
    const [result] = await pool.execute('INSERT INTO readers (username, password, name) VALUES (?, ?, ?)', [username, password, name]);
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new Error('Username นี้มีอยู่แล้ว');
    throw err;
  }
}
async function getReaders() {
  const [rows] = await pool.execute(`
    SELECT r.id, r.username, r.name, r.created_at,
      (SELECT COUNT(DISTINCT b.user_id) FROM bookings b WHERE b.reader_id = r.id AND b.status = 'completed') as completed_clients,
      (SELECT COUNT(*) FROM bookings b WHERE b.reader_id = r.id AND b.status = 'completed') as completed_readings,
      (SELECT ROUND(AVG(rating), 1) FROM reader_ratings rr WHERE rr.reader_id = r.id) as avg_rating,
      (SELECT COUNT(*) FROM reader_ratings rr WHERE rr.reader_id = r.id) as rating_count
    FROM readers r ORDER BY r.created_at DESC
  `);
  return rows;
}
async function verifyReader(username, password) {
  const [[reader]] = await pool.execute('SELECT id, username, name, password FROM readers WHERE username = ?', [username]);
  if (!reader) return null;
  if (reader.password === password) return { id: reader.id, username: reader.username, name: reader.name };
  return null;
}

async function addReaderRating(readerId, userId, rating) {
  await pool.execute('INSERT INTO reader_ratings (reader_id, user_id, rating) VALUES (?, ?, ?)', [readerId, userId, rating]);
}
async function assignReaderToUser(userId, readerId) {
  const [[hasUser]] = await pool.execute('SELECT 1 FROM users WHERE user_id = ?', [userId]);
  if (!hasUser) {
    await pool.execute('INSERT INTO users (user_id, assigned_reader_id) VALUES (?, ?)', [userId, readerId]);
  } else {
    await pool.execute('UPDATE users SET assigned_reader_id = ? WHERE user_id = ?', [readerId, userId]);
  }
  if (readerId) {
    await pool.execute("UPDATE bookings SET reader_id = ? WHERE user_id = ? AND status IN ('pending', 'confirmed')", [readerId, userId]);
  }
}
async function getUsersByReader(readerId) {
  if (readerId === null || readerId === undefined) {
    const [rows] = await pool.execute(`SELECT user_id, line_name, line_picture, credit, subscription_expires_at,
      (SELECT COUNT(*) FROM readings r WHERE r.user_id = users.user_id) as total_readings
      FROM users WHERE assigned_reader_id IS NULL
      AND EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = users.user_id AND b.status IN ('pending','confirmed'))
      ORDER BY line_name`);
    return rows;
  }
  const [rows] = await pool.execute(`SELECT user_id, line_name, line_picture, credit, subscription_expires_at,
    (SELECT COUNT(*) FROM readings r WHERE r.user_id = users.user_id) as total_readings
    FROM users WHERE assigned_reader_id = ? ORDER BY line_name`, [readerId]);
  return rows;
}
async function ensureUserExists(userId) {
  await pool.execute('INSERT IGNORE INTO users (user_id) VALUES (?)', [userId]);
}
async function getUserMemo(userId) {
  const [[row]] = await pool.execute('SELECT reader_memo FROM users WHERE user_id = ?', [userId]);
  return row ? row.reader_memo : '';
}
async function updateUserMemo(userId, memo) {
  await pool.execute('UPDATE users SET reader_memo = ? WHERE user_id = ?', [memo, userId]);
}
async function completeUserBookings(userId) {
  const [[u]] = await pool.execute('SELECT assigned_reader_id FROM users WHERE user_id = ?', [userId]);
  const readerId = u ? u.assigned_reader_id : null;
  const [bookings] = await pool.execute(`SELECT * FROM bookings WHERE user_id = ? AND status IN ('pending','confirmed')`, [userId]);
  if (bookings.length > 0) {
    await pool.execute(`UPDATE bookings SET status = 'completed', reader_id = COALESCE(reader_id, ?), updated_at = NOW() WHERE user_id = ? AND status IN ('pending','confirmed')`, [readerId, userId]);
    return bookings.map(b => ({ ...b, status: 'completed', reader_id: b.reader_id || readerId }));
  }
  return [];
}
async function getReaderHistory(readerId) {
  const [rows] = await pool.execute(`
    SELECT DISTINCT u.user_id, u.line_name, u.line_picture, u.credit, u.subscription_expires_at,
      (SELECT COUNT(*) FROM bookings b2 WHERE b2.user_id = u.user_id AND b2.reader_id = ? AND b2.status = 'completed') as served_count,
      (SELECT MAX(b3.updated_at) FROM bookings b3 WHERE b3.user_id = u.user_id AND b3.reader_id = ? AND b3.status = 'completed') as last_served_at
    FROM bookings b
    JOIN users u ON b.user_id = u.user_id
    WHERE b.reader_id = ? AND b.status = 'completed'
    ORDER BY last_served_at DESC
  `, [readerId, readerId, readerId]);
  return rows;
}
async function getBookingSystemCustomers() {
  const [rows] = await pool.execute(`
    SELECT DISTINCT u.user_id, u.line_name, u.line_picture, u.credit, u.subscription_expires_at,
      (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.user_id) as total_bookings,
      (SELECT COUNT(*) FROM bookings b2 WHERE b2.user_id = u.user_id AND b2.status = 'completed') as completed_bookings,
      (SELECT MAX(b3.created_at) FROM bookings b3 WHERE b3.user_id = u.user_id) as last_booking_at
    FROM users u
    JOIN bookings b4 ON u.user_id = b4.user_id
    ORDER BY last_booking_at DESC
  `);
  return rows;
}
async function updateLineProfile(userId, displayName, pictureUrl) {
  await pool.execute('UPDATE users SET line_name = ?, line_picture = ? WHERE user_id = ?', [displayName, pictureUrl, userId]);
}

// AI Training
async function saveAITrainingData(userId, topic, userDob, cards, prompt, response) {
  const [result] = await pool.execute('INSERT INTO ai_training_data (user_id, topic, user_dob, cards, prompt, response) VALUES (?, ?, ?, ?, ?, ?)', [userId, topic, userDob, cards, prompt, response]);
  return result.insertId;
}
async function updateAIRating(recordId, rating, feedback = null) {
  if (feedback) {
    await pool.execute('UPDATE ai_training_data SET rating = ?, feedback = ? WHERE id = ?', [rating, feedback, recordId]);
  } else {
    await pool.execute('UPDATE ai_training_data SET rating = ? WHERE id = ?', [rating, recordId]);
  }
}
async function getAITrainingData(limit = 100) {
  const [rows] = await pool.execute(`SELECT a.*, u.line_name FROM ai_training_data a LEFT JOIN users u ON a.user_id = u.user_id ORDER BY a.created_at DESC LIMIT ?`, [limit]);
  return rows;
}

// AI Context Helpers
async function getRecentPredictions(userId, limit = 3) {
  const [rows] = await pool.execute(
    `SELECT topic, cards, response, created_at FROM ai_training_data WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows;
}
async function getUserReadingPreference(userId) {
  const [rows] = await pool.execute(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as total,
      GROUP_CONCAT(CASE WHEN rating >= 4 THEN topic END SEPARATOR ', ') as liked_topics,
      GROUP_CONCAT(CASE WHEN rating <= 2 THEN topic END SEPARATOR ', ') as disliked_topics
     FROM ai_training_data WHERE user_id = ? AND rating > 0`, [userId]
  );
  return rows[0] || { avg_rating: 0, total: 0, liked_topics: null, disliked_topics: null };
}

// Cron helpers
async function getExpiringVIPs(days) {
  const [rows] = await pool.execute(`SELECT user_id, line_name, subscription_expires_at FROM users
    WHERE subscription_expires_at IS NOT NULL AND DATE(subscription_expires_at) = DATE_ADD(CURDATE(), INTERVAL ? DAY)`, [days]);
  return rows;
}
async function getOldPendingSlips(days) {
  const [rows] = await pool.execute(`SELECT id, filename FROM pending_slips
    WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  return rows;
}
async function deletePendingSlips(ids) {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await pool.execute(`DELETE FROM pending_slips WHERE id IN (${placeholders})`, ids);
}

// Broadcast
async function getAllUserIds() {
  const [rows] = await pool.execute('SELECT DISTINCT user_id FROM users WHERE user_id IS NOT NULL');
  return rows.map(r => r.user_id);
}
async function getVIPUserIds() {
  const [rows] = await pool.execute(`SELECT user_id FROM users WHERE subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW()`);
  return rows.map(r => r.user_id);
}

// Revenue Chart
async function getRevenueByDay(days = 30) {
  const [creditByDay] = await pool.execute(`SELECT DATE(created_at) as day, SUM(amount) as credit_revenue
    FROM transactions WHERE type = 'purchase' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY day ORDER BY day ASC`, [days]);
  const [subByDay] = await pool.execute(`SELECT DATE(resolved_at) as day, COUNT(*) * 199 as sub_revenue
    FROM pending_slips WHERE slip_type = 'subscription' AND status = 'approved' AND resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY day ORDER BY day ASC`, [days]);
  const map = {};
  for (const r of creditByDay) {
    const d = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day);
    map[d] = { day: d, credit_revenue: r.credit_revenue || 0, sub_revenue: 0 };
  }
  for (const r of subByDay) {
    const d = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day);
    if (!map[d]) map[d] = { day: d, credit_revenue: 0, sub_revenue: 0 };
    map[d].sub_revenue = r.sub_revenue || 0;
  }
  return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
}

module.exports = {
  getCredit, addCredit, useCredit,
  getReferralCode, applyReferralCode,
  hasActiveSubscription, activateSubscription, revokeSubscription, getAllVIPs, getSubscriptionInfo,
  canUseSubscriptionDaily, recordSubscriptionRead,
  getUserProfile, saveReading, hasDailyReadingToday, getTopServices, getReadingStats, getGlobalStats,
  saveUserDOB, getUserDOB,
  addPendingSlip, addPendingAngPao, addStripeRecord,
  getPendingSlips, resolvePendingSlip, getPendingSlipById, getPendingSlipCount,
  getAllUsers, getUserCount, getTransactionHistory, getTodayStats,
  saveChatLog, getChatLog, getRecentChats, getRecentChatUsers, updateLastFaceReadingLog, updateLastPalmReadingLog,
  createBooking, getBookings, getBookingById, updateBookingStatus, getUserBookings, getPendingBookingCount,
  createReader, getReaders, verifyReader, assignReaderToUser, getUsersByReader,
  ensureUserExists, updateLineProfile, getRevenueStats,
  getSetting, setSetting, isStripeEnabled, getAllSettings,
  saveAITrainingData, updateAIRating, getAITrainingData, getRecentPredictions, getUserReadingPreference, addReaderRating,
  getExpiringVIPs, getOldPendingSlips, deletePendingSlips,
  getUserMemo, updateUserMemo, completeUserBookings,
  getReaderHistory, getBookingSystemCustomers,
  getAllUserIds, getVIPUserIds, getRevenueByDay,
};
