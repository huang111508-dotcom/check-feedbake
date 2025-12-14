import { GoogleGenAI, Type } from "@google/genai";
import { DailyReport } from "../types";

const parseReportsWithGemini = async (
  rawText: string,
  keywords: string[]
): Promise<DailyReport[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are an expert administrative assistant for a retail supermarket team. 
    Your task is to parse unstructured daily work reports into a structured JSON format.

    CRITICAL RULES:
    1. **NO TRANSLATION**: Extract the text exactly as it appears in the original language (Chinese). Do not translate into English.
    2. **STRICTLY PRESERVE FORMATTING**: 
       - Keep ALL original line breaks (\n), paragraph spacing, and indentation.
       - Keep ALL original numbering (1., 2., 3., etc) and bullet points exactly as entered.
       - Do not flatten lists into a single line. 
       - Example input: "1. A\n2. B". Example output: "1. A\n2. B".
    3. **DEPARTMENT CLASSIFICATION**: Based on the content of the work, classify the report into exactly ONE of the following departments:
       - '食百' (Grocery/General Merchandise - e.g., snacks, drinks, packaged food, non-food items)
       - '水产肉品' (Seafood & Meat - e.g., fish, pork, beef, chicken, cutting)
       - '蔬果' (Produce - e.g., vegetables, fruits, weighing)
       - '熟食冻品' (Deli & Frozen - e.g., cooked food, bakery, frozen dumplings, ice cream)
       - '后勤' (Logistics/Admin - e.g., cleaning, security, cashiers, office work, management)
       If unsure, infer from the items mentioned. If absolutely impossible, use '后勤'.
    
    Parsing Logic:
    1. Identify 'employeeName' and 'reportDate' (use today's date if missing).
    2. Extract 'contentSummary' (Today's work) - KEEP FORMATTING.
    3. Extract 'nextSteps' (Tomorrow's plan) - KEEP FORMATTING.
    4. Extract 'blockers' - KEEP FORMATTING.
    5. Match 'matchedKeywords' from the provided list.
  `;

  const keywordString = keywords.join(", ");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
      Target Keywords to Flag: [${keywordString}]
      
      Raw Chat Logs:
      ${rawText}
    `,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            employeeName: { type: Type.STRING },
            department: { type: Type.STRING, description: "One of: 食百, 水产肉品, 蔬果, 熟食冻品, 后勤" },
            reportDate: { type: Type.STRING },
            contentSummary: { type: Type.STRING, description: "Exact original text with all newlines and numbering preserved." },
            nextSteps: { type: Type.STRING, description: "Exact original text with all newlines and numbering preserved." },
            blockers: { type: Type.STRING, description: "Exact original text with all newlines and numbering preserved." },
            matchedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of keywords found in this report"
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];

  try {
    return JSON.parse(text) as DailyReport[];
  } catch (e) {
    console.error("Failed to parse JSON response", e);
    throw new Error("The AI response was not valid JSON.");
  }
};

export { parseReportsWithGemini };