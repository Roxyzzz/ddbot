const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const {
  getAllVIPs, activateSubscription, revokeSubscription, getSubscriptionInfo,
  addCredit, getCredit, getAllUsers, getUserCount,
  getTransactionHistory, getTodayStats, getGlobalStats, getReadingStats,
  getPendingSlips, getPendingSlipById, resolvePendingSlip, getPendingSlipCount,
  getChatLog, getRecentChats,
  getBookings, getBookingById, updateBookingStatus, getPendingBookingCount,
  createReader, getReaders, assignReaderToUser, getUsersByReader,
  getSetting, setSetting, isStripeEnabled,
  getAITrainingData, getAllUserIds, getVIPUserIds, getRevenueByDay,
  getAllSettings, getRevenueStats, getUserProfile, getReaderHistory, getBookingSystemCustomers
} = require('./database');

const { buildBookingFlexMessage, buildPaymentSuccessFlex, getDefaultFlexTemplate } = require('./flexMessages');

const SLIPS_DIR = path.join(__dirname, 'public', 'slips');
if (!fs.existsSync(SLIPS_DIR)) fs.mkdirSync(SLIPS_DIR, { recursive: true });

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Stats
router.get('/api/stats', async (req, res) => {
  try {
    const [vips, today, global, userCount, pendingCount, revenue, stripeEnabled] = await Promise.all([
      getAllVIPs(), getTodayStats(), getGlobalStats(), getUserCount(),
      getPendingSlipCount(), getRevenueStats(), isStripeEnabled()
    ]);
    res.json({
      vipCount: vips.length, userCount, pendingCount,
      todayReadings: today.readings, todayCredits: today.credits, todayRevenue: today.revenueToday,
      totalRevenue: revenue.totalRevenue, stripeEnabled, topServices: global.slice(0, 8),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Training
router.get('/api/ai-training', async (req, res) => {
  try { res.json(await getAITrainingData(100)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Stripe toggle
router.get('/api/settings/stripe', async (req, res) => {
  try { res.json({ enabled: await isStripeEnabled() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/api/settings/stripe', express.json(), async (req, res) => {
  try {
    const { enabled } = req.body;
    await setSetting('stripe_enabled', enabled ? '1' : '0');
    res.json({ success: true, enabled: await isStripeEnabled() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Slips list
router.get('/api/slips', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    res.json(await getPendingSlips(status));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve slip
router.post('/api/slips/:id/approve', express.json(), async (req, res) => {
  try {
    const slipId = parseInt(req.params.id);
    const slip = await getPendingSlipById(slipId);
    if (!slip) return res.status(404).json({ error: 'ไม่พบรายการสลิปนี้' });
    if (slip.status !== 'pending') return res.status(400).json({ error: 'สลิปนี้ถูกดำเนินการไปแล้ว' });
    const lineClient = req.app.get('lineClient');

    if (slip.slip_type === 'subscription') {
      const expiresAt = await activateSubscription(slip.user_id, 1);
      const expiresDate = new Date(expiresAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      await resolvePendingSlip(slipId, 'approved');
      if (lineClient) {
        try {
          await lineClient.pushMessage({ to: slip.user_id, messages: [{ type: 'flex', altText: '✅ สมัคร VIP สำเร็จแล้วค่ะ!', contents: await buildPaymentSuccessFlex('subscription', 199, 0, expiresAt) }] });
        } catch (e) { console.error('LINE push error:', e.message); }
      }
      return res.json({ success: true, message: `อนุมัติ VIP ให้ ${slip.user_id} ถึง ${expiresDate}` });
    } else {
      const amount = parseInt(req.body.amount);
      if (!amount || amount <= 0) return res.status(400).json({ error: 'กรุณาระบุจำนวนเครดิต' });
      await addCredit(slip.user_id, amount, `admin approved slip #${slipId}`);
      await resolvePendingSlip(slipId, 'approved');
      if (lineClient) {
        try {
          await lineClient.pushMessage({ to: slip.user_id, messages: [{ type: 'flex', altText: `✅ ยืนยันการชำระเงิน +${amount} เครดิต`, contents: await buildPaymentSuccessFlex('credit', amount, amount) }] });
        } catch (e) { console.error('LINE push error:', e.message); }
      }
      return res.json({ success: true, message: `เพิ่ม ${amount} เครดิต ให้ ${slip.user_id}` });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reject slip
router.post('/api/slips/:id/reject', express.json(), async (req, res) => {
  try {
    const slipId = parseInt(req.params.id);
    const slip = await getPendingSlipById(slipId);
    if (!slip) return res.status(404).json({ error: 'ไม่พบรายการสลิปนี้' });
    if (slip.status !== 'pending') return res.status(400).json({ error: 'สลิปนี้ถูกดำเนินการไปแล้ว' });
    await resolvePendingSlip(slipId, 'rejected');
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: slip.user_id, messages: [{ type: 'text', text: '❌ ไม่สามารถยืนยันการชำระเงินได้ค่ะ กรุณาตรวจสอบสลิปและส่งใหม่อีกครั้งนะคะ 🙏' }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// VIP list
router.get('/api/vip', async (req, res) => {
  try { res.json(await getAllVIPs()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Add VIP
router.post('/api/vip/add', express.json(), async (req, res) => {
  try {
    const { userId, months = 1 } = req.body;
    if (!userId) return res.status(400).json({ error: 'กรุณาระบุ LINE User ID' });
    const expiresAt = await activateSubscription(userId, parseInt(months));
    const expiresDate = new Date(expiresAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: `👑 ยืนยันการสมัครสมาชิกเรียบร้อยแล้วค่ะ!\n\n⭐ คุณเป็นสมาชิก DD Jang Premium แล้ว\n💪 สามารถดูดวงละเอียดได้วันละ 2 ครั้ง โดยไม่เสียเครดิต\n🗓️ สมาชิกภาพจนถึง: ${expiresDate}\n\nพิมพ์ "ดูดวงละเอียด" เพื่อเริ่มใช้งานได้เลยค่ะ 🔮✨` }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true, expiresAt, message: `เพิ่ม VIP ${months} เดือน ให้ ${userId}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove VIP
router.post('/api/vip/remove', express.json(), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'กรุณาระบุ LINE User ID' });
    await revokeSubscription(userId);
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: '👑 สมาชิก VIP ของคุณถูกยกเลิกแล้วค่ะ\n\nหากมีข้อสงสัยกรุณาติดต่อแอดมินนะคะ 🙏' }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true, message: `ยกเลิก VIP ของ ${userId} แล้ว` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add credits
router.post('/api/credits/add', express.json(), async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId) return res.status(400).json({ error: 'กรุณาระบุ LINE User ID' });
    const num = parseInt(amount);
    if (!num || num <= 0) return res.status(400).json({ error: 'กรุณาระบุจำนวนเครดิตที่ถูกต้อง' });
    await addCredit(userId, num, 'admin manual add');
    const newBalance = await getCredit(userId);
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: `✅ แอดมินได้เพิ่มเครดิตให้คุณแล้วค่ะ!\n\n💎 ได้รับเครดิตเพิ่ม ${num} บาท เข้าบัญชีแล้ว\n\nพิมพ์ "ดูดวงละเอียด" เพื่อรับคำทำนายได้เลยค่ะ 🔮🙏` }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true, newBalance, message: `เพิ่ม ${num} เครดิต ให้ ${userId} แล้ว (ยอดรวม: ${newBalance})` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Users list
router.get('/api/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [users, total] = await Promise.all([getAllUsers(limit, offset), getUserCount()]);
    res.json({ users, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// User detail
router.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [credit, subInfo, stats, transactions] = await Promise.all([
      getCredit(userId), getSubscriptionInfo(userId),
      getReadingStats(userId), getTransactionHistory(userId, 10)
    ]);
    res.json({ userId, credit, subscription: subInfo, stats, transactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Notify user
router.post('/api/notify', express.json(), async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'กรุณาระบุ userId และ message' });
    const lineClient = req.app.get('lineClient');
    if (!lineClient) return res.status(503).json({ error: 'LINE client ไม่พร้อมใช้งาน' });
    await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: message }] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Chats
router.get('/api/chats', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    res.json(await getRecentChats(limit));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/api/chats/:userId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json(await getChatLog(req.params.userId, limit));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bookings
router.get('/api/bookings', async (req, res) => {
  try { res.json(await getBookings(req.query.status || 'pending')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/api/bookings/count', async (req, res) => {
  try { res.json({ count: await getPendingBookingCount() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/api/bookings/:id/confirm', express.json(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { confirmedDate = '', adminNote = '' } = req.body;
    const booking = await getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจองนี้' });
    await updateBookingStatus(id, 'confirmed', confirmedDate, adminNote);
    const [updatedBooking, userProfile] = await Promise.all([getBookingById(id), getUserProfile(booking.user_id)]);
    let readerName = null;
    if (userProfile && userProfile.assigned_reader_id) {
      const readers = await getReaders();
      const reader = readers.find(r => r.id === userProfile.assigned_reader_id);
      if (reader) readerName = reader.name;
    }
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: booking.user_id, messages: [{ type: 'flex', altText: 'ดีจังยืนยันการนัดหมายของคุณแล้วค่ะ', contents: await buildBookingFlexMessage(updatedBooking, 'ยืนยันการนัดหมายของคุณแล้ว', null, readerName) }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true, message: `ยืนยันคิว #${id} เรียบร้อยแล้วค่ะ` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/api/bookings/:id/reject', express.json(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { adminNote = '' } = req.body;
    const booking = await getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจองนี้' });
    await updateBookingStatus(id, 'rejected', null, adminNote);
    const updatedBooking = await getBookingById(id);
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: booking.user_id, messages: [{ type: 'flex', altText: 'ดีจังปฏิเสธการนัดหมายของคุณ', contents: await buildBookingFlexMessage(updatedBooking, 'ปฏิเสธการจองคิว') }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true, message: `ปฏิเสธคิว #${id} เรียบร้อยแล้วค่ะ` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/api/bookings/:id/complete', express.json(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const booking = await getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจองนี้' });
    await updateBookingStatus(id, 'completed', booking.confirmed_date, booking.admin_note);
    await assignReaderToUser(booking.user_id, null);
    const updatedBooking = await getBookingById(id);
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      try {
        await lineClient.pushMessage({ to: booking.user_id, messages: [{ type: 'flex', altText: 'ขอบคุณที่ใช้บริการดูดวง', contents: await buildBookingFlexMessage(updatedBooking, 'เสร็จสิ้นการดูดวง') }] });
      } catch (e) { console.error('LINE push error:', e.message); }
    }
    res.json({ success: true, message: `เสร็จสิ้นคิว #${id} เรียบร้อยแล้วค่ะ` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Readers
router.get('/api/readers', async (req, res) => {
  try { res.json(await getReaders()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/api/readers', express.json(), async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Missing fields' });
    const id = await createReader(username, password, name);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/api/unassigned-users', async (req, res) => {
  try { res.json(await getUsersByReader(null)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/api/readers/:id/users', async (req, res) => {
  try { res.json(await getUsersByReader(parseInt(req.params.id))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/api/users/:userId/assign-reader', express.json(), async (req, res) => {
  try {
    const { readerId } = req.body;
    await assignReaderToUser(req.params.userId, readerId || null);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/api/readers/:id/history', async (req, res) => {
  try { res.json(await getReaderHistory(parseInt(req.params.id))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/api/booking-customers', async (req, res) => {
  try { res.json(await getBookingSystemCustomers()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Revenue Chart
router.get('/api/revenue-chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    res.json(await getRevenueByDay(days));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Settings
const CORE_FLEX_REGISTRY = [
  { key: 'flex_booking', label: '📅 การจองคิว' },
  { key: 'flex_payment_menu', label: '💳 เมนูชำระเงิน' },
  { key: 'flex_payment_success', label: '✅ ชำระเงินสำเร็จ' },
  { key: 'flex_rating', label: '⭐ ขอคะแนน AI' },
  { key: 'flex_reader_rating', label: '🔮 ขอคะแนนหมอดู' },
  { key: 'flex_profile', label: '👤 โปรไฟล์ผู้ใช้' },
  { key: 'flex_profile_vip', label: '👑 โปรไฟล์ VIP' },
  { key: 'flex_ad', label: '🎯 โฆษณา' }
];

router.get('/api/flex-templates', async (req, res) => {
  try {
    const rawSettings = await getAllSettings();
    const dynamicKeys = Object.keys(rawSettings).filter(k => k.startsWith('flex_'));
    
    let templates = [...CORE_FLEX_REGISTRY];
    const coreKeys = CORE_FLEX_REGISTRY.map(t => t.key);
    
    for (const dk of dynamicKeys) {
      if (!coreKeys.includes(dk)) {
        templates.push({ key: dk, label: `🔧 ${dk} (Custom)` });
      }
    }
    
    res.json(templates);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function cleanFlexJson(str) {
  if (!str || !str.trim()) return '';
  // Try 1: direct JSON parse (handles {"type":"bubble"} or "{\"type\":\"bubble\"}")
  try {
    let parsed = JSON.parse(str);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return JSON.stringify(parsed);
  } catch (err1) {
    // Try 2: unescape literal \n and \" if stored without outer quotes
    try {
      let unescaped = str.replace(/\\n/g, '').replace(/\\"/g, '"');
      let parsed = JSON.parse(unescaped);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return JSON.stringify(parsed);
    } catch (err2) {
      return str; // Fallback to raw string if completely failed
    }
  }
}

router.get('/api/settings', async (req, res) => {
  try {
    const rawSettings = await getAllSettings();
    const settings = { ...rawSettings };
    for (const key of Object.keys(settings)) {
      if (key.startsWith('flex_')) {
        settings[key] = cleanFlexJson(settings[key]);
      }
    }
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/api/settings', express.json(), async (req, res) => {
  try {
    const ALLOWED_CORE_KEYS = [
      'credit_price', 'subscription_price', 'welcome_message', 'stripe_enabled', 'rate_limit', 'vip_days'
    ];
    for (const [key, value] of Object.entries(req.body)) {
      if (ALLOWED_CORE_KEYS.includes(key) || key.startsWith('flex_')) {
        let v = value;
        if (key.startsWith('flex_')) {
          v = cleanFlexJson(value);
        }
        await setSetting(key, v);
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/api/settings/flex-default/:type', async (req, res) => {
  try {
    const template = await getDefaultFlexTemplate(req.params.type);
    res.json({ template });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Broadcast
router.post('/api/broadcast', express.json(), async (req, res) => {
  try {
    const { message, target, msgType = 'text' } = req.body;
    let lineMessages = [];
    
    if (msgType === 'flex_ad') {
      const adSetting = await getSetting('flex_ad');
      if (!adSetting) {
        return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า Flex Message (โฆษณา) ในหน้า Settings' });
      }
      try {
        let parsed = JSON.parse(adSetting);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (parsed.type === 'bubble' || parsed.type === 'carousel') {
          lineMessages = [{ type: 'flex', altText: 'ประกาศใหม่จาก DD Jang', contents: parsed }];
        } else if (parsed.type === 'flex') {
          lineMessages = [parsed];
        } else {
          return res.status(400).json({ error: 'รูปแบบ JSON โฆษณาไม่ถูกต้อง' });
        }
      } catch(e) {
        return res.status(400).json({ error: 'เกิดข้อผิดพลาดในการโหลด JSON โฆษณา' });
      }
    } else if (msgType === 'flex') {
      if (!message || !message.trim()) return res.status(400).json({ error: 'ข้อความว่างเปล่า' });
      try {
        let parsed = JSON.parse(message);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        
        // Wrap in flex envelope if they only pasted the bubble/carousel part
        if (parsed.type === 'bubble' || parsed.type === 'carousel') {
          lineMessages = [{
            type: 'flex',
            altText: 'ประกาศใหม่จาก DD Jang',
            contents: parsed
          }];
        } else if (parsed.type === 'flex') {
          lineMessages = [parsed];
        } else {
          return res.status(400).json({ error: 'JSON ของ Flex Message ไม่ถูกต้อง (ต้องเป็น bubble, carousel หรือ flex)' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'รูปแบบ JSON ไม่ถูกต้อง: ' + err.message });
      }
    } else {
      lineMessages = [{ type: 'text', text: message }];
    }

    let userIds = target === 'vip' ? await getVIPUserIds() : await getAllUserIds();
    // Filter out invalid LINE user IDs (e.g. mock users like 'test_user_credit')
    userIds = userIds.filter(id => /^U[0-9a-f]{32}$/i.test(id));
    
    if (userIds.length === 0) return res.json({ success: true, sent: 0 });
    const lineClient = req.app.get('lineClient');
    if (!lineClient) return res.status(500).json({ error: 'LINE client not available' });
    let sent = 0;
    const CHUNK = 500;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const chunk = userIds.slice(i, i + CHUNK);
      await lineClient.multicast({ to: chunk, messages: lineMessages });
      sent += chunk.length;
    }
    res.json({ success: true, sent });
  } catch (err) {
    let errMsg = err.message;
    if (err.body) {
      try {
        const d = typeof err.body === 'string' ? JSON.parse(err.body) : err.body;
        if (d.message) errMsg += ' - ' + d.message;
        if (d.details && d.details.length > 0) {
          errMsg += ' (' + d.details.map(x => `${x.property}: ${x.message}`).join(', ') + ')';
        }
      } catch(e) {}
    } else if (err.originalError && err.originalError.response && err.originalError.response.data) {
      const d = err.originalError.response.data;
      if (d.message) errMsg += ' - ' + d.message;
      if (d.details && d.details.length > 0) {
        errMsg += ' (' + d.details.map(x => `${x.property}: ${x.message}`).join(', ') + ')';
      }
    }
    res.status(500).json({ error: errMsg });
  }
});

// ==========================================
// Live Chat System
// ==========================================
router.get('/api/live-chats', async (req, res) => {
  const state = req.app.get('userLiveChatState');
  if (!state) return res.json([]);
  
  const chats = [];
  for (const [userId, chat] of state.entries()) {
    if (chat.active) {
      chats.push({
        userId,
        name: chat.name || 'ผู้ใช้ (' + userId.slice(-4) + ')',
        pic: chat.pic || null,
        unread: chat.unread,
        messages: chat.messages,
        startTime: chat.startTime
      });
    }
  }
  chats.sort((a, b) => b.startTime - a.startTime);
  res.json(chats);
});

router.post('/api/live-chats/reply', express.json(), async (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'Missing userId or text' });
  const lineClient = req.app.get('lineClient');
  if (!lineClient) return res.status(500).json({ error: 'LINE client not available' });

  const state = req.app.get('userLiveChatState');
  if (!state || !state.has(userId)) return res.status(404).json({ error: 'Chat session not found' });

  try {
    await lineClient.pushMessage({
      to: userId,
      messages: [{ type: 'text', text }]
    });
    const chat = state.get(userId);
    chat.messages.push({ sender: 'admin', text, time: Date.now() });
    chat.unread = 0; // reset unread count when admin replies
    const { saveChatLog } = require('./database');
    try { await saveChatLog(userId, '', `[Admin Reply] ${text}`); } catch(_) {}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/live-chats/end', express.json(), async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const lineClient = req.app.get('lineClient');
  const state = req.app.get('userLiveChatState');
  if (state && state.has(userId)) {
    state.delete(userId);
    if (lineClient) {
      try {
        await lineClient.pushMessage({
          to: userId,
          messages: [{ type: 'text', text: 'แอดมินได้ทำการจบการสนทนาแล้วค่ะ หากมีข้อสงสัยเพิ่มเติม สามารถพิมพ์ถามบอทดีจังได้เลยนะคะ 💖' }]
        });
      } catch(e) {}
    }
  }
  res.json({ success: true });
});

module.exports = router;
