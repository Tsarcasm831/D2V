
import { GoogleGenAI } from "@google/genai";

// Ensure process is defined to avoid ReferenceError in some browser environments
const apiKey = (typeof process !== "undefined" && process.env && process.env.API_KEY) 
  ? process.env.API_KEY 
  : "";

const ai = new GoogleGenAI({ apiKey });

export const generateItemLore = async (itemName: string, itemType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, atmospheric, dark fantasy lore snippet (max 30 words) for an RPG item called "${itemName}" which is a "${itemType}". Make it sound cryptic and ancient.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Lore Error:", error);
    return "The origin of this artifact is lost to time.";
  }
};

export const identifyItem = async (itemName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide 3 unique, powerful stats for a high-level dark fantasy RPG item named "${itemName}". Format as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Identify Error:", error);
    return ["Unidentified Power", "Hidden Potential", "Ancestral Echo"];
  }
};
