require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('NO_API_KEY');
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `คุณคือ "ท่านโหร" หมอดูไพ่ยิปซีและโหราศาสตร์ที่เชี่ยวชาญ ลึกลับ แต่ใจดีและให้คำปรึกษาที่สร้างสรรค์`;
    const prompt = `${systemPrompt}\n\nคำถามจากผู้ใช้: สวัสดีท่านโหร\n\nคำทำนายของคุณ:`;

    console.log('Calling Gemini...');
    const result = await model.generateContent(prompt);
    console.log('Response:', result.response.text());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGemini();
