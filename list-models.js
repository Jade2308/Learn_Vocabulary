const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

const ai = new GoogleGenAI({ apiKey });

async function list() {
  try {
    const models = await ai.models.list();
    console.log('Available models:');
    for await (const m of models) {
      if (m.name.includes('flash') || m.name.includes('gemini')) {
        console.log(m.name);
      }
    }
  } catch (err) {
    console.error('List error:', err);
  }
}

list();
