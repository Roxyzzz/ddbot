require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const line = require('@line/bot-sdk');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getCredit, addCredit, useCredit, getReferralCode, applyReferralCode, hasActiveSubscription, activateSubscription, revokeSubscription, getAllVIPs, getSubscriptionInfo, canUseSubscriptionDaily, recordSubscriptionRead, getUserProfile, saveReading, hasDailyReadingToday, getReadingStats, getGlobalStats, saveUserDOB, getUserDOB, addPendingSlip, addPendingAngPao, addStripeRecord, saveChatLog, updateLastFaceReadingLog, updateLastPalmReadingLog, createBooking, getUserBookings, ensureUserExists, updateLineProfile, isStripeEnabled, saveAITrainingData, updateAIRating } = require('./database');
const { buildBookingFlexMessage, buildPaymentMenuFlex, buildPaymentSuccessFlex, buildRatingFlexMessage, buildProfileFlexMessage } = require('./flexMessages');

const { generatePromptPayQR } = require('./promptpay');
const { createCheckoutSession, stripeClient } = require('./stripe');

// Discord removed — using Web Admin Panel instead
const { convertDateToThaiNumerology } = require('./astrology');
const adminRouter = require('./adminWeb');
const { readerRouter, liveChatUsers } = require('./readerWeb');
const { startCronJobs } = require('./cronJobs');
const { drawPhysiognomy } = require('./astrology_face');
const { drawPalmReading, verifyHandInImage } = require('./astrology_palm');

const app = express();
const port = process.env.PORT || 3000;

// ให้ Express สามารถเสิร์ฟไฟล์รูปภาพในโฟลเดอร์ public ได้
app.use('/public', express.static('public'));

// 1. โครงสร้างการตั้งค่า LINE Bot (ดึงจากไฟล์ .env)
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 1. Webhook (middleware is applied in app.post('/webhook'))

// 2. Admin Panel
app.use('/admin', adminRouter);

// 3. Reader Panel (Live Chat หมอดู)
app.use('/reader', readerRouter);

// 2. สร้าง Client สำหรับใช้ตอบข้อความกลับไปหาผู้ใช้ LINE
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});
const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: config.channelAccessToken,
});

// ให้ router อื่นๆ สามารถใช้ client ส่งข้อความได้
app.set('lineClient', client);

// 3. Start Cron Jobs
startCronJobs(client);

// Discord bot removed — managed via Web Admin Panel at /admin

// เอา LINE client ใส่ให้ adminRouter ใช้ได้
app.set('lineClient', client);

// ค่า Config จาก .env
const PROMPTPAY_ID = process.env.PROMPTPAY_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://palpitate-subscript-jurist.ngrok-free.dev';

const DETAILED_PRICE = 20; // บาท (ดูดวงละเอียด)
const FACE_PALM_PRICE = 50; // บาท (โหงวเฮ้ง / ลายมือ)
const SUBSCRIPTION_PRICE = 199; // บาท/เดือน

// ข้อมูลไพ่ทาโรต์ทั้งหมด
const TAROT_CARDS = [
  { file: 'the_fool.png', card: '0. The Fool', meaning: 'การเริ่มต้นใหม่ ความกล้าหาญ อิสระ', advice: 'กล้าที่จะก้าวเดินและเปิดรับสิ่งใหม่' },
  { file: 'the_magician.png', card: 'I. The Magician', meaning: 'พรสวรรค์ การควบคุมสถานการณ์ ศักยภาพ', advice: 'ใช้ศักยภาพที่คุณมีลงมือทำ' },
  { file: 'the_high_priestess.png', card: 'II. The High Priestess', meaning: 'สัญชาตญาณ ความลึกลับ จิตใต้สำนึก', advice: 'จงเชื่อในสัญชาตญาณและเสียงเรียกร้องในใจ' },
  { file: 'the_empress.png', card: 'III. The Empress', meaning: 'ความอุดมสมบูรณ์ ความเป็นแม่ การดูแลเอาใจใส่', advice: 'มอบความรักให้ตัวเองและคนรอบข้างให้มากขึ้น' },
  { file: 'the_emperor.png', card: 'IV. The Emperor', meaning: 'อำนาจ โครงสร้าง ความมั่นคง', advice: 'ใช้เหตุผลและกฎระเบียบในการจัดการปัญหา' },
  { file: 'the_hierophant.png', card: 'V. The Hierophant', meaning: 'ความเชื่อ ประเพณี การเรียนรู้', advice: 'ยึดมั่นในความดีงามและเรียนรู้จากผู้มีประสบการณ์' },
  { file: 'the_lovers.png', card: 'VI. The Lovers', meaning: 'ความรัก ความสามัคคี การตัดสินใจ', advice: 'ใช้หัวใจนำทางในการตัดสินใจเรื่องสำคัญ' },
  { file: 'the_chariot.png', card: 'VII. The Chariot', meaning: 'ชัยชนะ ความมุ่งมั่น การเอาชนะอุปสรรค', advice: 'เดินหน้าต่อไปด้วยความมุ่งมั่นและไม่ย่อท้อ' },
  { file: 'strength.png', card: 'VIII. Strength', meaning: 'ความเข้มแข็ง ความอดทน ความเมตตา', advice: 'ใช้ความอ่อนโยนเอาชนะความรุนแรง' },
  { file: 'the_hermit.png', card: 'IX. The Hermit', meaning: 'การค้นหาตัวเอง การปลีกวิเวก ภูมิปัญญา', advice: 'หาเวลาทบทวนตัวเองเงียบๆ เพื่อค้นหาคำตอบ' },
  { file: 'wheel_of_fortune.png', card: 'X. Wheel of Fortune', meaning: 'โชคชะตา การเปลี่ยนแปลง วัฏจักร', advice: 'ยอมรับการเปลี่ยนแปลงและปรับตัวตามสถานการณ์' },
  { file: 'justice.png', card: 'XI. Justice', meaning: 'ความยุติธรรม ความสมดุล กฎหมาย', advice: 'ทำทุกอย่างด้วยความยุติธรรมและตรงไปตรงมา' },
  { file: 'the_hanged_man.png', card: 'XII. The Hanged Man', meaning: 'การเสียสละ การปล่อยวาง มุมมองใหม่', advice: 'ลองมองปัญหาในมุมกลับเพื่อค้นพบทางออกใหม่ๆ' },
  { file: 'death.png', card: 'XIII. Death', meaning: 'การสิ้นสุดเพื่อเริ่มต้นใหม่ การเปลี่ยนแปลงครั้งใหญ่', advice: 'ปล่อยวางสิ่งเก่าๆ เพื่อให้โอกาสใหม่ๆ ได้เข้ามา' },
  { file: 'temperance.png', card: 'XIV. Temperance', meaning: 'ความสมดุล การประนีประนอม การเยียวยา', advice: 'รักษาสมดุลในชีวิตและปรับตัวให้เข้ากับสถานการณ์' },
  { file: 'the_devil.png', card: 'XV. The Devil', meaning: 'ความยึดติด กิเลส การหลงผิด ข้อจำกัด', advice: 'ปลดปล่อยตัวเองจากความยึดติดหรือนิสัยที่ไม่ดี' },
  { file: 'the_tower.png', card: 'XVI. The Tower', meaning: 'การพังทลาย หายนะ การเปลี่ยนแปลงกะทันหัน', advice: 'ยอมรับสิ่งที่เกิดขึ้นและสร้างขึ้นใหม่ให้แข็งแรงกว่าเดิม' },
  { file: 'the_star.png', card: 'XVII. The Star', meaning: 'ความหวัง การเยียวยา แรงบันดาลใจ', advice: 'มองโลกในแง่ดีและเชื่อมั่นว่าทุกอย่างจะดีขึ้น' },
  { file: 'the_moon.png', card: 'XVIII. The Moon', meaning: 'ความสับสน ความกลัว ภาพลวงตา', advice: 'อย่าด่วนตัดสินใจ ค่อยๆ มองให้เห็นความจริงที่ซ่อนอยู่' },
  { file: 'the_sun.png', card: 'XIX. The Sun', meaning: 'ความสำเร็จ ความสุข ความร่าเริง ความอบอุ่น', advice: 'เปิดรับพลังงานบวกและทำตัวให้สดใสสนุกสนาน' },
  { file: 'judgement.png', card: 'XX. Judgement', meaning: 'การตื่นรู้ การฟื้นคืนชีพ การตัดสิน', advice: 'ทบทวนอดีต เรียนรู้จากมัน และเริ่มต้นใหม่ให้ดีกว่าเดิม' },
  { file: 'the_world.png', card: 'XXI. The World', meaning: 'ความสมบูรณ์แบบ ความสำเร็จสูงสุด การเดินทาง', advice: 'ชื่นชมกับความสำเร็จและเตรียมพร้อมสำหรับการเดินทางครั้งใหม่' }
];

// เก็บประวัติการสนทนาของแต่ละผู้ใช้
const chatSessions = new Map();
const sessionLastUsed = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 นาที — หลังจากนี้ reset session ใหม่
const MAX_HISTORY_TURNS = 10;            // จำกัด history แค่ 10 รอบล่าสุด (20 entries)

// =========================================================
// ข้อมูลดวงราศี 12 ราศี (Pre-written ไม่ใช้ Gemini)
// =========================================================
const ZODIAC_DATA = {
  'ราศีเมษ':   { emoji: '♈', dates: '21 มี.ค. – 19 เม.ย.', fortune: 'พลังงานความกล้าของคุณสูงมากค่ะ เหมาะสำหรับเริ่มต้นสิ่งใหม่หรือตัดสินใจสำคัญ 💫\n💕 ความรัก: มีคนสนใจคุณมากกว่าที่คิด เปิดใจรับสักหน่อยนะคะ\n💼 การงาน: ผู้ใหญ่มองเห็นความสามารถของคุณแล้วค่ะ\n💰 การเงิน: ระวังการใช้จ่ายแบบหุนหันพลันแล่นด้วยนะคะ' },
  'ราศีพฤษภ': { emoji: '♉', dates: '20 เม.ย. – 20 พ.ค.', fortune: 'ความอดทนของคุณกำลังจะออกดอกผลค่ะ สิ่งที่ทำมานานจะเริ่มเห็นผล 🌸\n💕 ความรัก: ความสัมพันธ์ที่มั่นคงกำลังพัฒนาขึ้น ให้เวลากันอีกนิดนะคะ\n💼 การงาน: ใจเย็นๆ แผนที่วางไว้กำลังเดินหน้าได้ดีค่ะ\n💰 การเงิน: ช่วงนี้เก็บออมได้ผลดีมากค่ะ' },
  'ราศีเมถุน': { emoji: '♊', dates: '21 พ.ค. – 20 มิ.ย.', fortune: 'ความคิดสร้างสรรค์และการสื่อสารของคุณโดดเด่นมากช่วงนี้ค่ะ 💬\n💕 ความรัก: มีโอกาสพบเจอคนที่ใช่ได้จากวงสังคมใหม่ๆ ค่ะ\n💼 การงาน: โปรเจกต์ใหม่ที่เสนอจะได้รับการตอบรับดีค่ะ\n💰 การเงิน: รายได้เสริมจากทักษะพิเศษกำลังมาค่ะ' },
  'ราศีกรกฎ':  { emoji: '♋', dates: '21 มิ.ย. – 22 ก.ค.', fortune: 'อารมณ์และสัญชาตญาณของคุณแม่นยำมากช่วงนี้ค่ะ เชื่อใจตัวเองได้เลย 🌙\n💕 ความรัก: ความผูกพันกับคนใกล้ชิดจะลึกซึ้งขึ้นค่ะ\n💼 การงาน: งานที่ต้องดูแลคนอื่นหรืองานทีมเหมาะกับคุณมากค่ะ\n💰 การเงิน: ระวังใจอ่อนให้เงินคนอื่นมากเกินไปนะคะ' },
  'ราศีสิงห์':  { emoji: '♌', dates: '23 ก.ค. – 22 ส.ค.', fortune: 'พลังงานและเสน่ห์ของคุณโดดเด่นมากช่วงนี้ค่ะ ✨\n💕 ความรัก: ความรักที่ผ่านมาจะสดใสและมีชีวิตชีวาขึ้นมากค่ะ\n💼 การงาน: ถึงเวลาโชว์ฝีมือและผลักดันตัวเองสู่บทบาทผู้นำค่ะ\n💰 การเงิน: มีโอกาสการลงทุนที่น่าสนใจ ศึกษาให้ดีก่อนนะคะ' },
  'ราศีกันย์':  { emoji: '♍', dates: '23 ส.ค. – 22 ก.ย.', fortune: 'ความละเอียดรอบคอบของคุณจะช่วยให้งานออกมาสมบูรณ์แบบค่ะ 🌿\n💕 ความรัก: ความห่วงใยที่แสดงออกมาจะทำให้คนรักรู้สึกอบอุ่นค่ะ\n💼 การงาน: ผลงานที่ทำด้วยความตั้งใจกำลังได้รับการยอมรับค่ะ\n💰 การเงิน: วางแผนการเงินระยะยาวได้ผลดีมากช่วงนี้ค่ะ' },
  'ราศีตุลย์':  { emoji: '♎', dates: '23 ก.ย. – 22 ต.ค.', fortune: 'ความสมดุลและความยุติธรรมของคุณทำให้ทุกคนไว้วางใจค่ะ ⚖️\n💕 ความรัก: ความสัมพันธ์ที่มีความเท่าเทียมและเคารพกันจะราบรื่นมากค่ะ\n💼 การงาน: ทักษะการเจรจาของคุณจะช่วยแก้ปัญหาได้ดีค่ะ\n💰 การเงิน: หลีกเลี่ยงการตัดสินใจทางการเงินแบบหุนหันพลันแล่นนะคะ' },
  'ราศีพิจิก':  { emoji: '♏', dates: '23 ต.ค. – 21 พ.ย.', fortune: 'ความลึกซึ้งและความมุ่งมั่นของคุณจะพาคุณไปถึงเป้าหมายได้ค่ะ 🦂\n💕 ความรัก: ความรักที่ลึกซึ้งกำลังรอคุณอยู่ เปิดใจให้กว้างขึ้นค่ะ\n💼 การงาน: การวิจัยหรืองานเชิงวิเคราะห์จะประสบความสำเร็จสูงค่ะ\n💰 การเงิน: การลงทุนระยะยาวให้ผลตอบแทนดีค่ะ' },
  'ราศีธนู':   { emoji: '♐', dates: '22 พ.ย. – 21 ธ.ค.', fortune: 'อิสระและการผจญภัยกำลังเรียกหาคุณค่ะ เปิดรับโอกาสใหม่ๆ ได้เลย 🏹\n💕 ความรัก: ความสนุกสนานและการผจญภัยร่วมกันจะสร้างความผูกพันค่ะ\n💼 การงาน: งานที่ต้องเดินทางหรือติดต่อต่างประเทศมาแน่ค่ะ\n💰 การเงิน: โชคลาภเล็กๆ น้อยๆ กำลังจะมาค่ะ' },
  'ราศีมกร':   { emoji: '♑', dates: '22 ธ.ค. – 19 ม.ค.', fortune: 'ความขยันและวินัยของคุณกำลังสร้างรากฐานที่มั่นคงค่ะ 🏔️\n💕 ความรัก: ความจริงจังของคุณทำให้คนรักรู้สึกมั่นใจและไว้วางใจค่ะ\n💼 การงาน: ความก้าวหน้าในสายอาชีพกำลังจะเกิดขึ้นค่ะ\n💰 การเงิน: การออมและการวางแผนระยะยาวให้ผลดีมากค่ะ' },
  'ราศีกุมภ์':  { emoji: '♒', dates: '20 ม.ค. – 18 ก.พ.', fortune: 'ความคิดสร้างสรรค์และนวัตกรรมของคุณจะสร้างความแตกต่างได้ค่ะ 🌊\n💕 ความรัก: ความเป็นเพื่อนที่ดีจะพัฒนาเป็นความรักที่งดงามค่ะ\n💼 การงาน: ไอเดียใหม่ๆ ของคุณจะได้รับการยอมรับอย่างอบอุ่นค่ะ\n💰 การเงิน: รายได้จากโปรเจกต์สร้างสรรค์กำลังมาค่ะ' },
  'ราศีมีน':   { emoji: '♓', dates: '19 ก.พ. – 20 มี.ค.', fortune: 'สัญชาตญาณและความเห็นอกเห็นใจของคุณสูงมากช่วงนี้ค่ะ 🐟\n💕 ความรัก: ความรักลึกซึ้งกำลังพัฒนา ให้เวลาและความไว้ใจค่ะ\n💼 การงาน: งานสร้างสรรค์หรืองานช่วยเหลือผู้อื่นเหมาะกับคุณมากช่วงนี้ค่ะ\n💰 การเงิน: อย่าปล่อยกู้ยืมคนอื่นในช่วงนี้นะคะ รักษาผลประโยชน์ตัวเองด้วยค่ะ' },
};

// =========================================================
// ฟังก์ชัน Love Compatibility (ไม่ใช้ Gemini)
// =========================================================
function calculateCompatibility(name1, name2) {
  const sorted = [name1.trim().toLowerCase(), name2.trim().toLowerCase()].sort().join('');
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash) + sorted.charCodeAt(i);
    hash = hash & hash;
  }
  return 55 + (Math.abs(hash) % 45);
}

function getCompatibilityMessage(score) {
  if (score >= 90) return { label: '💖 คู่ชีวิต!', msg: 'ดวงดาวเลือกพวกคุณมาเพื่อกันและกันเลยค่ะ! หายากมากๆ' };
  if (score >= 80) return { label: '💕 เข้ากันมาก', msg: 'มีความเข้าใจกันสูง ถ้าเปิดใจคุยจะยิ่งดีขึ้นอีกค่ะ' };
  if (score >= 70) return { label: '🌸 เข้ากันได้ดี', msg: 'มีจุดร่วมกันมาก แค่สื่อสารให้ดีๆ จะแจ่มมากเลยค่ะ' };
  if (score >= 60) return { label: '✨ พอไหว', msg: 'ต้องปรับตัวกันนิดหน่อย แต่ถ้าพยายามด้วยกันได้แน่นอนค่ะ' };
  return { label: '🌙 ท้าทาย', msg: 'ตรงข้ามกันแต่บางทีก็ดึงดูดกันนะคะ ถ้ารักกันจริงทุกอย่างเป็นไปได้ค่ะ' };
}

// =========================================================
// ฟังก์ชัน: เรียกใช้งาน Google Gemini AI
// =========================================================
// =========================================================
// ฟังก์ชันคำนวณราศีจากวันเกิด (Western Zodiac) — ใช้แนบ context
// =========================================================
function getZodiacFromDOB(dobText) {
  const patterns = [
    /(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})/,
    /(\d{1,2})\s+(\S+)\s+(\d{4})/
  ];
  const THAI_MONTHS = { 'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12,'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12 };

  let day, month, year, matchedStr;
  const m1 = dobText.match(patterns[0]);
  if (m1) { day = +m1[1]; month = +m1[2]; year = +m1[3]; matchedStr = m1[0]; }
  else {
    const m2 = dobText.match(patterns[1]);
    if (m2) { day = +m2[1]; month = THAI_MONTHS[m2[2]] || 0; year = +m2[3]; matchedStr = m2[0]; }
  }
  if (!day || !month) return null;
  if (year > 2400) year -= 543;

  const ZODIACS = [
    { name:'ราศีมกร (Capricorn)',   from:[12,22], to:[1,19]  },
    { name:'ราศีกุมภ์ (Aquarius)',  from:[1,20],  to:[2,18]  },
    { name:'ราศีมีน (Pisces)',      from:[2,19],  to:[3,20]  },
    { name:'ราศีเมษ (Aries)',       from:[3,21],  to:[4,19]  },
    { name:'ราศีพฤษภ (Taurus)',     from:[4,20],  to:[5,20]  },
    { name:'ราศีเมถุน (Gemini)',    from:[5,21],  to:[6,20]  },
    { name:'ราศีกรกฎ (Cancer)',     from:[6,21],  to:[7,22]  },
    { name:'ราศีสิงห์ (Leo)',       from:[7,23],  to:[8,22]  },
    { name:'ราศีกันย์ (Virgo)',     from:[8,23],  to:[9,22]  },
    { name:'ราศีตุลย์ (Libra)',     from:[9,23],  to:[10,22] },
    { name:'ราศีพิจิก (Scorpio)',   from:[10,23], to:[11,21] },
    { name:'ราศีธนู (Sagittarius)', from:[11,22], to:[12,21] },
    { name:'ราศีมกร (Capricorn)',   from:[12,22], to:[12,31] },
  ];

  const md = month * 100 + day;
  for (const z of ZODIACS) {
    const from = z.from[0] * 100 + z.from[1];
    const to   = z.to[0]   * 100 + z.to[1];
    if (from <= to) { if (md >= from && md <= to) return { zodiac: z.name, dobStr: matchedStr }; }
    else            { if (md >= from || md <= to) return { zodiac: z.name, dobStr: matchedStr }; }
  }
  return null;
}

// ฟังก์ชันแสดงอนิเมชั่น "กำลังพิมพ์..." ของ LINE
async function showLoadingAnimation(userId, seconds = 10) {
  try {
    await axios.post('https://api.line.me/v2/bot/chat/loading/start', {
      chatId: userId,
      loadingSeconds: seconds
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.channelAccessToken}`
      }
    });
  } catch(err) {
    console.error('Error showing loading animation:', err?.response?.data || err.message);
  }
}

async function callGeminiAI(userId, userMessage, context = '', imagePath = '') {
  try {
    // แอบแสดงอนิเมชั่นรอระหว่างที่ AI กำลังคิด (สูงสุด 10 วินาที หรือจนกว่าบอทจะตอบกลับ)
    showLoadingAnimation(userId, 10);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return '⚠️ ระบบแจ้งเตือน: ท่านโหรยังขาดพลังงานเชื่อมต่อ (ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในไฟล์ .env ค่ะ)';
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `คุณคือ "ดีจัง" หมอดูไพ่ยิปซีและโหราศาสตร์ผู้หญิงที่เชี่ยวชาญ ลึกลับ แต่อ่อนหวาน ใจดี และให้คำปรึกษาที่สร้างสรรค์
สรรพนามแทนตัวผู้ใช้ ให้เรียกผู้ใช้ว่า "ท่าน" หรือ "คุณ" เสมอ ห้ามเรียกผู้ใช้ว่า "คนสวย" "หนุ่มหล่อ" "ที่รัก" หรือคำที่เจาะจงเพศเด็ดขาด เพื่อให้เกียรติและเหมาะสมกับผู้ใช้ทุกเพศ
จงรับฟังปัญหาและตอบคำถามของผู้ใช้ หากคำถามเป็นแนวปรึกษา ให้วิเคราะห์โดยอิงจากโหราศาสตร์ หรืออุปโลกน์สุ่มหน้าไพ่ทาโรต์ 1 ใบที่ตรงกับสถานการณ์เพื่อช่วยตอบคำถาม
หากผู้ใช้บอกว่าอยาก "ดูดวงวันเกิด" หรือถามเกี่ยวกับวันเกิด ให้สอบถาม วัน/เดือน/ปีเกิด ของเขาก่อนเสมอ อย่าเพิ่งทำนายจนกว่าจะได้รับข้อมูลวันเกิด
ให้ตอบด้วยสำเนียงผู้หญิงไทยที่อ่อนหวาน ใช้คำลงท้ายว่า "ค่ะ" หรือ "นะคะ" เสมอ ตอบสั้นๆ กระชับ ไม่เกิน 3-4 บรรทัด อ่านง่าย เป็นกันเอง
กฎสำคัญ: ห้ามคำนวณราศีเองจากความจำเด็ดขาด — หากมีข้อมูล [ราศีเกิด: ...] ใน context ให้ใช้ค่านั้นเท่านั้น`;

    if (imagePath && fs.existsSync(imagePath)) {
      const visionModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction,
      });
      const imagePart = {
        inlineData: {
          data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
          mimeType: "image/jpeg"
        }
      };
      const result = await visionModel.generateContent([
        `[ข้อมูลเพิ่มเติมสำหรับบริบทนี้: ${context}]\n\nคำถามจากผู้ใช้: ${userMessage}`,
        imagePart
      ]);
      const responseText = result.response.text();
      try { await saveChatLog(userId, userMessage || '[ส่งรูปภาพ]', responseText); } catch (_) {}
      return responseText;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      systemInstruction: systemInstruction,
    });

    // ── 1. Session Timeout: reset session ถ้าไม่ได้คุยนาน 30 นาที ──
    const now = Date.now();
    const lastUsed = sessionLastUsed.get(userId) || 0;
    if (now - lastUsed > SESSION_TIMEOUT) {
      chatSessions.delete(userId);
      console.log(`[Session] Reset session for ${userId} (timeout)`);
    }
    sessionLastUsed.set(userId, now);

    // ── 2. สร้าง session ใหม่ถ้ายังไม่มี ──
    if (!chatSessions.has(userId)) {
      chatSessions.set(userId, model.startChat({ history: [] }));
    }

    // ── 3. Trim history: ตัดให้เหลือแค่ MAX_HISTORY_TURNS รอบล่าสุด ──
    let chat = chatSessions.get(userId);
    const history = chat._history || [];
    if (history.length > MAX_HISTORY_TURNS * 2) {
      // สร้าง session ใหม่พร้อม history ที่ตัดแล้ว
      const trimmed = history.slice(-(MAX_HISTORY_TURNS * 2));
      const newChat = model.startChat({ history: trimmed });
      chatSessions.set(userId, newChat);
      chat = newChat;
      console.log(`[Session] Trimmed history for ${userId}: ${history.length} → ${trimmed.length} entries`);
    }
    let prompt = userMessage;
    const cached = await getUserDOB(userId);
    let dobInfo = '';
    
    if (context) {
      let zodiacLine = '';
      if (cached && cached.zodiac) {
        zodiacLine = `\n[ราศีเกิด (cache): ${cached.zodiac}]`;
      } else {
        const zodiacInfo = getZodiacFromDOB(context);
        zodiacLine = zodiacInfo ? `\n[ราศีเกิด (คำนวณแล้ว): ${zodiacInfo.zodiac}]` : '';
      }
      prompt = `[ข้อมูลเพิ่มเติมสำหรับบริบทนี้: ${context}${zodiacLine}]\n\nคำถามจากผู้ใช้: ${userMessage}`;
    } else {
      // Natural chat
      if (cached && cached.dob) {
        prompt = `[ข้อมูลผู้ใช้: เกิดวันที่ ${cached.dob}, ราศี ${cached.zodiac}]\n\nคำถามจากผู้ใช้: ${userMessage}`;
      }
    }
    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();
    // บันทึก chat log ลง DB
    try { await saveChatLog(userId, userMessage, responseText); } catch (_) {}
    return responseText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to connect to AI API');
  }
}


// =========================================================


// =========================================================
// VIP Portal HTML endpoint
// =========================================================
app.get('/vip/:userId', async (req, res) => {
  const userId = req.params.userId;
  if (!(await hasActiveSubscription(userId))) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied - VIP Only</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          body { background-color: #0d0020; color: #fff; font-family: 'Sarabun', sans-serif; text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
          .icon { font-size: 4rem; margin-bottom: 20px; filter: drop-shadow(0 0 15px rgba(255,215,0,0.6)); }
          h1 { color: #ffd700; font-size: 1.8rem; margin-bottom: 15px; }
          p { color: #c8b9e8; line-height: 1.6; font-size: 1.1rem; }
        </style>
      </head>
      <body>
        <div class="icon">👑</div>
        <h1>เฉพาะสมาชิก VIP เท่านั้น</h1>
        <p>บริการนี้สงวนสิทธิ์เฉพาะสมาชิก Premium ค่ะ<br>กรุณาสมัครสมาชิกผ่านแชท LINE เพื่อเข้าใช้งานนะคะ ✨</p>
      </body>
      </html>
    `);
  }
  res.sendFile(__dirname + '/public/vip.html');
});

// =========================================================
// Astrology API endpoint (VIP Only)
// =========================================================
app.post('/api/astrology/calculate', express.json(), async (req, res) => {
  try {
    const { userId, dob } = req.body;
    if (!userId || !dob) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    // Check VIP
    if (!(await hasActiveSubscription(userId))) {
      return res.status(403).json({ error: 'บริการนี้เฉพาะสมาชิก Premium (VIP) เท่านั้นค่ะ กรุณาสมัครสมาชิกผ่าน LINE ก่อนนะคะ' });
    }

    // Calculate
    const astroData = convertDateToThaiNumerology(dob);
    
    // Call Gemini
    const contextStr = `ผู้ใช้เกิดวันที่: ${dob}\nค่าที่ได้จากการคำนวณฐานวัน= ${astroData.dayOfWeek}, ฐานเดือน= ${astroData.thaiMonth}, ฐานปี= ${astroData.zodiacYear}\nตารางผลรวมฐาน 4 (กำลังพระเคราะห์) = ${astroData.table[3].join(', ')}`;
    
    const userPrompt = `นี่คือข้อมูลดวงและวันเกิดของฉัน โปรดพิจารณาหา "ราศีเกิด" ของฉัน และช่วยทำนายดวงชะตาแบบละเอียดให้หน่อย (เน้นภาพรวม นิสัย ความรัก การเงิน) พร้อมระบุ "ราศีเกิด", "สีนำโชค", และ "เลขนำโชค" ประจำตัวให้ด้วย อธิบายให้เข้าใจง่าย เป็นมิตร และไม่ต้องอธิบายวิธีคำนวณ`;
    
    const aiReading = await callGeminiAI(userId, userPrompt, contextStr);

    res.json({
      table: astroData.table,
      houses: astroData.houses,
      reading: aiReading
    });

  } catch (err) {
    console.error('Astrology API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// Plants API endpoint (VIP Only)
// =========================================================
app.post('/api/vip/plants', express.json(), async (req, res) => {
  try {
    const { userId, dob } = req.body;
    if (!userId || !dob) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (!(await hasActiveSubscription(userId))) {
      return res.status(403).json({ error: 'บริการนี้เฉพาะสมาชิก Premium (VIP) เท่านั้นค่ะ' });
    }

    const context = `ผู้ใช้เกิดวันที่: ${dob}`;
    const userPrompt = `ช่วยแนะนำ "ต้นไม้มงคล" 1 ชนิดที่เหมาะกับคนเกิดวันนี้ เพื่อช่วยเสริมโชคลาภ ความรัก และหน้าที่การงาน ขอชื่อต้นไม้ ความหมายสั้นๆ และวิธีดูแลแบบกระชับ ตอบให้อ่านง่ายเป็นกันเอง`;
    
    const aiReading = await callGeminiAI(userId, userPrompt, context);
    await saveReading(userId, 'ต้นไม้มงคล');
    res.json({ reading: aiReading });
  } catch (err) {
    console.error('Plants API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// Constellation API endpoint (VIP Only)
// =========================================================
app.post('/api/vip/constellation', express.json(), async (req, res) => {
  try {
    const { userId, dob } = req.body;
    if (!userId || !dob) return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    if (!(await hasActiveSubscription(userId))) return res.status(403).json({ error: 'บริการนี้เฉพาะสมาชิก Premium (VIP) เท่านั้นค่ะ' });

    const [year, month, day] = dob.split('-').map(Number);

    // คำนวณราศีเกิดแบบ Western Zodiac
    function getZodiacIndex(m, d) {
      if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 0;
      if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 1;
      if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 2;
      if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 3;
      if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 4;
      if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 5;
      if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 6;
      if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 7;
      if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 8;
      if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 9;
      if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 10;
      return 11;
    }

    const ZODIAC_DB = [
      { nameTH: 'ราศีเมษ', nameEN: 'Aries', symbol: '♈', element: 'ไฟ', dates: '21 มี.ค. – 19 เม.ย.', keywords: ['กล้าหาญ', 'ผู้นำ', 'พลังสูง', 'ตรงไปตรงมา', 'ริเริ่ม'] },
      { nameTH: 'ราศีพฤษภ', nameEN: 'Taurus', symbol: '♉', element: 'ดิน', dates: '20 เม.ย. – 20 พ.ค.', keywords: ['มั่นคง', 'อดทน', 'รักสวยงาม', 'ซื่อสัตย์', 'หรูหรา'] },
      { nameTH: 'ราศีเมถุน', nameEN: 'Gemini', symbol: '♊', element: 'ลม', dates: '21 พ.ค. – 20 มิ.ย.', keywords: ['สื่อสารเก่ง', 'ฉลาด', 'ปรับตัวดี', 'มีเสน่ห์', 'อยากรู้อยากเห็น'] },
      { nameTH: 'ราศีกรกฎ', nameEN: 'Cancer', symbol: '♋', element: 'น้ำ', dates: '21 มิ.ย. – 22 ก.ค.', keywords: ['อ่อนโยน', 'ใส่ใจ', 'สัญชาตญาณสูง', 'รักครอบครัว', 'เอาใจใส่'] },
      { nameTH: 'ราศีสิงห์', nameEN: 'Leo', symbol: '♌', element: 'ไฟ', dates: '23 ก.ค. – 22 ส.ค.', keywords: ['โดดเด่น', 'ใจกว้าง', 'มั่นใจ', 'ผู้นำเกิด', 'เปล่งประกาย'] },
      { nameTH: 'ราศีกันย์', nameEN: 'Virgo', symbol: '♍', element: 'ดิน', dates: '23 ส.ค. – 22 ก.ย.', keywords: ['ละเอียดรอบคอบ', 'วิเคราะห์เก่ง', 'เป็นระเบียบ', 'ช่วยเหลือผู้อื่น', 'สมบูรณ์แบบ'] },
      { nameTH: 'ราศีตุลย์', nameEN: 'Libra', symbol: '♎', element: 'ลม', dates: '23 ก.ย. – 22 ต.ค.', keywords: ['ยุติธรรม', 'สุนทรียภาพ', 'ชอบสมดุล', 'เป็นมิตร', 'มีเสน่ห์'] },
      { nameTH: 'ราศีพิจิก', nameEN: 'Scorpius', symbol: '♏', element: 'น้ำ', dates: '23 ต.ค. – 21 พ.ย.', keywords: ['ลึกซึ้ง', 'มุ่งมั่น', 'ลึกลับ', 'ซื่อสัตย์', 'หัวใจแกร่ง'] },
      { nameTH: 'ราศีธนู', nameEN: 'Sagittarius', symbol: '♐', element: 'ไฟ', dates: '22 พ.ย. – 21 ธ.ค.', keywords: ['ผจญภัย', 'มองโลกกว้าง', 'อิสระ', 'มองโลกบวก', 'ปรัชญา'] },
      { nameTH: 'ราศีมกร', nameEN: 'Capricorn', symbol: '♑', element: 'ดิน', dates: '22 ธ.ค. – 19 ม.ค.', keywords: ['วินัย', 'ทะเยอทะยาน', 'จริงจัง', 'รับผิดชอบ', 'ประสบความสำเร็จ'] },
      { nameTH: 'ราศีกุมภ์', nameEN: 'Aquarius', symbol: '♒', element: 'ลม', dates: '20 ม.ค. – 18 ก.พ.', keywords: ['นวัตกรรม', 'อิสระ', 'มนุษยธรรม', 'ความคิดสร้างสรรค์', 'ก้าวล้ำ'] },
      { nameTH: 'ราศีมีน', nameEN: 'Pisces', symbol: '♓', element: 'น้ำ', dates: '19 ก.พ. – 20 มี.ค.', keywords: ['เห็นอกเห็นใจ', 'จินตนาการสูง', 'อ่อนโยน', 'ศิลปิน', 'สัญชาตญาณ'] },
    ];

    const zodiacIndex = getZodiacIndex(month, day);
    const z = ZODIAC_DB[zodiacIndex];
    const kwStr = z.keywords.join(', ');

    const systemPrompt =
      `คุณคือ "แม่หมอดีจัง" แม่หมอใจดี อบอุ่น ` +
      `ทักทายลูกค้าและบอกว่า "หมู่ดาวประจำตัวของคุณคือหมู่ดาว ${z.nameTH} (${z.nameEN} ${z.symbol})" ` +
      `จากนั้นเล่าตำนานของหมู่ดาว ${z.nameEN} อย่างสั้นๆ ให้น่าฟัง แล้วอธิบายว่าพลังของหมู่ดาวนี้สะท้อนบุคลิกและชะตาชีวิตของผู้เกิดอย่างไร ` +
      `โดยนำคีย์เวิร์ดเหล่านี้มาร้อยเรียง: ${kwStr} ` +
      `ความยาวประมาณ 2-3 ย่อหน้า ภาษาพูดเป็นธรรมชาติ ` +
      `ห้ามใช้สัญลักษณ์ Markdown ใดๆ ทั้งสิ้น เพราะจะนำไปอ่านออกเสียง (Text-to-Speech)`;

    const reading = await callGeminiAI(userId, 'ทำนายหมู่ดาวประจำตัว', systemPrompt);

    await saveReading(userId, 'หมู่ดาวประจำตัว');
    res.json({ zodiacIndex, nameTH: z.nameTH, nameEN: z.nameEN, symbol: z.symbol, element: z.element, dates: z.dates, keywords: z.keywords, reading });

  } catch (err) {
    console.error('Constellation API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// Personal Star API endpoint (VIP Only)
// =========================================================
app.post('/api/vip/personal-star', express.json(), async (req, res) => {
  try {
    const { userId, dob } = req.body;

    if (!userId || !dob) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน กรุณาส่ง userId และ dob (YYYY-MM-DD)' });
    }

    if (!(await hasActiveSubscription(userId))) {
      return res.status(403).json({ error: 'บริการนี้เฉพาะสมาชิก Premium (VIP) เท่านั้นค่ะ' });
    }

    // --- ฐานข้อมูลดวงดาวประจำวัน ---
    const STAR_DICTIONARY = {
      0: { starName: 'ดาวอาทิตย์ (Sun)',    keywords: ['พลังงานผู้นำ', 'โดดเด่น', 'มั่นใจ', 'เปล่งประกาย'] },
      1: { starName: 'ดาวจันทร์ (Moon)',     keywords: ['อ่อนโยน', 'มีเสน่ห์', 'ใส่ใจความรู้สึก', 'จินตนาการสูง'] },
      2: { starName: 'ดาวอังคาร (Mars)',     keywords: ['นักสู้', 'กล้าหาญ', 'พลังงานเยอะ', 'ตรงไปตรงมา'] },
      3: { starName: 'ดาวพุธ (Mercury)',     keywords: ['นักสื่อสาร', 'ไหวพริบดี', 'เรียนรู้เร็ว', 'ปรับตัวเก่ง'] },
      4: { starName: 'ดาวพฤหัสบดี (Jupiter)', keywords: ['ผู้มีปัญญา', 'มีเหตุผล', 'รักความยุติธรรม', 'เป็นที่ปรึกษาที่ดี'] },
      5: { starName: 'ดาวศุกร์ (Venus)',     keywords: ['สุนทรียภาพ', 'รักสวยรักงาม', 'มีศิลปะในหัวใจ', 'ดึงดูดทรัพย์และความรัก'] },
      6: { starName: 'ดาวเสาร์ (Saturn)',    keywords: ['อดทน', 'หนักแน่น', 'จริงจัง', 'ทำงานใหญ่สำเร็จ'] },
    };

    // --- คำนวณวันในสัปดาห์จาก dob ---
    // ใช้ noon UTC เพื่อป้องกัน timezone shift ที่อาจเปลี่ยนวัน
    const [year, month, day] = dob.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = dateObj.getUTCDay(); // 0=อาทิตย์ ... 6=เสาร์

    const starData = STAR_DICTIONARY[dayOfWeek];
    if (!starData) {
      return res.status(400).json({ error: 'ไม่สามารถคำนวณดาวประจำตัวได้ กรุณาตรวจสอบรูปแบบวันเกิด (YYYY-MM-DD)' });
    }

    const { starName, keywords } = starData;
    const keywordStr = keywords.join(', ');

    // --- สร้าง System Prompt สำหรับ Gemini ในบทบาทแม่หมอดีจัง ---
    const systemPrompt =
      `คุณคือ "แม่หมอดีจัง" แม่หมอใจดี อบอุ่น ที่พูดภาษาพูดเป็นธรรมชาติ ลื่นไหล ` +
      `ทักทายลูกค้าอย่างอบอุ่น แล้วบอกว่า "ดวงดาวประจำตัวของคุณคือ ${starName}" ` +
      `จากนั้นนำคีย์เวิร์ดเหล่านี้ของดาวดวงนี้มาร้อยเรียงเป็นคำทำนายตัวตนเชิงบวก ` +
      `คีย์เวิร์ด: ${keywordStr} ` +
      `พร้อมแนะนำวิธีใช้พลังของ${starName}ให้เป็นประโยชน์กับชีวิต ` +
      `ตอบความยาวประมาณ 2 ย่อหน้า ใช้ภาษาพูดเป็นธรรมชาติ ` +
      `ห้ามใช้สัญลักษณ์ Markdown เช่น *, **, #, -, หรือเครื่องหมายพิเศษใดๆ ทั้งสิ้น ` +
      `เพราะข้อความนี้จะถูกนำไปอ่านออกเสียง (Text-to-Speech) ต้องลื่นไหล ฟังแล้วเป็นธรรมชาติ`;

    // --- เรียก Gemini ---
    const reading = await callGeminiAI(userId, 'ทำนายดวงดาวประจำตัว', systemPrompt);

    await saveReading(userId, 'ดาวประจำตัว');
    return res.json({
      dayOfWeek,
      starName,
      keywords,
      reading,
    });

  } catch (err) {
    console.error('Personal Star API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================



// =========================================================
// Stripe Checkout redirect
// =========================================================
app.get('/stripe/checkout', async (req, res) => {
  const { userId, type, amount } = req.query;
  if (!userId || !type) return res.status(400).send('Missing parameters');
  try {
    const amountOverride = amount ? parseInt(amount, 10) : null;
    const { url } = await createCheckoutSession(userId, type, BASE_URL, amountOverride);
    res.redirect(url);
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:40px">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ</h2>');
  }
});

app.get('/stripe/success', (req, res) => {
  res.send('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ชำระเงินสำเร็จ</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0a0a14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}.card{background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:40px 32px;max-width:380px}.icon{font-size:4rem;margin-bottom:16px}.title{font-size:1.4rem;font-weight:700;color:#10b981;margin-bottom:10px}.sub{font-size:.9rem;color:#9ca3af;line-height:1.7}.note{margin-top:20px;font-size:.82rem;color:#6b7280;background:rgba(255,255,255,.04);border-radius:10px;padding:12px}</style></head><body><div class="card"><div class="icon">&#x2705;</div><div class="title">ชำระเงินสำเร็จแล้วค่ะ!</div><div class="sub">ระบบกำลังดำเนินการ<br>กรุณากลับไปที่ LINE<br>และรอรับการแจ้งเตือนค่ะ &#x1F64F;</div><div class="note">&#x1F4AC; ดีจังจะ push แจ้ง credit/VIP<br>เข้า LINE ของคุณโดยอัตโนมัติ</div></div></body></html>');
});

app.get('/stripe/cancel', (req, res) => {
  res.send('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ยกเลิกการชำระเงิน</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0a0a14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}.card{background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:40px 32px;max-width:380px}.icon{font-size:4rem;margin-bottom:16px}.title{font-size:1.4rem;font-weight:700;color:#f59e0b;margin-bottom:10px}.sub{font-size:.9rem;color:#9ca3af;line-height:1.7}</style></head><body><div class="card"><div class="icon">&#x21A9;&#xFE0F;</div><div class="title">ยกเลิกการชำระเงินแล้วค่ะ</div><div class="sub">กรุณากลับไปที่ LINE<br>แล้วลองใหม่อีกครั้งได้เลยนะคะ &#x1F64F;</div></div></body></html>');
});

// =========================================================
// Stripe Webhook — ต้องใช้ raw body (ก่อน LINE webhook)
// =========================================================
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, type } = session.metadata || {};
    const amountPaid = Math.round((session.amount_total || 0) / 100);
    if (!userId || !type) return res.json({ received: true });

    try {
      if (type === 'credit') {
        // ให้เครดิตตามยอดที่ชำระจริง
        await addCredit(userId, amountPaid);
        await addStripeRecord(userId, type, 'stripe-auto-' + session.id);
        
        await client.pushMessage({
          to: userId,
          messages: [{
            type: 'flex',
            altText: '✅ ชำระเงินสำเร็จ!',
            contents: await buildPaymentSuccessFlex('credit', amountPaid, amountPaid, null)
          }],
        });
      } else if (type === 'subscription') {
        await activateSubscription(userId, 1);
        await addStripeRecord(userId, type, 'stripe-auto-' + session.id);
        
        await client.pushMessage({
          to: userId,
          messages: [{
            type: 'flex',
            altText: '✅ ชำระเงินสำเร็จ!',
            contents: await buildPaymentSuccessFlex('subscription', amountPaid, 0, true)
          }],
        });
      }
      console.log('Stripe payment OK: userId=' + userId + ' type=' + type + ' amount=' + amountPaid + 'THB');
    } catch (err) {
      console.error('Error processing Stripe payment:', err);
    }
  }

  res.json({ received: true });
});

// =========================================================
// Webhook endpoint
// =========================================================
app.post('/webhook', line.middleware(config), async (req, res) => {

  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).end();
  }
});

// =========================================================
// ฟังก์ชัน handleEvent หลัก
// =========================================================

const userLiveChatState = new Map();
app.set('userLiveChatState', userLiveChatState);

// Map เก็บว่า user กำลังจะส่งสลิปประเภทไหน ('subscription' | 'credit')
const userPendingSlipAction = new Map();
// Map เก็บว่า user กำลังจะส่งลิงก์ Ang Pao ชนิดไหน ('subscription' | 'credit')
const userPendingAngPaoAction = new Map();
const userPendingDOB   = new Map();
const userPendingTopic = new Map();
const userPendingBooking = new Map();
const userPendingTopUpAmount = new Map();
const userPendingFaceReading = new Map();
const userPendingPalmReading = new Map();
const userPending3Cards = new Map();
// Rate Limiting
const userMessageCounts = new Map();
setInterval(() => {
  userMessageCounts.clear();
}, 60000); // เคลียร์ทุก 1 นาที

// ตรวจสอบว่าข้อความเป็นลิงก์ TrueMoney Ang Pao
function isAngPaoLink(text) {
  return /https?:\/\/(www\.)?gift\.truemoney\.com\/campaign[\/?]/i.test(text);
}


// =========================================================
// Helpers สำหรับดูดวงละเอียด และตามหัวข้อ
// =========================================================
async function executeTopicReading(userId, dob, topic, replyToken) {
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
  const topicContext = `ผู้ใช้เกิดวันที่: ${dob}
วันนี้คือ ${today} ไพ่ที่สุ่มได้คือ "${picked.card}" (ความหมาย: ${picked.meaning}, คำแนะนำ: ${picked.advice})
จงวิเคราะห์ดวงเรื่อง"${topic}" ให้ลูกค้าโดยเฉพาะ โดยอิงจากวันเกิด ราศีเกิด และพลังไพ่
อธิบายละเอียด อบอุ่น เป็นกันเอง ให้กำลังใจ ความยาว 5-8 ประโยค`;

  try {
    const aiResponse = await callGeminiAI(userId, `ดูดวงเรื่อง${topic}`, topicContext);
    await saveReading(userId, `ดูดวง-${topic}`);
    const recordId = await saveAITrainingData(userId, `ดูดวง-${topic}`, dob, picked.card, `ดูดวงเรื่อง${topic}`, aiResponse);
    return client.replyMessage({
      replyToken,
      messages: [
        { type: 'image', originalContentUrl: `${BASE_URL}/public/images/${picked.file}`, previewImageUrl: `${BASE_URL}/public/images/${picked.file}` },
        { type: 'text', text: aiResponse },
        { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: await buildRatingFlexMessage(recordId) },
        {
          type: 'text',
          text: '✨ อยากดูดวงแบบละเอียดครอบคลุมทุกด้านเพิ่มเติมได้เลยนะคะ 🔮',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '🔮 ดูดวงละเอียด', text: 'ดูดวงละเอียด' } },
              { type: 'action', action: { type: 'message', label: '🌅 ดูดวงรายวัน', text: 'ดูดวงรายวัน' } },
            ],
          },
        },
      ],
    });
  } catch (err) {
    console.error('Gemini AI Error (Topic):', err);
    return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งนะคะ 🙏' }] });
  }
}

async function executeDetailedReading(userId, dob, paymentType, replyToken) {
  if (paymentType === 'subscription') {
    if (!(await hasActiveSubscription(userId))) {
      return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'สิทธิ์ของท่านหมดอายุแล้วค่ะ' }] });
    }
    const { canRead } = await canUseSubscriptionDaily(userId);
    if (!canRead) {
      return client.replyMessage({ replyToken, messages: [{ type: 'text', text: '👑 สิทธิ์ดูดวงวันนี้หมดแล้วค่ะ (2/2 ครั้ง)' }] });
    }

    const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    const context = `ผู้ใช้เกิดวันที่: ${dob}\nผู้ใช้เป็นสมาชิก Premium ดูดวงแบบละเอียด ไพ่ที่สุ่มได้คือ "${picked.card}" (ความหมาย: ${picked.meaning}, คำแนะนำ: ${picked.advice}) จงวิเคราะห์ดวงอย่างละเอียดลึกซึ้ง ครอบคลุมทุกด้าน ความรัก การงาน การเงิน สุขภาพ และช่วงเวลาที่ควรระวัง พร้อมคำนวณหาราศีเกิด สีนำโชค และเลขนำโชคให้ด้วย ตอบประมาณ 8-10 บรรทัด`;
    
    try {
      const aiResponse = await callGeminiAI(userId, "ตรวจดวงชะตาแบบละเอียด", context);
      await recordSubscriptionRead(userId);
      await saveReading(userId, 'ดูดวงละเอียด');
      const recordId = await saveAITrainingData(userId, 'ดูดวงละเอียด', dob, picked.card, "ตรวจดวงชะตาแบบละเอียด", aiResponse);
      const { remaining } = await canUseSubscriptionDaily(userId);
      
      return client.replyMessage({
        replyToken,
        messages: [
          { type: 'image', originalContentUrl: `${BASE_URL}/public/images/${picked.file}`, previewImageUrl: `${BASE_URL}/public/images/${picked.file}` },
          { type: 'text', text: `${aiResponse}\n\n━━━━━━━━━━━━━━\n👑 สมาชิก Premium | เหลือสิทธิ์วันนี้: ${remaining} ครั้ง` },
          { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: await buildRatingFlexMessage(recordId) }
        ],
      });
    } catch (aiError) {
      console.error('Gemini AI Error (VIP):', aiError);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: 'ขออภัยค่ะ 🙏 พลังงานจักรวาลขัดข้องชั่วคราว (ระบบ AI ตอบสนองช้า) ดีจังยังไม่ได้ตัดโควตา VIP ของคุณนะคะ รบกวนพิมพ์มาใหม่อีกครั้งค่ะ ✨' }]
      });
    }
  } else if (paymentType === 'credit') {
    const credit = await getCredit(userId);
    if (credit < DETAILED_PRICE) {
      return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'เครดิตของท่านไม่เพียงพอค่ะ กรุณาเติมเครดิต' }] });
    }
    
    const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    const context = `ผู้ใช้เกิดวันที่: ${dob}\nผู้ใช้เป็นสมาชิก Premium ดูดวงแบบละเอียด ไพ่ที่สุ่มได้คือ "${picked.card}" (ความหมาย: ${picked.meaning}, คำแนะนำ: ${picked.advice}) จงวิเคราะห์ดวงอย่างละเอียดลึกซึ้ง ครอบคลุมทุกด้าน ความรัก การงาน การเงิน สุขภาพ และช่วงเวลาที่ควรระวัง พร้อมคำนวณหาราศีเกิด (ให้ใช้เกณฑ์แบบสากล Western Astrology เท่านั้น เช่น 20 เม.ย.-20 พ.ค. คือราศีพฤษภ) สีนำโชค และเลขนำโชคให้ด้วย ตอบประมาณ 8-10 บรรทัด`;
    
    try {
      const aiResponse = await callGeminiAI(userId, "ตรวจดวงชะตาแบบละเอียด", context);
      await useCredit(userId, DETAILED_PRICE);
      await saveReading(userId, 'ดูดวงละเอียด');
      const recordId = await saveAITrainingData(userId, 'ดูดวงละเอียด', dob, picked.card, "ตรวจดวงชะตาแบบละเอียด", aiResponse);
      const remainingCredit = await getCredit(userId);
      
      return client.replyMessage({
        replyToken,
        messages: [
          { type: 'image', originalContentUrl: `${BASE_URL}/public/images/${picked.file}`, previewImageUrl: `${BASE_URL}/public/images/${picked.file}` },
          { type: 'text', text: `${aiResponse}\n\n━━━━━━━━━━━━━━\n💎 เครดิตคงเหลือ: ${remainingCredit} บาท` },
          { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: await buildRatingFlexMessage(recordId) }
        ],
      });
    } catch (aiError) {
      console.error('Gemini AI Error (Credit):', aiError);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: 'ขออภัยค่ะ 🙏 พลังงานจักรวาลขัดข้องชั่วคราว (ระบบ AI ตอบสนองช้า) ดีจังยังไม่ได้หักเครดิตของคุณนะคะ รบกวนพิมพ์มาใหม่อีกครั้งค่ะ ✨' }]
      });
    }
  }
}

async function handleEvent(event) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  await ensureUserExists(userId);

  // Rate Limiting Check (Spam Prevention)
  if (event.type === 'message' || event.type === 'postback') {
    const currentCount = userMessageCounts.get(userId) || 0;
    if (currentCount >= 15) {
      if (currentCount === 15) {
        userMessageCounts.set(userId, currentCount + 1); // set to 16 to avoid sending warning again
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '⚠️ ระบบป้องกันสแปมทำงาน กรุณารอ 1 นาทีก่อนพิมพ์ส่งใหม่นะคะ' }]
        }).catch(err => console.error('Rate limit reply error:', err.message));
      }
      return; // Ignore if > 15
    }
    userMessageCounts.set(userId, currentCount + 1);
  }

  // อัปเดตข้อมูล Profile ลง DB (ทำแบบ async ไม่ต้องรอให้บอทค้าง)
  client.getProfile(userId).then(async profile => {
    await updateLineProfile(userId, profile.displayName, profile.pictureUrl);
  }).catch(err => console.error('Error fetching LINE profile:', err.message));

  // ---- จัดการ event รูปภาพ ----
  if (event.type === 'message' && event.message.type === 'image') {
    const pendingAction = userPendingSlipAction.get(userId);
    
    // 1. ถ้าผู้ใช้กำลังอยู่ในสถานะรอส่งสลิป
    if (pendingAction) {
      userPendingSlipAction.delete(userId);
      const slipType = pendingAction;
      
      client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '✅ ได้รับสลิปของคุณแล้วค่ะ!\n\nดีจังกำลังส่งสลิปให้แอดมินตรวจสอบ กรุณารอสักครู่นะคะ 🙏' }],
      });

      try {
        const stream = await blobClient.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        const imageBuffer = Buffer.concat(chunks);

        const slipsDir = path.join(__dirname, 'public', 'slips');
        if (!fs.existsSync(slipsDir)) fs.mkdirSync(slipsDir, { recursive: true });
        const filename = `${slipType}_${userId}_${Date.now()}.jpg`;
        const filepath = path.join(slipsDir, filename);
        fs.writeFileSync(filepath, imageBuffer);

        await addPendingSlip(userId, slipType, filename);
        console.log(`✅ Slip saved: ${filename} (type: ${slipType}, user: ${userId})`);
      } catch (e) {
        console.error('Error handling slip image:', e);
      }
      return;
    } 
    
    // 2. ถ้าผู้ใช้กำลังรอสแกนโหงวเฮ้ง
    if (userPendingFaceReading.get(userId)) {
      try {
        const stream = await blobClient.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        const imageBuffer = Buffer.concat(chunks);

        const chatImgDir = path.join(__dirname, 'public', 'chat_images');
        if (!fs.existsSync(chatImgDir)) fs.mkdirSync(chatImgDir, { recursive: true });

        const now = Date.now();
        const rawFilename = `raw_${userId}_${now}.jpg`;
        const rawPath = path.join(chatImgDir, rawFilename);
        fs.writeFileSync(rawPath, imageBuffer);

        const markedFilename = `marked_${userId}_${now}.jpg`;
        const markedPath = path.join(chatImgDir, markedFilename);
        const markedUrl = `/public/chat_images/${markedFilename}`;

        // ทำการสแกนและตีเส้นโหงวเฮ้ง
        const faceDetected = await drawPhysiognomy(rawPath, markedPath);

        if (!faceDetected) {
          // ถ้าไม่เจอใบหน้า ไม่หักเครดิต ให้ลองใหม่
          return client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: 'ดีจังตรวจจับใบหน้าในรูปไม่เจอเลยค่ะ 🥺\n\nรบกวนส่งรูปถ่าย "ใบหน้าตรง" ที่สว่าง เห็นหน้าชัดเจน และไม่มีอะไรบดบังอีกครั้งนะคะ 🙏 (ระบบยังไม่ได้หักเครดิตของคุณค่ะ)' }]
          });
        }

        // ดึงคำวิเคราะห์จาก Gemini
        const aiResponse = await callGeminiAI(
          userId,
          "วิเคราะห์โหงวเฮ้งใบหน้าจากรูปภาพ",
          "กรุณาวิเคราะห์โหงวเฮ้งของคนในรูปภาพนี้อย่างละเอียดตามศาสตร์โหงวเฮ้งจีน โดยวิเคราะห์ 3 ส่วนสำคัญของใบหน้า (หน้าผาก/คิ้ว, จมูก/แก้ม, ปาก/คาง) พร้อมข้อแนะนำดีๆ ในการดำเนินชีวิต ตอบประมาณ 5-7 บรรทัด ด้วยน้ำเสียงของหมอดูหญิงดีจังที่สุภาพและเป็นกันเอง ลงท้ายด้วยค่ะ/นะคะ",
          rawPath
        );

        // อัปเดตประวัติแชทให้ถูกต้องโชว์ทั้งรูปดิบและรูปผลวิเคราะห์พร้อมวิเคราะห์ข้อความ
        try {
          await updateLastFaceReadingLog(
            userId,
            `[IMAGE: /public/chat_images/${rawFilename}]`,
            `[IMAGE: ${markedUrl}]`,
            aiResponse
          );
        } catch (logErr) {
          console.error('Error updating face reading chat log:', logErr);
        }

        // หักเครดิต
        await useCredit(userId, FACE_PALM_PRICE);
        await saveReading(userId, 'ดูโหงวเฮ้ง');
        const remainingCredit = await getCredit(userId);

        // ยกเลิกสถานะรอรูป
        userPendingFaceReading.delete(userId);

        // ส่งรูปที่ตีเส้นตาราง พร้อมคำวิเคราะห์
        return client.replyMessage({
          replyToken,
          messages: [
            { type: 'image', originalContentUrl: `${BASE_URL}${markedUrl}`, previewImageUrl: `${BASE_URL}${markedUrl}` },
            { type: 'text', text: `${aiResponse}\n\n━━━━━━━━━━━━━━\n💎 วิเคราะห์โหงวเฮ้งสำเร็จ (หัก ${FACE_PALM_PRICE} เครดิต)\n💳 เครดิตคงเหลือ: ${remainingCredit} บาท` }
          ]
        });

      } catch (e) {
        console.error('Error in face reading processing:', e);
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: 'ขออภัยด้วยนะคะ พลังงานตรวจจับใบหน้าขัดข้องชั่วคราว รบกวนพิมพ์ส่งรูปมาใหม่อีกครั้งค่ะ 🙏' }]
        });
      }
    }

    // 2.5. รูปสำหรับดูลายมือ
    if (userPendingPalmReading.get(userId)) {
      try {
        const stream = await blobClient.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        const imageBuffer = Buffer.concat(chunks);

        const chatImgDir = path.join(__dirname, 'public', 'chat_images');
        if (!fs.existsSync(chatImgDir)) fs.mkdirSync(chatImgDir, { recursive: true });

        const now = Date.now();
        const rawFilename = `palm_raw_${userId}_${now}.jpg`;
        const rawPath = path.join(chatImgDir, rawFilename);
        fs.writeFileSync(rawPath, imageBuffer);

        const markedFilename = `palm_marked_${userId}_${now}.jpg`;
        const markedPath = path.join(chatImgDir, markedFilename);
        const markedUrl = `/public/chat_images/${markedFilename}`;

        // ตรวจว่ามีมือในรูปหรือไม่
        const hasHand = await verifyHandInImage(rawPath);
        if (!hasHand) {
          return client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: 'ดีจังตรวจไม่พบฝ่ามือในรูปเลยค่ะ 🥺\n\nรบกวนส่งรูปถ่าย "ฝ่ามือ" ที่กางนิ้วออก เห็นเส้นลายมือชัดเจน แสงสว่าง ไม่มีถุงมือ แล้วลองใหม่อีกครั้งนะคะ 🙏 (ระบบยังไม่ได้หักเครดิตของคุณค่ะ)' }]
          });
        }

        // วาดเส้นลายมือ
        await drawPalmReading(rawPath, markedPath);

        // ขอคำทำนายจาก Gemini
        const aiResponse = await callGeminiAI(
          userId,
          'วิเคราะห์ลายมือ',
          'กรุณาวิเคราะห์ลายมือของคนในรูปภาพนี้อย่างละเอียดตามศาสตร์การดูลายมือ โดยวิเคราะห์ เส้นชีวิต เส้นหัวใจ และเส้นสมอง พร้อมบอกนิสัย ความรัก การงาน สุขภาพ และโชคชะตาที่อ่านได้จากลายมือ ตอบประมาณ 5-7 บรรทัด ด้วยน้ำเสียงของหมอดูหญิงดีจังที่สุภาพและเป็นกันเอง ลงท้ายด้วยค่ะ/นะคะ',
          rawPath
        );

        // บันทึก log
        try {
          await updateLastPalmReadingLog(
            userId,
            `[IMAGE: /public/chat_images/${rawFilename}]`,
            `[IMAGE: ${markedUrl}]`,
            aiResponse
          );
        } catch (logErr) { console.error('Palm log error:', logErr); }

        // หักเครดิต
        await useCredit(userId, FACE_PALM_PRICE);
        await saveReading(userId, 'ดูลายมือ');
        const remainingCredit = await getCredit(userId);

        userPendingPalmReading.delete(userId);

        return client.replyMessage({
          replyToken,
          messages: [
            { type: 'image', originalContentUrl: `${BASE_URL}${markedUrl}`, previewImageUrl: `${BASE_URL}${markedUrl}` },
            { type: 'text', text: `${aiResponse}\n\n━━━━━━━━━━━━━━\n✋ วิเคราะห์ลายมือสำเร็จ (หัก ${FACE_PALM_PRICE} เครดิต)\n💳 เครดิตคงเหลือ: ${remainingCredit} บาท` }
          ]
        });

      } catch (e) {
        console.error('Error in palm reading processing:', e);
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: 'ขออภัยด้วยนะคะ พลังงานวิเคราะห์ลายมือขัดข้องชั่วคราว รบกวนพิมพ์ "ดูลายมือ" แล้วส่งรูปมาใหม่อีกครั้งค่ะ 🙏' }]
        });
      }
    }
    
    // 3. รูปปกติ -> เก็บลงแชทสำหรับหมอดู

    try {
      const stream = await blobClient.getMessageContent(event.message.id);
      const chunks = [];
      for await (const chunk of stream) { chunks.push(chunk); }
      const imageBuffer = Buffer.concat(chunks);

      const chatImgDir = path.join(__dirname, 'public', 'chat_images');
      if (!fs.existsSync(chatImgDir)) fs.mkdirSync(chatImgDir, { recursive: true });
      const filename = `img_${userId}_${Date.now()}.jpg`;
      const filepath = path.join(chatImgDir, filename);
      fs.writeFileSync(filepath, imageBuffer);
      const imageUrl = `/public/chat_images/${filename}`;

      if (liveChatUsers.has(userId)) {
        // อยู่ในโหมด Live Chat ให้บันทึกลง log เฉยๆ (หน้าเว็บจะ pull ไปโชว์เอง)
        await saveChatLog(userId, `[IMAGE: ${imageUrl}]`, '');
      } else {
        // ไม่ได้อยู่ใน Live Chat -> บอทตอบกลับ
        const replyText = 'ตอนนี้ดีจังยังดูรูปไม่ได้นะคะ หากต้องการให้หมอดูช่วยดูโหงวเฮ้งหรือลายมือ สามารถกดติดต่อแอดมินหรือจองคิว หรือพิมพ์คำว่า "ดูโหงวเฮ้ง" เพื่อใช้บอทช่วยสแกนหน้าได้เลยค่ะ 🔮';
        await saveChatLog(userId, `[IMAGE: ${imageUrl}]`, replyText);
        client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: replyText }]
        });
      }
    } catch (e) {
      console.error('Error handling chat image:', e);
    }
    return;
  }

  // ---- จัดการ event postback (ให้คะแนน) ----
  if (event.type === 'postback') {
    const data = event.postback.data;
    if (data.startsWith('action=rate')) {
      const params = new URLSearchParams(data);
      const recordId = params.get('id');
      const score = params.get('score');
      if (recordId && score) {
        await updateAIRating(recordId, parseInt(score, 10));
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: `💖 ขอบคุณสำหรับคะแนน ${score} ดาวนะคะ ดีจังจะนำไปพัฒนาให้แม่นยำขึ้นค่ะ!` }]
        });
      }
    }
    return Promise.resolve(null);
  }

  // ---- รับเฉพาะ text message ----
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();

  // ============================================
  // เช็คว่าอยู่ในโหมด Live Chat ของ Admin หรือไม่
  // ============================================
  const textLower = userMessage.toLowerCase();
  if (textLower.includes('ติดต่อแอดมิน') || textLower.includes('คุยกับคน') || textLower.includes('แอดมิน')) {
    if (!userLiveChatState.has(userId)) {
      userLiveChatState.set(userId, { 
        active: true, 
        startTime: Date.now(), 
        unread: 1, 
        messages: [{ sender: 'user', text: userMessage, time: Date.now() }] 
      });
      return client.replyMessage({ 
        replyToken, 
        messages: [{ type: 'text', text: 'รอสักครู่นะคะ แอดมินกำลังมารับสายค่ะ... 👩🏻‍💻' }] 
      });
    }
  }

  if (userLiveChatState.has(userId)) {
    const state = userLiveChatState.get(userId);
    state.unread++;
    state.messages.push({ sender: 'user', text: userMessage, time: Date.now() });
    try { await saveChatLog(userId, userMessage, ''); } catch(_) {}
    return; // หยุดการทำงานของบอททันที ปล่อยให้แอดมินตอบเอง
  }

  // ============================================
  // เช็คว่าอยู่ในโหมด Live Chat ของ Reader หรือไม่
  // ============================================
  if (liveChatUsers.has(userId)) {
    try { await saveChatLog(userId, userMessage, ''); } catch(_) {}
    return; // หยุดการทำงานของบอททันที ปล่อยให้หมอดูตอบเอง
  }

  try {
    const isFaceReadingRequest = userMessage.includes('โหงวเฮ้ง') || 
                                 userMessage.includes('โหวเฮ้ง') || 
                                 userMessage.includes('โหวงเฮ้ง') || 
                                 userMessage.includes('โหง่วเฮ้ง') || 
                                 userMessage.includes('โหนวเฮ้ง');
    const isPalmReadingRequest = userMessage.includes('ลายมือ') || userMessage.includes('ฝ่ามือ');

    const SYSTEM_COMMANDS = ['ดูดวงรายวัน', 'ดูดวงละเอียด', 'สมัครสมาชิก', 'VIP Menu', 'โหราศาสตร์', 'ต้นไม้มงคล', 'ราศี', 'เข้ากัน', 'ชวนเพื่อน', 'เช็คข้อมูล', 'ติดต่อแอดมิน', 'เปิดไพ่', 'เปิดไพ่ 1 ใบ', 'เปิดไพ่ 3 ใบ', 'จองคิว', 'เช็คคิว', 'จองคิว-ออนไลน์', 'จองคิว-เจอตัว', 'ชำระ-angpao-credit', 'ชำระ-angpao-subscription', 'เติมเงิน', 'เติมเครดิต', 'ดูลายมือ', 'ลายมือ', 'ดูฝ่ามือ'];
    const FORTUNE_MENU_TRIGGERS = ['เมนูดูดวง', 'ดูดวง', 'หมอดู', 'ทาโรต์', 'ไพ่ยิปซี', 'ปรึกษาดีจัง'];
    const OTHER_MENU_TRIGGERS = ['อื่นๆ', 'เมนูอื่นๆ', 'เพิ่มเติม'];
    
    if (SYSTEM_COMMANDS.includes(userMessage) || FORTUNE_MENU_TRIGGERS.includes(userMessage) || OTHER_MENU_TRIGGERS.includes(userMessage) || 
        userMessage.startsWith('เลือกใบที่ ') || userMessage.startsWith('เข้ากัน ') || userMessage.startsWith('ใช้โค้ด ') || userMessage === 'credit' ||
        isFaceReadingRequest || isPalmReadingRequest) {
      userPendingDOB.delete(userId);
      userPendingTopic.delete(userId);
      userPendingBooking.delete(userId);
      userPendingAngPaoAction.delete(userId);
      userPendingTopUpAmount.delete(userId);
      userPendingFaceReading.delete(userId);
      userPendingPalmReading.delete(userId);
      if (!userMessage.startsWith('เลือกใบที่ ')) {
        userPending3Cards.delete(userId);
      }
    }
    // ============================================
    // 1. Rich Menu หลายปุ่ม → Quick Reply เลือกประเภทการดูดวง
    // ============================================
    if (FORTUNE_MENU_TRIGGERS.includes(userMessage)) {
      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '🔮 ดีจังพร้อมให้บริการแล้วค่ะ!\n\nจะให้ดีจังช่วยดูดวงรูปแบบไหนดีคะ?',
            quickReply: {
              items: [
                { type: 'action', action: { type: 'message', label: '🌅 ดูดวงรายวัน ฟรี', text: 'ดูดวงรายวัน' } },
                { type: 'action', action: { type: 'message', label: '🎭 สแกนโหงวเฮ้ง 50฿', text: 'ดูโหงวเฮ้ง' } },
                { type: 'action', action: { type: 'message', label: '✋ ดูลายมือ 50฿', text: 'ดูลายมือ' } },
                { type: 'action', action: { type: 'message', label: '🔮 ดูดวงละเอียด 20฿', text: 'ดูดวงละเอียด' } },
                { type: 'action', action: { type: 'message', label: '👑 สมัคร VIP 199฿/ด', text: 'สมัครสมาชิก' } },
                { type: 'action', action: { type: 'message', label: '♈ ดูดวงราศี ฟรี', text: 'ราศี' } },
                { type: 'action', action: { type: 'message', label: '💑 เช็คดวงคู่รัก', text: 'เข้ากัน' } },
                { type: 'action', action: { type: 'message', label: '🎁 ชวนเพื่อนรับฟรี', text: 'ชวนเพื่อน' } },
              ],
            },
          },
        ],
      });
    }

    // ============================================
    // 1.5 เมนูอื่นๆ → Quick Reply เลือกบริการเสริม
    // ============================================
    if (OTHER_MENU_TRIGGERS.includes(userMessage)) {
      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '✨ บริการอื่นๆ ของดีจังค่ะ\n\nเลือกเมนูด้านล่างได้เลยนะคะ 👇',
            quickReply: {
              items: [
                { type: 'action', action: { type: 'message', label: '💎 ข้อมูลของฉัน', text: 'เช็คข้อมูล' } },
                { type: 'action', action: { type: 'message', label: '📞 ติดต่อแอดมิน', text: 'ติดต่อแอดมิน' } }
              ],
            },
          },
        ],
      });
    }

    // ============================================
    // 1.9 ตัวเลือก Ang Pao → ขอลิงก์ TrueMoney
    // ============================================
    if (userMessage === 'ชำระ-angpao-credit' || userMessage === 'ชำระ-angpao-subscription') {
      const slipType = userMessage.includes('subscription') ? 'subscription' : 'credit';
      const price    = slipType === 'subscription' ? SUBSCRIPTION_PRICE : DETAILED_PRICE;
      const label    = slipType === 'subscription' ? `สมัครสมาชิก VIP — ${price} บาท` : `ดูดวงละเอียด — ${price} บาท`;

      userPendingAngPaoAction.set(userId, slipType);
      userPendingSlipAction.delete(userId); // clear promptpay state

      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: `🧧 ชำระด้วยซอง TrueMoney — ${label}\n\n📌 วิธีส่งซองอั่งเปา:\n1. เปิดแอป TrueMoney Wallet\n2. กด "ส่งซอง" หรือ "Ang Pao"\n3. สร้างซองมูลค่า ${price} บาท\n4. คัดลอกลิงก์ซอง (https://gift.truemoney.com/...)\n5. วางลิงก์ในแชทนี้ได้เลยค่ะ 🙏\n\n⏳ ดีจังรอรับลิงก์ซองอยู่นะคะ`,
          },
        ],
      });
    }

    // ============================================
    // 1.95 ตรวจจับลิงก์ TrueMoney Ang Pao ที่ user ส่งมา
    // ============================================
    if (isAngPaoLink(userMessage)) {
      const pendingType = userPendingAngPaoAction.get(userId);

      if (!pendingType) {
        // ไม่ได้กด Ang Pao ก่อน → แจ้งว่ารับไว้แต่ต้องรอ flow ปกติ
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '🧧 ได้รับลิงก์ซองอั่งเปาของคุณแล้วค่ะ!\n\n📩 แต่กรุณาเลือกประเภทก่อนนะคะ:\nพิมพ์ "ดูดวงละเอียด" เพื่อเติมเครดิต หรือ "สมัครสมาชิก" เพื่อซื้อ VIP แล้วเลือกซอง TrueMoney ค่ะ 🙏' }],
        });
      }

      userPendingAngPaoAction.delete(userId);
      userPendingSlipAction.delete(userId);

      // บันทึกลิงก์ลง DB (payment_method = 'angpao')
      await addPendingAngPao(userId, pendingType, userMessage);
      console.log(`🧧 Ang Pao link saved: type=${pendingType}, user=${userId}, link=${userMessage}`);

      const typeLabel = pendingType === 'subscription' ? 'VIP Subscription' : 'เครดิต';
      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: `🧧 ได้รับลิงก์ซอง TrueMoney สำหรับ${typeLabel}แล้วค่ะ!\n\n✅ ดีจังได้ส่งลิงก์ให้แอดมินตรวจสอบแล้วค่ะ\n\n⏳ กรุณารอสักครู่ แอดมินจะเปิดรับซองและยืนยันให้ท่านโดยเร็วที่สุดนะคะ 🙏`,
          },
        ],
      });
    }

    // ============================================
    // 1.98 ดูโหงวเฮ้ง
    // ============================================
    if (isFaceReadingRequest) {
      const isPremium = await hasActiveSubscription(userId);
      const credit = await getCredit(userId);
      if (!isPremium && credit < FACE_PALM_PRICE) {
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `เครดิตของคุณไม่เพียงพอสำหรับการวิเคราะห์โหงวเฮ้งค่ะ (ใช้ ${FACE_PALM_PRICE} เครดิต) กรุณาเติมเครดิตก่อนนะคะ 🙏` }]
        });
      }
      // เคลียร์สถานะการส่งสลิปหรืออั่งเปาออก เพื่อไม่ให้บอทสับสนรูปใบหน้าเป็นรูปสลิป
      userPendingSlipAction.delete(userId);
      userPendingAngPaoAction.delete(userId);
      userPendingDOB.delete(userId);
      
      userPendingFaceReading.set(userId, true);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '🔮 ดีจังพร้อมวิเคราะห์โหงวเฮ้งให้แล้วค่ะ!\n\nกรุณาส่งรูปถ่าย "ใบหน้าตรง" ที่เห็นใบหน้าของคุณชัดเจน ไม่มีอะไรบดบัง (ไม่มีแว่นดำหรือหมวก) เพื่อให้ดีจังเริ่มต้นสแกนใบหน้าและทำนายนะคะ ✨' }]
      });
    }

    // ============================================
    // 1.99 ดูลายมือ
    // ============================================
    if (isPalmReadingRequest) {
      const isPremium = await hasActiveSubscription(userId);
      const credit = await getCredit(userId);
      if (!isPremium && credit < FACE_PALM_PRICE) {
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `เครดิตของคุณไม่เพียงพอสำหรับการวิเคราะห์ลายมือค่ะ (ใช้ ${FACE_PALM_PRICE} เครดิต) กรุณาเติมเครดิตก่อนนะคะ 🙏` }]
        });
      }
      // เคลียร์สถานะการส่งสลิปหรืออั่งเปาออก เพื่อไม่ให้บอทสับสนรูปใบหน้าเป็นรูปสลิป
      userPendingSlipAction.delete(userId);
      userPendingAngPaoAction.delete(userId);
      userPendingDOB.delete(userId);
      
      userPendingPalmReading.set(userId, true);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '✋ ดีจังพร้อมวิเคราะห์ลายมือให้แล้วค่ะ!\n\nกรุณาส่งรูปถ่าย "ฝ่ามือข้างที่ถนัด" แบบกางนิ้วออก ที่เห็นเส้นลายมือชัดเจน มีแสงสว่างเพียงพอ เพื่อให้ดีจังเริ่มต้นสแกนเส้นลายมือและทำนายนะคะ ✨' }]
      });
    }

    // ============================================
    // 2. ดูดวงรายวัน (ฟรี)
    // ============================================
    if (userMessage === 'ดูดวงรายวัน') {
      if (await hasDailyReadingToday(userId)) {
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: 'วันนี้คุณดูดวงรายวันไปแล้วนะคะ พรุ่งนี้แวะมาเช็กดวงรายวันกันใหม่น้า 💕' }]
        });
      }
      const today = new Date().toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
      const context = `ผู้ใช้ต้องการดูดวงรายวันวันนี้ (${today}) ให้ท่านโหรสุ่มได้ไพ่ "${picked.card}" (ความหมาย: ${picked.meaning}, คำแนะนำ: ${picked.advice}) ทายดวงชะตาสั้นๆ ครอบคลุม ความรัก การงาน การเงิน สุขภาพ ให้เข้ากับพลังงานของวันนี้แบบเป็นกันเอง`;
      const aiResponse = await callGeminiAI(userId, userMessage, context);
      await saveReading(userId, 'ดูดวงรายวัน');
      const recordId = await saveAITrainingData(userId, 'ดูดวงรายวัน', await getUserDOB(userId)?.dob || null, picked.card, userMessage, aiResponse);
      return client.replyMessage({
        replyToken,
        messages: [
          { type: 'image', originalContentUrl: `${BASE_URL}/public/images/${picked.file}`, previewImageUrl: `${BASE_URL}/public/images/${picked.file}` },
          { type: 'text', text: aiResponse },
          { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: await buildRatingFlexMessage(recordId) }
        ],
      });
    }

    // ============================================
    // 3. ดูดวงละเอียด (ตรวจ Subscription ก่อน)
    // ============================================
    if (userMessage === 'ดูดวงละเอียด') {
      let isUsingSubscription = false;

      // เช็ค Subscription ก่อน
      if (await hasActiveSubscription(userId)) {
        const { canRead } = await canUseSubscriptionDaily(userId);
        if (canRead) {
          isUsingSubscription = true;
        }
      }

      // กรณีใช้สิทธิ์ VIP ได้
      if (isUsingSubscription) {
        const cachedDOB = await getUserDOB(userId);
        if (cachedDOB && cachedDOB.dob) {
          return executeDetailedReading(userId, cachedDOB.dob, 'subscription', replyToken);
        }
        userPendingDOB.set(userId, 'subscription');
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '👑 ใช้สิทธิ์ VIP ดูดวงละเอียด\n🔮 รบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณให้ดีจังหน่อยนะคะ\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530 ค่ะ)' }],
        });
      }

      // กรณีไม่มี VIP หรือ สิทธิ์ VIP รายวันหมดแล้ว -> มาเช็ค Credit
      const credit = await getCredit(userId);

      if (credit >= DETAILED_PRICE) {
        const cachedDOB = await getUserDOB(userId);
        if (cachedDOB && cachedDOB.dob) {
          return executeDetailedReading(userId, cachedDOB.dob, 'credit', replyToken);
        }
        userPendingDOB.set(userId, 'credit');
        
        // เพิ่มข้อความแจ้งเตือนนิดหน่อยให้ลูกค้ารู้ว่าสิทธิ์ VIP หมดและกำลังจะใช้ Credit แทน
        let alertMsg = await hasActiveSubscription(userId) 
          ? '👑 สิทธิ์ VIP ประจำวันหมดแล้ว ดีจังจะขอใช้เครดิตแทนนะคะ\n\n' 
          : '';

        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `${alertMsg}🔮 รบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณให้ดีจังหน่อยนะคะ\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530 ค่ะ)` }],
        });
      } else {
        // ไม่มี Credit → ชำระเงิน
        let alertMsgQR = await hasActiveSubscription(userId) 
          ? '👑 สิทธิ์ VIP ประจำวันหมดแล้ว และเครดิตไม่เพียงพอค่ะ\n\n' 
          : '';

        userPendingAngPaoAction.set(userId, 'credit');

        if (await isStripeEnabled()) {
          const stripeUrl = `${BASE_URL}/stripe/checkout?userId=${encodeURIComponent(userId)}&type=credit`;
          const messages = [];
          if (alertMsgQR) messages.push({ type: 'text', text: alertMsgQR.trim() });
          messages.push({
            type: 'flex',
            altText: 'กรุณาเลือกช่องทางการชำระเงิน',
            contents: await buildPaymentMenuFlex('credit', DETAILED_PRICE, stripeUrl)
          });
          return client.replyMessage({ replyToken, messages });
        } else {
          // Stripe ปิดอยู่ → ใช้ PromptPay + Ang Pao
          const qrFilename = await generatePromptPayQR(PROMPTPAY_ID, DETAILED_PRICE, userId);
          const qrUrl = `${BASE_URL}/public/images/${qrFilename}`;
          const messages = [];
          if (alertMsgQR) messages.push({ type: 'text', text: alertMsgQR.trim() });
          messages.push({ type: 'text', text: `💳 โอนเงิน ${DETAILED_PRICE} บาทผ่าน PromptPay\n\nดู QR Code ด้านล่าง แล้วส่งสลิปมาให้ดีจังจะเติมเครดิตให้ค่ะ 🙏` });
          messages.push({ type: 'image', originalContentUrl: qrUrl, previewImageUrl: qrUrl });
          messages.push({ type: 'text', text: 'หรือจะชำระด้วย 🧧 TrueMoney Ang Pao ก็ได้ค่ะ พิมพ์ชำระ-angpao-credit ได้เลยค่ะ', quickReply: { items: [{ type: 'action', action: { type: 'message', label: '🧧 ชำระด้วย Ang Pao', text: 'ชำระ-angpao-credit' } }] } });
          return client.replyMessage({ replyToken, messages });
        }
      }
    }

    // ============================================
    // 3.5 สมัครสมาชิกรายเดือน
    // ============================================
    if (userMessage === 'สมัครสมาชิก') {
      if (await hasActiveSubscription(userId)) {
        const subInfo = await getSubscriptionInfo(userId);
        const expDate = new Date(subInfo.expiresAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `👑 คุณเป็นสมาชิก Premium อยู่แล้วค่ะ!\n\n🗓️ หมดอายุ: ${expDate}\n\nดูดวงละเอียดได้วันละ 2 ครั้งได้เลยค่ะ 🔮` }],
        });
      }
      userPendingAngPaoAction.set(userId, 'subscription');

      if (await isStripeEnabled()) {
        const stripeUrlSub = `${BASE_URL}/stripe/checkout?userId=${encodeURIComponent(userId)}&type=subscription`;
        return client.replyMessage({
          replyToken,
          messages: [{
            type: 'flex',
            altText: 'กรุณาเลือกช่องทางการชำระเงิน',
            contents: await buildPaymentMenuFlex('subscription', SUBSCRIPTION_PRICE, stripeUrlSub)
          }],
        });
      } else {
        // Stripe ปิดอยู่ → PromptPay + Ang Pao
        const qrFilename = await generatePromptPayQR(PROMPTPAY_ID, SUBSCRIPTION_PRICE, userId);
        const qrUrl = `${BASE_URL}/public/images/${qrFilename}`;
        return client.replyMessage({
          replyToken,
          messages: [
            { type: 'text', text: `👑 สมัคร VIP ${SUBSCRIPTION_PRICE} บาท/เดือน\n\nโอนเงินผ่าน QR Code ด้านล่าง แล้วส่งสลิปมาให้ดีจังค่ะ 🙏` },
            { type: 'image', originalContentUrl: qrUrl, previewImageUrl: qrUrl },
            { type: 'text', text: 'หรือจะชำระด้วย 🧧 TrueMoney Ang Pao ก็ได้ค่ะ', quickReply: { items: [{ type: 'action', action: { type: 'message', label: '🧧 Ang Pao VIP', text: 'ชำระ-angpao-subscription' } }] } },
          ]
        });
      }
    }

    // ============================================
    // 3.8 VIP Web Portal
    // ============================================
    if (userMessage === 'VIP Menu' || userMessage === 'โหราศาสตร์' || userMessage === 'ต้นไม้มงคล') {
      if (!(await hasActiveSubscription(userId))) {
        return client.replyMessage({
          replyToken,
          messages: [{ 
            type: 'text', 
            text: `👑 บริการนี้สงวนสิทธิ์เฉพาะสมาชิก Premium เท่านั้นค่ะ\n\nพิมพ์ "สมัครสมาชิก" เพื่อดูดวงแบบละเอียดได้ไม่อั้น และปลดล็อกฟีเจอร์ VIP ทั้งหมดนะคะ ✨` 
          }]
        });
      }

      const vipUrl = `${BASE_URL}/vip/${userId}`;
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: `👑 DD Jang VIP Menu\n\nเข้าสู่ระบบรวมบริการพิเศษ (โหราศาสตร์, ต้นไม้มงคล ฯลฯ) ได้ที่ลิงก์ด้านล่างเลยค่ะ 👇\n🔗 ${vipUrl}`
        }]
      });
    }

    // ============================================
    // 4. เช็ค Credit ของตัวเอง
    // ============================================
    if (userMessage === 'credit' || userMessage === 'เช็คข้อมูล') {
      const credit = await getCredit(userId);
      const subInfo = await getSubscriptionInfo(userId);
      const { remaining } = await canUseSubscriptionDaily(userId);
      const dobInfo = await getUserDOB(userId);
      const stats = await getReadingStats(userId);

      // ดึงข้อมูล LINE Profile (ชื่อ + รูป)
      let displayName = null;
      let pictureUrl = null;
      try {
        const profile = await client.getProfile(userId);
        displayName = profile.displayName || null;
        pictureUrl  = profile.pictureUrl  || null;
      } catch (_) { /* ไม่สำคัญถ้าดึงไม่ได้ */ }

      const vipExpiry = subInfo.active && subInfo.expiresAt
        ? new Date(subInfo.expiresAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

      const flexBubble = await buildProfileFlexMessage({
        displayName,
        pictureUrl,
        credit,
        isVIP: !!subInfo.active,
        vipExpiry,
        vipRemaining: remaining,
        dob: dobInfo?.dob || null,
        zodiac: dobInfo?.zodiac || null,
        totalReadings: stats?.total || 0,
      });

      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'flex',
          altText: `💎 ข้อมูลของคุณ — เครดิต ${credit} บาท${subInfo.active ? ' | 👑 VIP' : ''}`,
          contents: flexBubble,
        }],
      });
    }


    // ============================================
    // 4.5 เติมเงิน / เติมเครดิต
    // ============================================
    const topUpMatch = userMessage.match(/^เติม(เงิน|เครดิต)(?:\s+(\d+))?(?:\s*บาท)?$/);
    if (topUpMatch || userPendingTopUpAmount.has(userId)) {
      let amountStr = topUpMatch ? topUpMatch[2] : userMessage.replace(/[^\d]/g, '');
      let amount = parseInt(amountStr, 10);

      if (!amountStr || isNaN(amount) || amount <= 0) {
        userPendingTopUpAmount.set(userId, true);
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '💎 ต้องการเติมเงินเท่าไหร่คะ?\n\n(พิมพ์เฉพาะตัวเลข เช่น 100, 50, 20)' }]
        });
      }

      userPendingTopUpAmount.delete(userId);
      userPendingAngPaoAction.set(userId, 'credit');

      if (await isStripeEnabled()) {
        const stripeUrl = `${BASE_URL}/stripe/checkout?userId=${encodeURIComponent(userId)}&type=credit&amount=${amount}`;
        return client.replyMessage({
          replyToken,
          messages: [{
            type: 'flex',
            altText: `ชำระเงินจำนวน ${amount} บาท`,
            contents: await buildPaymentMenuFlex('credit', amount, stripeUrl)
          }],
        });
      } else {
        // Stripe ปิด → PromptPay + Ang Pao
        const qrFilename = await generatePromptPayQR(PROMPTPAY_ID, amount, userId);
        const qrUrl = `${BASE_URL}/public/images/${qrFilename}`;
        return client.replyMessage({
          replyToken,
          messages: [
            { type: 'text', text: `💳 เติมเครดิต ${amount} บาท\n\nโอนเงินผ่าน QR Code ด้านล่าง แล้วส่งสลิปมาให้ดีจังค่ะ 🙏` },
            { type: 'image', originalContentUrl: qrUrl, previewImageUrl: qrUrl },
            { type: 'text', text: 'หรือจะชำระด้วย 🧧 TrueMoney Ang Pao ก็ได้ค่ะ', quickReply: { items: [{ type: 'action', action: { type: 'message', label: '🧧 ชำระ Ang Pao', text: 'ชำระ-angpao-credit' } }] } },
          ]
        });
      }
    }
    // ============================================
    // 5.5 จองคิวหมอดู
    // ============================================
    if (userMessage === 'จองคิว') {
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: '📅 ดีจังยินดีรับจองคิวค่ะ!\n\nอยากจองแบบไหนดีคะ?',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '📱 ออนไลน์ (แชท LINE)', text: 'จองคิว-ออนไลน์' } },
              { type: 'action', action: { type: 'message', label: '🏠 เจอตัว', text: 'จองคิว-เจอตัว' } },
            ],
          },
        }],
      });
    }

    if (userMessage === 'จองคิว-ออนไลน์' || userMessage === 'จองคิว-เจอตัว' ||
        userMessage === 'จองคิวออนไลน์' || userMessage === 'จองคิวเจอตัว' ||
        userMessage.startsWith('จองคิว ออนไลน์') || userMessage.startsWith('จองคิว เจอตัว')) {
      const isOnline = userMessage.includes('ออนไลน์');
      const bookType = isOnline ? 'online' : 'in_person';
      const bookTypeLabel = isOnline ? '📱 ออนไลน์' : '🏠 เจอตัว';
      userPendingBooking.set(userId, { step: 'date', type: bookType });
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: `${bookTypeLabel} — เข้าใจแล้วค่ะ!\n\n📅 รบกวนพิมพ์วันที่และเวลาที่ต้องการนะคะ\nเช่น: "เสาร์ที่ 10 พ.ค. ช่วงบ่าย 2" หรือ "วันไหนก็ได้สัปดาห์หน้า ช่วงเช้า"\n\n(พิมพ์อิสระได้เลยค่ะ หมอดูจะยืนยันเวลาที่แน่ชัดอีกครั้งนะคะ 🙏)` }],
      });
    }

    // ============================================
    // 5.6 รอรับวันเวลาจากการจองคิว
    // ============================================
    if (userPendingBooking.has(userId)) {
      const booking = userPendingBooking.get(userId);
      userPendingBooking.delete(userId);
      const bookTypeLabel = booking.type === 'online' ? '📱 ออนไลน์ (แชท LINE)' : '🏠 เจอตัว';

      const bookingId = await createBooking(userId, userMessage, booking.type);
      const newBooking = { id: bookingId, booking_type: booking.type, preferred_date: userMessage, status: 'pending' };
      const flexBubble = await buildBookingFlexMessage(newBooking, 'ได้รับคำขอจองคิวแล้ว');

      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'flex',
            altText: 'ได้รับคำขอจองคิวของคุณแล้วค่ะ',
            contents: flexBubble
          }
        ],
      });
    }

    // ============================================
    // 5.7 เช็คสถานะคิว
    // ============================================
    if (userMessage === 'เช็คคิว') {
      const bookings = await getUserBookings(userId, 3);
      if (!bookings.length) {
        return client.replyMessage({
          replyToken,
          messages: [{ 
            type: 'text', 
            text: '📋 ยังไม่มีการจองคิวค่ะ\n\nพิมพ์ "จองคิว" เพื่อนัดหมายหมอดูได้เลยนะคะ 🔮',
            quickReply: { items: [{ type: 'action', action: { type: 'message', label: '📅 จองคิว', text: 'จองคิว' } }] },
          }],
        });
      }
      const bubbles = await Promise.all(bookings.map(b => buildBookingFlexMessage(b, 'สถานะคิวของคุณ')));
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'flex',
          altText: 'รายการจองคิวล่าสุดของคุณ',
          contents: {
            type: 'carousel',
            contents: bubbles
          }
        }],
      });
    }

    // ============================================
    // 6. เปิดไพ่ → Quick Reply เลือก 1 หรือ 3 ใบ
    // ============================================
    if (userMessage === 'เปิดไพ่') {
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: '🔮 จะให้ดีจังเปิดไพ่กี่ใบดีคะ?',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '🃏 เปิดไพ่ 1 ใบ', text: 'เปิดไพ่ 1 ใบ' } },
              { type: 'action', action: { type: 'message', label: '✨ เปิดไพ่ 3 ใบ', text: 'เปิดไพ่ 3 ใบ' } },
            ],
          },
        }],
      });
    }

    // ============================================
    // 6a. เปิดไพ่ 1 ใบ (แสดงหลังไพ่ 3 ใบให้เลือก)
    // ============================================
    if (userMessage === 'เปิดไพ่ 1 ใบ') {
      const bubbles = [1, 2, 3].map(num => ({
        type: 'bubble',
        size: 'kilo',
        hero: {
          type: 'image',
          url: `${BASE_URL}/public/images/tarot_back.png`,
          size: 'full',
          aspectRatio: '3:4',
          aspectMode: 'cover',
          action: {
            type: 'message',
            label: `เลือกใบที่ ${num}`,
            text: `เลือกใบที่ ${num}`
          }
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          paddingAll: '12px',
          backgroundColor: '#1A0A3E',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#4A2B8C',
              action: {
                type: 'message',
                label: `👆 เลือกใบที่ ${num}`,
                text: `เลือกใบที่ ${num}`
              }
            }
          ]
        }
      }));

      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'flex',
            altText: 'กรุณาเลือกไพ่ 1 ใบค่ะ',
            contents: { type: 'carousel', contents: bubbles }
          },
          { type: 'text', text: '🔮 ตั้งสมาธิสักครู่ แล้วกดเลือกไพ่ใบที่ดึงดูดใจคุณที่สุดมา 1 ใบนะคะ ✨' }
        ]
      });
    }

    // ============================================
    // 6a-2. รับค่าตอนผู้ใช้กดเลือกไพ่ 1 ใบ
    // ============================================
    if (userMessage.startsWith('เลือกใบที่ ')) {
      const is3Cards = userPending3Cards.has(userId);
      const pickedCards = is3Cards ? userPending3Cards.get(userId) : [];

      let picked;
      do {
        picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
      } while (pickedCards.find(c => c.card === picked.card));

      if (is3Cards) {
        pickedCards.push(picked);
        userPending3Cards.set(userId, pickedCards);

        const bubbles = [1, 2, 3, 4, 5].map(num => ({
          type: 'bubble', size: 'kilo',
          hero: { type: 'image', url: `${BASE_URL}/public/images/tarot_back.png`, size: 'full', aspectRatio: '3:4', aspectMode: 'cover', action: { type: 'message', label: `เลือกใบที่ ${num}`, text: `เลือกใบที่ ${num}` } },
          body: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px', backgroundColor: '#1A0A3E', contents: [ { type: 'button', style: 'primary', color: '#4A2B8C', action: { type: 'message', label: `👆 เลือกใบที่ ${num}`, text: `เลือกใบที่ ${num}` } } ] }
        }));

        if (pickedCards.length === 1) {
          return client.replyMessage({
            replyToken,
            messages: [
              { type: 'flex', altText: 'กรุณาเลือกไพ่ใบที่ 2 (ปัจจุบัน) ค่ะ', contents: { type: 'carousel', contents: bubbles } },
              { type: 'text', text: '🔮 ได้ไพ่ใบแรกแล้วค่ะ!\nต่อไปกดเลือก **ไพ่ใบที่ 2 (ปัจจุบัน)** ได้เลยนะคะ ✨' }
            ]
          });
        } else if (pickedCards.length === 2) {
          return client.replyMessage({
            replyToken,
            messages: [
              { type: 'flex', altText: 'กรุณาเลือกไพ่ใบที่ 3 (อนาคต) ค่ะ', contents: { type: 'carousel', contents: bubbles } },
              { type: 'text', text: '🔮 ได้ไพ่ใบที่สองแล้วค่ะ!\nสุดท้ายกดเลือก **ไพ่ใบที่ 3 (อนาคต)** ได้เลยนะคะ ✨' }
            ]
          });
        } else {
          // We have 3 cards, show result!
          userPending3Cards.delete(userId);
          const threeCards = pickedCards;
          const positions = [
            { label: '🕰️ อดีต', sublabel: 'สิ่งที่ผ่านมา' },
            { label: '⭐ ปัจจุบัน', sublabel: 'สิ่งที่กำลังเผชิญ' },
            { label: '🌟 อนาคต', sublabel: 'สิ่งที่กำลังจะมา' },
          ];

          const resultBubbles = threeCards.map((card, i) => ({
            type: 'bubble',
            size: 'kilo',
            header: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#2D1B69',
              paddingAll: '10px',
              contents: [
                { type: 'text', text: positions[i].label, color: '#FFD700', size: 'md', weight: 'bold', align: 'center' },
                { type: 'text', text: positions[i].sublabel, color: '#C8B9E8', size: 'xxs', align: 'center' },
              ],
            },
            hero: {
              type: 'image',
              url: `${BASE_URL}/public/images/${card.file}`,
              size: 'full',
              aspectRatio: '3:4',
              aspectMode: 'cover',
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              paddingAll: '12px',
              backgroundColor: '#1A0A3E',
              contents: [
                { type: 'text', text: card.card, weight: 'bold', size: 'sm', color: '#FFD700', align: 'center', wrap: true },
                { type: 'separator', margin: 'sm', color: '#4A2B8C' },
                { type: 'text', text: `✨ ${card.meaning}`, size: 'xs', color: '#C8B9E8', wrap: true, margin: 'sm' },
                { type: 'text', text: `💡 ${card.advice}`, size: 'xs', color: '#E8D5B7', wrap: true, margin: 'sm' },
              ],
            },
          }));

          const summary = threeCards.map((c, i) =>
            `${positions[i].label}: ${c.card}`
          ).join('\n');

          return client.replyMessage({
            replyToken,
            messages: [
              {
                type: 'flex',
                altText: `ไพ่ทาโรต์ 3 ใบของคุณ\n${summary}`,
                contents: { type: 'carousel', contents: resultBubbles },
              },
              {
                type: 'text',
                text: `🔮 ดีจังอ่านไพ่ทั้ง 3 ใบให้แล้วค่ะ\n\n${summary}\n\nสไลด์ดูได้ทีละใบเลยนะคะ ✨`,
              },
            ],
          });
        }
      } else {
        const tarotReading = `✨ ไพ่ของคุณคือ: ${picked.card}\n\n📖 ความหมาย: ${picked.meaning}\n\n💡 คำแนะนำจากดีจัง: ${picked.advice}\n\n🔮 ดีจัง — หมอดูไพ่ยิปซี`;
        return client.replyMessage({
          replyToken,
          messages: [
            {
              type: 'image',
              originalContentUrl: `${BASE_URL}/public/images/${picked.file}`,
              previewImageUrl: `${BASE_URL}/public/images/${picked.file}`,
            },
            { type: 'text', text: tarotReading },
          ],
        });
      }
    }

    // ============================================
    // 6b. เปิดไพ่ 3 ใบ (อดีต / ปัจจุบัน / อนาคต)
    // ============================================
    if (userMessage === 'เปิดไพ่ 3 ใบ') {
      userPending3Cards.set(userId, []);
      const bubbles = [1, 2, 3, 4, 5].map(num => ({
        type: 'bubble', size: 'kilo',
        hero: { type: 'image', url: `${BASE_URL}/public/images/tarot_back.png`, size: 'full', aspectRatio: '3:4', aspectMode: 'cover', action: { type: 'message', label: `เลือกใบที่ ${num}`, text: `เลือกใบที่ ${num}` } },
        body: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px', backgroundColor: '#1A0A3E', contents: [ { type: 'button', style: 'primary', color: '#4A2B8C', action: { type: 'message', label: `👆 เลือกใบที่ ${num}`, text: `เลือกใบที่ ${num}` } } ] }
      }));

      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'flex',
            altText: 'กรุณาเลือกไพ่ใบที่ 1 (อดีต) ค่ะ',
            contents: { type: 'carousel', contents: bubbles }
          },
          { type: 'text', text: '🔮 ไพ่ 3 ใบ (อดีต ปัจจุบัน อนาคต)\n\nตั้งสมาธิสักครู่ แล้วกดเลือก **ไพ่ใบที่ 1 (อดีต)** ได้เลยค่ะ ✨' }
        ]
      });
    }

    // ============================================
    // 8. ดูดวงราศี (Pre-written ไม่ใช้ Gemini)
    // ============================================
    if (userMessage === 'ราศี') {
      const zodiacList = Object.keys(ZODIAC_DATA);
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: '✨ เลือกราศีของคุณได้เลยค่ะ หรือพิมพ์ชื่อราศีได้เลยนะคะ\nเช่น "ราศีเมษ" "ราศีสิงห์" "ราศีมีน" ค่ะ',
          quickReply: {
            items: zodiacList.slice(0, 13).map(name => ({
              type: 'action',
              action: { type: 'message', label: `${ZODIAC_DATA[name].emoji} ${name.replace('ราศี', '')}`, text: name }
            }))
          }
        }]
      });
    }

    const matchedZodiac = Object.keys(ZODIAC_DATA).find(z => userMessage === z);
    if (matchedZodiac) {
      const z = ZODIAC_DATA[matchedZodiac];
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: `${z.emoji} ดวง${matchedZodiac} (${z.dates})\n\n${z.fortune}\n\n🔮 ดีจัง — หมอดูไพ่ยิปซี` }]
      });
    }

    // ============================================
    // 9. เช็คความเข้ากัน (ไม่ใช้ Gemini)
    // ============================================
    if (userMessage === 'เข้ากัน') {
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '💑 เช็คความเข้ากันของชื่อ 2 คนค่ะ\n\nพิมพ์ได้เลยนะคะ เช่น:\nเข้ากัน ก้อง น้ำ' }]
      });
    }

    if (userMessage.startsWith('เข้ากัน ')) {
      const parts = userMessage.replace('เข้ากัน ', '').trim().split(/\s+/);
      if (parts.length < 2) {
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '💑 ใส่ชื่อ 2 คนนะคะ เช่น:\nเข้ากัน ก้อง น้ำ' }]
        });
      }
      const [name1, name2] = parts;
      const score = calculateCompatibility(name1, name2);
      const { label, msg } = getCompatibilityMessage(score);
      const hearts = '❤️'.repeat(Math.floor(score / 20));
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: `💑 ความเข้ากันของ ${name1} & ${name2}\n\n${hearts}\n${label} ${score}%\n\n"${msg}"\n\n🔮 ดีจัง — หมอดูไพ่ยิปซี`
        }]
      });
    }

    // ============================================
    // 10. Referral — ชวนเพื่อน
    // ============================================
    if (userMessage === 'ชวนเพื่อน') {
      const code = await getReferralCode(userId);
      const credit = await getCredit(userId);
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: `🎁 โค้ดชวนเพื่อนของคุณค่ะ\n\n📋 โค้ด: ${code}\n\nให้เพื่อนพิมพ์ว่า:\n"ใช้โค้ด ${code}"\n\nเพื่อนจะได้รับเครดิต 5 บาท และคุณก็ได้ด้วยค่ะ! 🎉\n\n💎 เครดิตปัจจุบัน: ${credit} บาท`
        }]
      });
    }

    if (userMessage.startsWith('ใช้โค้ด ')) {
      const code = userMessage.replace('ใช้โค้ด ', '').trim();
      const result = await applyReferralCode(userId, code);
      if (result.success) {
        // แจ้งเจ้าของโค้ดด้วย
        try {
          await client.pushMessage({
            to: result.referrerId,
            messages: [{ type: 'text', text: `🎉 มีเพื่อนใช้โค้ดชวนเพื่อนของคุณแล้วค่ะ!\n\n💎 เครดิต +5 บาท เข้าบัญชีของคุณแล้วนะคะ 🙏` }]
          });
        } catch (_) {}
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `✅ ใช้โค้ดสำเร็จแล้วค่ะ!\n\n💎 เครดิต +5 บาท เข้าบัญชีของคุณแล้วนะคะ\n\nพิมพ์ "ดูดวงละเอียด" เพื่อใช้งานได้เลยค่ะ 🔮🙏` }]
        });
      } else {
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `❌ ${result.message}` }]
        });
      }
    }

    // ============================================
    // 9.5 รอรับวันเกิดสำหรับดูดวงตามหัวข้อ (keyword)
    //     *** ต้องเช็ค state นี้ก่อน topic detection เสมอ ***
    // ============================================
    if (userPendingTopic.has(userId)) {
      const topic = userPendingTopic.get(userId);
      userPendingTopic.delete(userId);
      const dob = userMessage; // รับวันเกิดตรงๆ ไม่ผ่าน topic detection
      // บันทึก DOB + zodiac ลง DB cache
      const dobZodiac = getZodiacFromDOB(dob);
      if (dobZodiac) await saveUserDOB(userId, dob, dobZodiac.zodiac);

      return executeTopicReading(userId, dob, topic, replyToken);
    }

    // ============================================
    // 10.5 รอรับวันเกิดสำหรับดูดวงละเอียด
    // ============================================
    if (userPendingDOB.has(userId)) {
      const paymentType = userPendingDOB.get(userId);
      userPendingDOB.delete(userId);
      const dob = userMessage;
      // บันทึก DOB + zodiac ลง DB cache
      const dobZodiac = getZodiacFromDOB(dob);
      if (dobZodiac) await saveUserDOB(userId, dob, dobZodiac.zodiac);

      if (paymentType === 'subscription') {
        if (!(await hasActiveSubscription(userId))) {
          return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'สิทธิ์ของท่านหมดอายุแล้วค่ะ' }] });
        }
        const { canRead } = await canUseSubscriptionDaily(userId);
        if (!canRead) {
          return client.replyMessage({ replyToken, messages: [{ type: 'text', text: '👑 สิทธิ์ดูดวงวันนี้หมดแล้วค่ะ (2/2 ครั้ง)' }] });
        }

        // เตรียมข้อมูลก่อนเรียก AI
        const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        const context = `ผู้ใช้เกิดวันที่: ${dob}\nผู้ใช้เป็นสมาชิก Premium ดูดวงแบบละเอียด ไพ่ที่สุ่มได้คือ "${picked.card}" (ความหมาย: ${picked.meaning}, คำแนะนำ: ${picked.advice}) จงวิเคราะห์ดวงอย่างละเอียดลึกซึ้ง ครอบคลุมทุกด้าน ความรัก การงาน การเงิน สุขภาพ และช่วงเวลาที่ควรระวัง พร้อมคำนวณหาราศีเกิด สีนำโชค และเลขนำโชคให้ด้วย ตอบประมาณ 8-10 บรรทัด`;
        
        try {
          // 1. เรียกใช้งาน AI ก่อนเลย ยังไม่ตัดโควตา
          const aiResponse = await callGeminiAI(userId, "ตรวจดวงชะตาแบบละเอียด", context);
          
          // 2. ถ้า AI ตอบกลับมาสำเร็จ (ไม่พัง) ค่อยตัดโควตารายวัน
          await recordSubscriptionRead(userId);
          await saveReading(userId, 'ดูดวงละเอียด');
          const recordId = await saveAITrainingData(userId, 'ดูดวงละเอียด', dob, picked.card, "ตรวจดวงชะตาแบบละเอียด", aiResponse);
          const { remaining } = await canUseSubscriptionDaily(userId);
          
          return client.replyMessage({
            replyToken,
            messages: [
              { type: 'image', originalContentUrl: `${BASE_URL}/public/images/${picked.file}`, previewImageUrl: `${BASE_URL}/public/images/${picked.file}` },
              { type: 'text', text: `${aiResponse}\n\n━━━━━━━━━━━━━━\n👑 สมาชิก Premium | เหลือสิทธิ์วันนี้: ${remaining} ครั้ง` },
              { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: await buildRatingFlexMessage(recordId) }
            ],
          });
        } catch (aiError) {
          console.error('Gemini AI Error (VIP):', aiError);
          return client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: 'ขออภัยค่ะ 🙏 พลังงานจักรวาลขัดข้องชั่วคราว (ระบบ AI ตอบสนองช้า) ดีจังยังไม่ได้ตัดโควตา VIP ของคุณนะคะ รบกวนพิมพ์วันเกิดมาใหม่อีกครั้งค่ะ ✨' }]
          });
        }

      } else if (paymentType === 'credit') {
        const credit = await getCredit(userId);
        if (credit < DETAILED_PRICE) {
          return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'เครดิตของท่านไม่เพียงพอค่ะ กรุณาเติมเครดิต' }] });
        }
        
        // เตรียมข้อมูลก่อนเรียก AI
        const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        const context = `ผู้ใช้เกิดวันที่: ${dob}\nผู้ใช้เป็นสมาชิก Premium ดูดวงแบบละเอียด ไพ่ที่สุ่มได้คือ "${picked.card}" (ความหมาย: ${picked.meaning}, คำแนะนำ: ${picked.advice}) จงวิเคราะห์ดวงอย่างละเอียดลึกซึ้ง ครอบคลุมทุกด้าน ความรัก การงาน การเงิน สุขภาพ และช่วงเวลาที่ควรระวัง พร้อมคำนวณหาราศีเกิด (ให้ใช้เกณฑ์แบบสากล Western Astrology เท่านั้น เช่น 20 เม.ย.-20 พ.ค. คือราศีพฤษภ) สีนำโชค และเลขนำโชคให้ด้วย ตอบประมาณ 8-10 บรรทัด`;
        
        try {
          // 1. เรียกใช้งาน AI ก่อนเลย ยังไม่หักเงิน
          const aiResponse = await callGeminiAI(userId, "ตรวจดวงชะตาแบบละเอียด", context);
          
          // 2. ถ้า AI ตอบกลับมาสำเร็จ (ไม่พัง) ค่อยหักเครดิต
          await useCredit(userId, DETAILED_PRICE);
          await saveReading(userId, 'ดูดวงละเอียด');
          const recordId = await saveAITrainingData(userId, 'ดูดวงละเอียด', dob, picked.card, "ตรวจดวงชะตาแบบละเอียด", aiResponse);
          const remainingCredit = await getCredit(userId);
          
          return client.replyMessage({
            replyToken,
            messages: [
              { type: 'image', originalContentUrl: `${BASE_URL}/public/images/${picked.file}`, previewImageUrl: `${BASE_URL}/public/images/${picked.file}` },
              { type: 'text', text: `${aiResponse}\n\n━━━━━━━━━━━━━━\n💎 เครดิตคงเหลือ: ${remainingCredit} บาท` },
              { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: await buildRatingFlexMessage(recordId) }
            ],
          });
        } catch (aiError) {
          console.error('Gemini AI Error (Credit):', aiError);
          return client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: 'ขออภัยค่ะ 🙏 พลังงานจักรวาลขัดข้องชั่วคราว (ระบบ AI ตอบสนองช้า) ดีจังยังไม่ได้หักเครดิตของคุณนะคะ รบกวนพิมพ์วันเกิดมาใหม่อีกครั้งค่ะ ✨' }]
          });
        }
      }
    }

    // ============================================
    // 10.5 Keyword ดูดวงตามหัวข้อ (ความรัก/การงาน/การเงิน/ฯลฯ)
    // ============================================
    const TOPIC_KEYWORDS = {
      ความรัก:  ['ความรัก', 'แฟน', 'คนรัก', 'เนื้อคู่', 'จีบ', 'ชอบ', 'รัก', 'แต่งงาน', 'หย่า', 'เลิก', 'อกหัก', 'ผูกดวง'],
      การงาน:   ['การงาน', 'งาน', 'อาชีพ', 'เจ้านาย', 'เพื่อนร่วมงาน', 'ลาออก', 'สมัครงาน', 'เลื่อนตำแหน่ง', 'ธุรกิจ', 'กิจการ'],
      การเรียน:  ['การเรียน', 'เรียน', 'สอบ', 'มหาวิทยาลัย', 'มหาลัย', 'โรงเรียน', 'เกรด', 'อ่านหนังสือ', 'สอบเข้า', 'เรียนต่อ'],
      การเงิน:  ['การเงิน', 'เงิน', 'หนี้', 'รายได้', 'ลงทุน', 'หุ้น', 'เงินทอง', 'โชค', 'ได้เงิน', 'เสียเงิน', 'รวย', 'จน'],
      สุขภาพ:   ['สุขภาพ', 'เจ็บ', 'ป่วย', 'โรค', 'ร่างกาย', 'หาย', 'รักษา', 'ออกกำลัง'],
      โชคลาภ:  ['โชคลาภ', 'ลอตเตอรี่', 'หวย', 'โชค', 'เสี่ยงโชค', 'ถูกรางวัล'],
      การเดินทาง: ['เดินทาง', 'ท่องเที่ยว', 'ต่างประเทศ', 'ย้าย', 'ย้ายบ้าน'],
      ครอบครัว: ['ครอบครัว', 'พ่อ', 'แม่', 'ลูก', 'พี่น้อง', 'บ้าน'],
    };

    const msgLower = userMessage.toLowerCase();
    let detectedTopic = null;
    for (const [topic, kwList] of Object.entries(TOPIC_KEYWORDS)) {
      if (kwList.some(kw => msgLower.includes(kw))) {
        detectedTopic = topic;
        break;
      }
    }

    // topic keyword เจอแล้ว trigger เลย (ไม่บังคับ intent แยก)
    if (detectedTopic) {
      const cachedDOB = await getUserDOB(userId);
      if (cachedDOB && cachedDOB.dob) {
        return executeTopicReading(userId, cachedDOB.dob, detectedTopic, replyToken);
      }
      // ถามวันเกิดก่อน แล้วค่อยดูดวงตามหัวข้อ
      userPendingTopic.set(userId, detectedTopic);
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: `🔮 ดีจังจะดูดวงเรื่อง${detectedTopic}ให้เลยค่ะ ✨\n\nรบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณด้วยนะคะ เพื่อให้คำทำนายแม่นยำที่สุด 🙏\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530)`,
        }],
      });
    }

    // ============================================
    // 11. ข้อความทั่วไป → Gemini AI
    // ============================================
    try {
      // ดักจับวันเกิดจากแชททั่วไปอัตโนมัติ
      const possibleDOB = getZodiacFromDOB(userMessage);
      if (possibleDOB) {
        const cachedDOB = await getUserDOB(userId);
        if (!cachedDOB) {
          await saveUserDOB(userId, possibleDOB.dobStr, possibleDOB.zodiac);
        }
      }
      
      const aiResponse = await callGeminiAI(userId, userMessage);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: aiResponse }],
      });
    } catch (aiChatError) {
      console.error(`General Chat AI Error: ${aiChatError.message}`);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: 'ตอนนี้หมอดูคิวเต็มชั่วคราว รบกวนทักมาคุยเล่นใหม่อีกครั้งนะคะ 🔮' }],
      });
    }
    
  } catch (error) {
    // ดักจับ Error ภาพรวมอื่นๆ ที่ไม่ใช่จาก AI
    console.error(`handleEvent error: ${error.message}`);
    
    // เช็คก่อนว่ามี replyToken ให้ตอบกลับไหม ป้องกันระบบพังซ้ำซ้อน
    if (event.replyToken) {
      return client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: 'ขออภัยค่ะ 🙏 ตอนนี้คิวดูดวงยาวเป็นหางว่าวเลย ระบบเลยตอบช้า รบกวนลองพิมพ์มาใหม่อีกครั้งนะคะ ✨',
          },
        ],
      });
    }
  }
}
// =========================================================
// Lucky Number API endpoint (VIP Only)
// =========================================================
app.post('/api/vip/lucky-number', express.json(), async (req, res) => {
  try {
    const { userId, dob } = req.body;
    if (!userId || !dob) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (!(await hasActiveSubscription(userId))) {
      return res.status(403).json({ error: 'บริการนี้เฉพาะสมาชิก Premium (VIP) เท่านั้นค่ะ' });
    }

    const context = `ผู้ใช้เกิดวันที่: ${dob}`;
    // เติมคำสั่งบังคับราศีสากลเข้าไปใน Prompt
    const userPrompt = `ช่วยวิเคราะห์ "กลุ่มตัวเลขมงคล" (3-4 หลัก) ที่เหมาะสมกับคนที่เกิดในวันนี้ เพื่อช่วยเสริมโชคลาภ การเงิน และความรัก พร้อมอธิบายความหมายของตัวเลขเหล่านั้นสั้นๆ ให้อ่านง่ายและเป็นกันเอง (สำคัญ: หากมีการระบุราศีของผู้ใช้ ให้คำนวณราศีตามเกณฑ์สากล Western Astrology เท่านั้น เช่น 20 เม.ย.-20 พ.ค. คือราศีพฤษภ)`;
    
    const aiReading = await callGeminiAI(userId, userPrompt, context);
    await saveReading(userId, 'เลขมงคล');
    res.json({ reading: aiReading });
  } catch (err) {
    console.error('Lucky Number API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// Phone Number API endpoint (VIP Only)
// =========================================================
app.post('/api/vip/phone-number', express.json(), async (req, res) => {
  try {
    const { userId, dob, phone } = req.body;
    if (!userId || !dob || !phone) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (!(await hasActiveSubscription(userId))) {
      return res.status(403).json({ error: 'บริการนี้เฉพาะสมาชิก Premium (VIP) เท่านั้นค่ะ' });
    }

    const context = `ผู้ใช้เกิดวันที่: ${dob}\nเบอร์โทรศัพท์ของผู้ใช้คือ: ${phone}`;
    // เติมคำสั่งบังคับราศีสากลเข้าไปใน Prompt
    const userPrompt = `ช่วยวิเคราะห์เบอร์โทรศัพท์นี้โดยจับคู่ตัวเลข 7 หลักหลัง ว่าส่งผลต่อดวงชะตาของผู้ใช้ที่เกิดในวันนี้อย่างไร (เน้นเรื่องการงาน การเงิน ความรัก) เบอร์นี้เป็นเบอร์ที่ดีหรือไม่ มีข้อควรระวังอะไรบ้าง อธิบายให้อ่านง่าย เป็นมิตร (สำคัญ: หากมีการระบุราศีของผู้ใช้ ให้คำนวณราศีตามเกณฑ์สากล Western Astrology เท่านั้น เช่น 20 เม.ย.-20 พ.ค. คือราศีพฤษภ)`;
    
    const aiReading = await callGeminiAI(userId, userPrompt, context);
    await saveReading(userId, 'วิเคราะห์เบอร์มงคล');
    res.json({ reading: aiReading });
  } catch (err) {
    console.error('Phone Number API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// API สำหรับระบบ Voice Chat ในหน้า VIP
// ============================================
app.post('/api/vip-chat', express.json(), async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "ไม่พบข้อความ" });
        }

        // โยนข้อความที่แปลงจากเสียงไปให้ Gemini คิดคำตอบ
        // (ใช้ฟังก์ชัน callGeminiAI ที่คุณมีอยู่แล้วได้เลย)
        const aiResponse = await callGeminiAI(userId, message);

        // ส่งคำตอบกลับไปให้หน้าเว็บเพื่ออ่านออกเสียง
        res.json({ reply: aiResponse });

    } catch (error) {
        console.error("VIP Voice Chat Error:", error);
        res.status(500).json({ reply: "ขออภัยค่ะ พลังงานขัดข้องชั่วคราว ดีจังขอเวลาพักแป๊บนึงนะคะ" });
    }
});

// เปิด Web Server
app.listen(port, () => {
  console.log(`🚀 Webhook server is running on port ${port}...`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Connected' : '⚠️ ยังไม่ได้ตั้งค่า'}`);
});
