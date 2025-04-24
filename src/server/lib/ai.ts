import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: Bun.env.GEMINI_API_KEY });
