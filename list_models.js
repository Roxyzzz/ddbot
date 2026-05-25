require('dotenv').config();
const axios = require('axios');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log(response.data.models.map(m => m.name).join('\n'));
  } catch (error) {
    console.error('Error fetching models:', error.response ? error.response.data : error.message);
  }
}
listModels();
