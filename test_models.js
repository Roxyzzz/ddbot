require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('hello');
    console.log(`[SUCCESS] ${modelName}:`, result.response.text().substring(0, 20));
  } catch (error) {
    console.error(`[ERROR] ${modelName}:`, error.message);
  }
}

async function run() {
  await testModel('gemini-3.1-flash-lite');
  await testModel('gemini-2.0-flash-lite-preview-02-05');
  await testModel('gemini-1.5-flash');
  await testModel('gemini-1.5-flash-8b');
}
run();
