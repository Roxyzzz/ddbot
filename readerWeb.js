const express = require('express');
const path = require('path');
const { getRecentChatUsers, getChatLog, saveChatLog, verifyReader, getUserMemo, updateUserMemo, completeUserBookings, assignReaderToUser } = require('./database');
const { buildRatingFlexMessage, buildBookingFlexMessage } = require('./flexMessages');

const router = express.Router();
router.use(express.json());

const liveChatUsers = new Map();
const sessionStartTimes = new Map();

router.use('/public', express.static(path.join(__dirname, 'public/reader')));
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'public', 'reader', 'index.html'));
});

function requireReaderAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, username, name] = decoded.split(':');
    if (!id || !username) throw new Error('Invalid token');
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) throw new Error('Old token format');
    req.reader = { id: parsedId, username, name };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid Token' });
  }
}

// API: Login
router.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const reader = await verifyReader(username, password);
    if (!reader) return res.status(401).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });
    const token = Buffer.from(`${reader.id}:${reader.username}:${reader.name}`).toString('base64');
    res.json({ success: true, token, reader });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ดึงรายชื่อคนที่คุยล่าสุด
router.get('/api/users', requireReaderAuth, async (req, res) => {
  try {
    const users = await getRecentChatUsers(req.reader.id, 50);
    const result = users.map(u => ({ ...u, isLive: liveChatUsers.has(u.user_id) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ดึงประวัติแชท
router.get('/api/chats/:userId', requireReaderAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    // ใช้ sessionStartTimes เพื่อดึงเฉพาะแชทของรอบปัจจุบันเท่านั้น
    const since = sessionStartTimes.get(userId) || null;
    const chats = (await getChatLog(userId, 50, since)).reverse();
    res.json({ chats, isLive: liveChatUsers.has(userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: หมอดูพิมพ์ตอบลูกค้า
router.post('/api/chats/:userId/send', requireReaderAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'ข้อความว่างเปล่า' });
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: message }] });
    }
    await saveChatLog(userId, '', `👩‍🔮 [${req.reader.name}]: ${message}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: เปิด/ปิดโหมด Live Chat
router.post('/api/chats/:userId/toggle-live', requireReaderAuth, (req, res) => {
  try {
    const userId = req.params.userId;
    const { isLive } = req.body;
    
    // ตั้งค่าเวลาเริ่ม Session หากยังไม่มี
    if (!sessionStartTimes.has(userId)) {
      sessionStartTimes.set(userId, Date.now());
    }

    if (isLive) { 
      liveChatUsers.set(userId, true); 
    } else { 
      liveChatUsers.delete(userId); 
    }
    res.json({ success: true, isLive: liveChatUsers.has(userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ดึง Memo
router.get('/api/chats/:userId/memo', requireReaderAuth, async (req, res) => {
  try {
    const memo = await getUserMemo(req.params.userId);
    res.json({ memo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: บันทึก Memo
router.post('/api/chats/:userId/memo', requireReaderAuth, async (req, res) => {
  try {
    const { memo } = req.body;
    await updateUserMemo(req.params.userId, memo || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: จบการสนทนา
router.post('/api/chats/:userId/complete', requireReaderAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    await assignReaderToUser(userId, null);
    liveChatUsers.delete(userId);
    sessionStartTimes.delete(userId); // ลบ session เพื่อให้รอบหน้าว่างเปล่า
    const completedBookings = await completeUserBookings(userId);
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      let messages = [];
      if (completedBookings && completedBookings.length > 0) {
        for (const b of completedBookings) {
          messages.push({ type: 'flex', altText: 'ขอบคุณที่ใช้บริการดูดวง', contents: await buildBookingFlexMessage(b, 'เสร็จสิ้นการดูดวง') });
        }
      } else {
        messages.push({ type: 'text', text: 'การดูดวงเสร็จสิ้นเรียบร้อยแล้วค่ะ ขอบคุณที่ใช้บริการดีจังนะคะ! 💕' });
        messages.push(await buildRatingFlexMessage());
      }
      await lineClient.pushMessage({ to: userId, messages });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { readerRouter: router, liveChatUsers };
