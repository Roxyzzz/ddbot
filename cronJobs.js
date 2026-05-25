const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getExpiringVIPs, getOldPendingSlips, deletePendingSlips, getAllUserIds } = require('./database');

// ไพ่ทาโรต์ (เหมือนกันกับใน index.js)
const TAROT_CARDS = [
  { file: 'the_fool.png',          card: '0. The Fool',           meaning: 'การเริ่มต้นใหม่ ความกล้าหาญ อิสระ',                    advice: 'กล้าที่จะก้าวเดินและเปิดรับสิ่งใหม่' },
  { file: 'the_magician.png',      card: 'I. The Magician',       meaning: 'พรสวรรค์ การควบคุมสถานการณ์ ศักยภาพ',                  advice: 'ใช้ศักยภาพที่คุณมีลงมือทำ' },
  { file: 'the_high_priestess.png',card: 'II. The High Priestess',meaning: 'สัญชาตญาณ ความลึกลับ จิตใต้สำนึก',                    advice: 'จงเชื่อในสัญชาตญาณและเสียงเรียกร้องในใจ' },
  { file: 'the_empress.png',       card: 'III. The Empress',      meaning: 'ความอุดมสมบูรณ์ ความเป็นแม่ การดูแลเอาใจใส่',         advice: 'มอบความรักให้ตัวเองและคนรอบข้างให้มากขึ้น' },
  { file: 'the_emperor.png',       card: 'IV. The Emperor',       meaning: 'อำนาจ โครงสร้าง ความมั่นคง',                          advice: 'ใช้เหตุผลและกฎระเบียบในการจัดการปัญหา' },
  { file: 'the_hierophant.png',    card: 'V. The Hierophant',     meaning: 'ความเชื่อ ประเพณี การเรียนรู้',                        advice: 'ยึดมั่นในความดีงามและเรียนรู้จากผู้มีประสบการณ์' },
  { file: 'the_lovers.png',        card: 'VI. The Lovers',        meaning: 'ความรัก ความสามัคคี การตัดสินใจ',                      advice: 'ใช้หัวใจนำทางในการตัดสินใจเรื่องสำคัญ' },
  { file: 'the_chariot.png',       card: 'VII. The Chariot',      meaning: 'ชัยชนะ ความมุ่งมั่น การเอาชนะอุปสรรค',               advice: 'เดินหน้าต่อไปด้วยความมุ่งมั่นและไม่ย่อท้อ' },
  { file: 'strength.png',          card: 'VIII. Strength',        meaning: 'ความเข้มแข็ง ความอดทน ความเมตตา',                     advice: 'ใช้ความอ่อนโยนเอาชนะความรุนแรง' },
  { file: 'the_hermit.png',        card: 'IX. The Hermit',        meaning: 'การค้นหาตัวเอง การปลีกวิเวก ภูมิปัญญา',               advice: 'หาเวลาทบทวนตัวเองเงียบๆ เพื่อค้นหาคำตอบ' },
  { file: 'wheel_of_fortune.png',  card: 'X. Wheel of Fortune',   meaning: 'โชคชะตา การเปลี่ยนแปลง วัฏจักร',                     advice: 'ยอมรับการเปลี่ยนแปลงและปรับตัวตามสถานการณ์' },
  { file: 'justice.png',           card: 'XI. Justice',           meaning: 'ความยุติธรรม ความสมดุล กฎหมาย',                       advice: 'ทำทุกอย่างด้วยความยุติธรรมและตรงไปตรงมา' },
  { file: 'the_hanged_man.png',    card: 'XII. The Hanged Man',   meaning: 'การเสียสละ การปล่อยวาง มุมมองใหม่',                   advice: 'ลองมองปัญหาในมุมกลับเพื่อค้นพบทางออกใหม่ๆ' },
  { file: 'death.png',             card: 'XIII. Death',           meaning: 'การสิ้นสุดเพื่อเริ่มต้นใหม่ การเปลี่ยนแปลงครั้งใหญ่',advice: 'ปล่อยวางสิ่งเก่าๆ เพื่อให้โอกาสใหม่ๆ ได้เข้ามา' },
  { file: 'temperance.png',        card: 'XIV. Temperance',       meaning: 'ความสมดุล การประนีประนอม การเยียวยา',                  advice: 'รักษาสมดุลในชีวิตและปรับตัวให้เข้ากับสถานการณ์' },
  { file: 'the_devil.png',         card: 'XV. The Devil',         meaning: 'ความยึดติด กิเลส การหลงผิด ข้อจำกัด',                advice: 'ปลดปล่อยตัวเองจากความยึดติดหรือนิสัยที่ไม่ดี' },
  { file: 'the_tower.png',         card: 'XVI. The Tower',        meaning: 'การพังทลาย หายนะ การเปลี่ยนแปลงกะทันหัน',            advice: 'ยอมรับสิ่งที่เกิดขึ้นและสร้างขึ้นใหม่ให้แข็งแรงกว่าเดิม' },
  { file: 'the_star.png',          card: 'XVII. The Star',        meaning: 'ความหวัง การเยียวยา แรงบันดาลใจ',                     advice: 'มองโลกในแง่ดีและเชื่อมั่นว่าทุกอย่างจะดีขึ้น' },
  { file: 'the_moon.png',          card: 'XVIII. The Moon',       meaning: 'ความสับสน ความกลัว ภาพลวงตา',                        advice: 'อย่าด่วนตัดสินใจ ค่อยๆ มองให้เห็นความจริงที่ซ่อนอยู่' },
  { file: 'the_sun.png',           card: 'XIX. The Sun',          meaning: 'ความสำเร็จ ความสุข ความร่าเริง ความอบอุ่น',           advice: 'เปิดรับพลังงานบวกและทำตัวให้สดใสสนุกสนาน' },
  { file: 'judgement.png',         card: 'XX. Judgement',         meaning: 'การตื่นรู้ การฟื้นคืนชีพ การตัดสิน',                 advice: 'ทบทวนอดีต เรียนรู้จากมัน และเริ่มต้นใหม่ให้ดีกว่าเดิม' },
  { file: 'the_world.png',         card: 'XXI. The World',        meaning: 'ความสมบูรณ์แบบ ความสำเร็จสูงสุด การเดินทาง',          advice: 'ชื่นชมกับความสำเร็จและเตรียมพร้อมสำหรับการเดินทางครั้งใหม่' },
];

// สร้างคำทำนายประจำวันด้วย Gemini (เรียกแค่ 1 ครั้ง ประหยัดโทเคน)
async function generateDailyFortune(card) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction: `คุณคือ "ดีจัง" หมอดูไพ่ยิปซีผู้หญิงที่อ่อนหวาน ใจดี ใช้คำลงท้าย "ค่ะ" หรือ "นะคะ" เสมอ ตอบสั้นๆ กระชับ ไม่เกิน 4-5 บรรทัด`,
  });

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const prompt = `วันนี้ (${today}) ไพ่ประจำวันของทุกคนคือ "${card.card}" (ความหมาย: ${card.meaning}, คำแนะนำ: ${card.advice})
ช่วยเขียนคำทำนายดวงรายวันสั้นๆ ครอบคลุม ความรัก การงาน การเงิน สุขภาพ ให้เข้ากับพลังงานของวันนี้แบบเป็นกันเอง อ่านง่าย ใจดี และสร้างแรงบันดาลใจ`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ส่ง Push Message แบบ batch (ป้องกัน rate limit LINE API)
async function pushToAllUsers(client, userIds, messages) {
  const BATCH_SIZE = 10;  // ส่งทีละ 10 คน
  const DELAY_MS   = 500; // หน่วงเวลา 0.5 วินาทีต่อ batch

  let sent = 0, failed = 0;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (userId) => {
        try {
          await client.pushMessage({ to: userId, messages });
          sent++;
        } catch (err) {
          failed++;
          console.error(`[DailyPush] Failed to send to ${userId}:`, err.message);
        }
      })
    );
    if (i + BATCH_SIZE < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  return { sent, failed };
}

function startCronJobs(client) {
  const BASE_URL = process.env.BASE_URL || 'https://palpitate-subscript-jurist.ngrok-free.dev';

  // =========================================================
  // Task 1: 🔮 Push ดวงรายวันทุก 8 โมงเช้า (เวลาไทย = 01:00 UTC)
  // เรียก AI แค่ 1 ครั้ง → ส่งหาลูกค้าทุกคน
  // =========================================================
  cron.schedule('0 1 * * *', async () => {
    console.log('[Cron] 🔮 Running daily fortune push...');
    try {
      // 1. สุ่มไพ่ประจำวัน
      const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
      console.log(`[DailyPush] Today's card: ${picked.card}`);

      // 2. สร้างคำทำนายด้วย AI (เรียกแค่ครั้งเดียว!)
      const fortuneText = await generateDailyFortune(picked);
      console.log('[DailyPush] Fortune generated.');

      // 3. ดึง user IDs ทั้งหมด
      const userIds = await getAllUserIds();
      if (userIds.length === 0) {
        console.log('[DailyPush] No users found, skipping.');
        return;
      }
      console.log(`[DailyPush] Sending to ${userIds.length} users...`);

      // 4. สร้างข้อความ push
      const cardImageUrl = `${BASE_URL}/public/images/${picked.file}`;
      const messages = [
        {
          type: 'text',
          text: `🌅 สวัสดีตอนเช้าค่ะ!\n\n✨ ดีจังสุ่มไพ่ประจำวันนี้ให้แล้วค่ะ\n🃏 ไพ่วันนี้คือ: ${picked.card}\n\n${fortuneText}\n\n━━━━━━━━━━━━━━\n💬 พิมพ์ "ดูดวงรายวัน" เพื่อสุ่มไพ่เองได้เลยนะคะ ✨`
        },
        {
          type: 'image',
          originalContentUrl: cardImageUrl,
          previewImageUrl: cardImageUrl,
        },
      ];

      // 5. ส่งทีละ batch
      const { sent, failed } = await pushToAllUsers(client, userIds, messages);
      console.log(`[DailyPush] Done — sent: ${sent}, failed: ${failed}`);

    } catch (err) {
      console.error('[Cron] Error in daily fortune push:', err);
    }
  });

  // =========================================================
  // Task 2: แจ้งเตือน VIP ล่วงหน้า 3 วัน (เวลาเที่ยง = 05:00 UTC)
  // =========================================================
  cron.schedule('0 5 * * *', async () => {
    console.log('[Cron] Running VIP expiration check...');
    try {
      const expiringUsers = await getExpiringVIPs(3);
      for (const user of expiringUsers) {
        await client.pushMessage({
          to: user.user_id,
          messages: [
            {
              type: 'text',
              text: `⚠️ ประกาศจากดีจังค่ะ\n\nสถานะสมาชิก Premium ของคุณ ${user.line_name || ''} กำลังจะหมดอายุในอีก 3 วันนะคะ ✨\n\nสามารถต่ออายุล่วงหน้าได้ที่เมนู "👑 VIP Menu" หรือพิมพ์ "เติมเงิน" ได้เลยค่ะ 🙏`
            }
          ]
        });
        console.log(`[Cron] Sent expiry warning to ${user.user_id}`);
      }
    } catch (err) {
      console.error('[Cron] Error in VIP expiry check:', err);
    }
  });

  // =========================================================
  // Task 3: ลบไฟล์สลิปเก่า (เวลาเที่ยงคืน = 17:00 UTC วันก่อน)
  // =========================================================
  cron.schedule('0 17 * * *', async () => {
    console.log('[Cron] Running old slip cleanup...');
    try {
      const oldSlips = await getOldPendingSlips(3);
      if (oldSlips.length === 0) return;

      const idsToDelete = [];
      const slipsDir = path.join(__dirname, 'public', 'slips');

      for (const slip of oldSlips) {
        const filePath = path.join(slipsDir, slip.filename);
        if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
        idsToDelete.push(slip.id);
      }

      await deletePendingSlips(idsToDelete);
      console.log(`[Cron] Cleaned up ${idsToDelete.length} old slips.`);
    } catch (err) {
      console.error('[Cron] Error in slip cleanup:', err);
    }
  });

  console.log('⏰ Cron jobs initialized (Daily push: 08:00, VIP check: 12:00, Cleanup: 00:00 Bangkok time).');
}

module.exports = { startCronJobs };
