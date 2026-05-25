const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// สร้าง QR PromptPay และบันทึกเป็นไฟล์ PNG
// คืนค่า filename ที่สร้าง (ไม่มี path)
async function generatePromptPayQR(promptPayId, amount, userId) {
  const payload = generatePayload(promptPayId, { amount });

  // ตั้งชื่อไฟล์ unique ตาม userId
  const filename = `qr_${userId}_${Date.now()}.png`;
  const outputPath = path.join(__dirname, 'public', 'images', filename);

  await QRCode.toFile(outputPath, payload, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });

  // ลบไฟล์ QR เก่าของ user คนนี้ (ถ้ามี) เพื่อไม่ให้สะสม
  cleanOldQRFiles(userId, filename);

  return filename;
}

// ลบไฟล์ QR เก่าของ user คนนี้ ยกเว้น filename ปัจจุบัน
function cleanOldQRFiles(userId, currentFilename) {
  const dir = path.join(__dirname, 'public', 'images');
  const prefix = `qr_${userId}_`;
  try {
    fs.readdirSync(dir).forEach((file) => {
      if (file.startsWith(prefix) && file !== currentFilename) {
        fs.unlinkSync(path.join(dir, file));
      }
    });
  } catch (e) {
    // ไม่ต้อง handle error ถ้าลบไม่ได้
  }
}

module.exports = { generatePromptPayQR };
