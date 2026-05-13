import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

let _genai: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genai) {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return _genai;
}

export async function generateReply(systemPrompt: string, userMessage: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}
