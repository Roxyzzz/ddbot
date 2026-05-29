const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getRecentChatUsers, getChatLog, saveChatLog, verifyReader, getUserMemo, updateUserMemo, completeUserBookings, assignReaderToUser } = require('./database');
const { buildRatingFlexMessage, buildReaderRatingFlexMessage, buildBookingFlexMessage } = require('./flexMessages');

const router = express.Router();
router.use(express.json());

// Multer config for reader image uploads
const chatImageDir = path.join(__dirname, 'public', 'chat_images');
if (!fs.existsSync(chatImageDir)) fs.mkdirSync(chatImageDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatImageDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `reader_${req.params.userId}_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

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
    const full = req.query.full === '1';
    // ถ้า full=1 ดึงทั้งหมด, ไม่งั้นใช้ sessionStartTimes ดึงเฉพาะรอบปัจจุบัน
    const since = full ? null : (sessionStartTimes.get(userId) || null);
    const limit = full ? 200 : 50;
    const chats = (await getChatLog(userId, limit, since)).reverse();
    // หา lastActive จาก chat ล่าสุดที่เป็นข้อความจากลูกค้า
    const lastCustomerMsg = [...chats].reverse().find(c => c.message && c.message !== '');
    const lastActive = lastCustomerMsg ? lastCustomerMsg.created_at : null;
    res.json({ chats, isLive: liveChatUsers.has(userId), lastActive });
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

// API: หมอดูส่งรูปภาพให้ลูกค้า
router.post('/api/chats/:userId/send-image', requireReaderAuth, upload.single('image'), async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์รูปภาพ' });
    
    const BASE_URL = process.env.BASE_URL || '';
    const imageUrl = `${BASE_URL}/public/chat_images/${req.file.filename}`;
    
    const lineClient = req.app.get('lineClient');
    if (lineClient) {
      await lineClient.pushMessage({
        to: userId,
        messages: [{ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl }]
      });
    }
    await saveChatLog(userId, '', `👩‍🔮 [${req.reader.name}]: [IMAGE: ${imageUrl}]`);
    res.json({ success: true, imageUrl });
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
      const pendingBookingCompletions = req.app.get('pendingBookingCompletions');
      if (pendingBookingCompletions) {
        if (completedBookings && completedBookings.length > 0) {
          pendingBookingCompletions.set(userId, completedBookings);
        } else {
          pendingBookingCompletions.set(userId, [{ type: 'text', text: 'การดูดวงเสร็จสิ้นเรียบร้อยแล้วค่ะ ขอบคุณที่ใช้บริการดีจังนะคะ! 💕' }]);
        }
      }

      let messages = [];
      messages.push({ type: 'flex', altText: 'รบกวนให้คะแนนหมอดูด้วยค่ะ', contents: await buildReaderRatingFlexMessage(req.reader.id, req.reader.name) });
      await lineClient.pushMessage({ to: userId, messages });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { readerRouter: router, liveChatUsers };
