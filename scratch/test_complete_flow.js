require('dotenv').config();
const { drawPhysiognomy } = require('../astrology_face');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function callGeminiAI(imagePath) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'คุณคือ "ดีจัง" หมอดูหญิง สุภาพและเป็นกันเอง ลงท้ายด้วยค่ะ/นะคะ',
  });
  const imagePart = {
    inlineData: {
      data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
      mimeType: "image/jpeg"
    }
  };
  const result = await model.generateContent([
    "กรุณาวิเคราะห์โหงวเฮ้งของคนในรูปภาพนี้อย่างละเอียดตามศาสตร์โหงวเฮ้งจีน โดยวิเคราะห์ 3 ส่วนสำคัญของใบหน้า (หน้าผาก/คิ้ว, จมูก/แก้ม, ปาก/คาง) พร้อมข้อแนะนำดีๆ ในการดำเนินชีวิต ตอบประมาณ 5-7 บรรทัด",
    imagePart
  ]);
  return result.response.text();
}

async function run() {
  const rawPath = path.join(__dirname, 'test_face.jpg');
  const markedPath = path.join(__dirname, 'test_face_marked.jpg');

  console.log('1. Detecting and drawing face landmarks...');
  const faceDetected = await drawPhysiognomy(rawPath, markedPath);
  if (!faceDetected) {
    console.error('No face detected.');
    return;
  }
  console.log('-> Success! Marked image saved to:', markedPath);

  console.log('2. Requesting physiognomy analysis from Gemini...');
  const aiResponse = await callGeminiAI(rawPath);
  console.log('-> AI Response:');
  console.log(aiResponse);
}

run().catch(console.error);
