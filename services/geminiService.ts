import { GoogleGenAI, Type } from "@google/genai";
import { ReportItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseDingTalkLogs = async (rawText: string): Promise<ReportItem[]> => {
  try {
    const currentYear = new Date().getFullYear();
    const prompt = `
      You are an administrative assistant for a retail/supermarket team.
      Your task is to parse unstructured work reports from chat logs (DingTalk/WeChat) into a structured summary table.

      **Context Info:**
      - **Current Year**: ${currentYear}. (If a date appears as "12.12" or "10/05" without a year, assume it is ${currentYear}).

      **Rules:**
      1. **Grouping**: Group reports by **Person** and **Date**. One entry per person per day.
      2. **Department Classification**: Classify each person into exactly one:
         - '食百' (Grocery/Dry Goods)
         - '水产肉品' (Seafood & Meat)
         - '蔬果' (Produce)
         - '熟食冻品' (Deli & Frozen)
         - '后勤' (Logistics/Admin/Security)
         Default to '后勤' if unknown.
      3. **Content Preservation (CRITICAL)**: 
         - The 'content' field must contain the **EXACT RAW TEXT** submitted by the employee.
         - **DO NOT** remove newlines, indentation, or extra spaces.
         - **DO NOT** reformat lists (e.g., do not change "1、" to "1.").
         - **DO NOT** summarize or fix typos.
         - Keep the structure exactly as provided in the input, including empty lines between paragraphs.
      4. **Date Formatting**: 
         - Extract the date. 
         - If the year is missing (e.g., "12.12"), output it as "${currentYear}-12-12".
         - Output format: YYYY-MM-DD.

      **Input Text:**
      ${rawText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              employeeName: { type: Type.STRING },
              date: { type: Type.STRING },
              department: { type: Type.STRING, enum: ['食百', '水产肉品', '蔬果', '熟食冻品', '后勤'] },
              content: { type: Type.STRING }
            },
            required: ["employeeName", "date", "department", "content"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);
    
    // Add IDs for UI handling
    return rawData.map((item: any) => ({
      ...item,
      id: crypto.randomUUID()
    }));

  } catch (error) {
    console.error("Error parsing logs:", error);
    throw error;
  }
};