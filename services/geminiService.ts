
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Priority } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeComplaint = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following apartment maintenance complaint and suggest the best Category and Priority.
      Complaint: "${description}"
      
      Return JSON with fields: category, priority, and a short summary.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "One of: ELECTRICAL, PLUMBING, CLEANING, LIFT, SECURITY, OTHER" },
            priority: { type: Type.STRING, description: "One of: LOW, MEDIUM, HIGH, URGENT" },
            summary: { type: Type.STRING, description: "A 5-word summary" }
          },
          required: ["category", "priority", "summary"]
        }
      }
    });

    // Directly access .text property from the response object
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
};
