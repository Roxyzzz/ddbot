require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', // Model supporting vision
  });

  const imagePath = path.join(__dirname, 'test_face.jpg');
  if (!fs.existsSync(imagePath)) {
    throw new Error('Test image not found');
  }

  const imagePart = {
    inlineData: {
      data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
      mimeType: "image/jpeg"
    }
  };

  console.log('Sending message to Gemini with image...');
  const result = await model.generateContent([
    'วิเคราะห์โหงวเฮ้งหน้าคนในรูปภาพนี้สั้นๆ 2 บรรทัด',
    imagePart
  ]);

  console.log('Response:');
  console.log(result.response.text());
}

test().catch(console.error);
