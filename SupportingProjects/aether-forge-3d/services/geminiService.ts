
import { GoogleGenAI, Type } from "@google/genai";
import { WeaponConfig, WeaponType, WeaponEffect, TextureStyle } from "../types";
import { DEFAULT_CONFIG } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWeaponConfig = async (prompt: string): Promise<WeaponConfig | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a weapon or item configuration based on this description: "${prompt}". 
      Return a JSON object fitting the schema provided. 
      For colors, use hex codes. 
      For dimensions, keep them somewhat realistic relative to a handheld weapon or shirt.
      If it is a shirt, use the handleColor for the main fabric color, metalColor for stripes/details, and handleTexture to switch between Leather and Cloth/Plaid.
      If the description mentions fire, lightning, or magic, set the effect accordingly.
      Select appropriate textures (Wood for axes/spears, Leather/Cloth for swords, etc) unless specified otherwise.
      If the description is vague, be creative but realistic.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { 
              type: Type.STRING, 
              enum: [
                WeaponType.SWORD, WeaponType.AXE, WeaponType.MACE, 
                WeaponType.SPEAR, WeaponType.DAGGER, WeaponType.KUNAI, 
                WeaponType.CHAKRAM, WeaponType.ARROW, WeaponType.SHIRT,
                WeaponType.FISHING_POLE
              ] 
            },
            handleLength: { type: Type.NUMBER },
            handleRadius: { type: Type.NUMBER },
            guardWidth: { type: Type.NUMBER },
            bladeLength: { type: Type.NUMBER },
            bladeWidth: { type: Type.NUMBER },
            bladeThickness: { type: Type.NUMBER },
            pommelSize: { type: Type.NUMBER },
            handleColor: { type: Type.STRING },
            metalColor: { type: Type.STRING },
            guardColor: { type: Type.STRING },
            roughness: { type: Type.NUMBER },
            metalness: { type: Type.NUMBER },
            handleTexture: {
                type: Type.STRING,
                enum: [
                    TextureStyle.NONE, TextureStyle.CLOTH, TextureStyle.LEATHER,
                    TextureStyle.WOOD, TextureStyle.DAMASCUS, TextureStyle.SCALES,
                    TextureStyle.RUST, TextureStyle.COSMIC
                ]
            },
            bladeTexture: {
                type: Type.STRING,
                enum: [
                    TextureStyle.NONE, TextureStyle.CLOTH, TextureStyle.LEATHER,
                    TextureStyle.WOOD, TextureStyle.DAMASCUS, TextureStyle.SCALES,
                    TextureStyle.RUST, TextureStyle.COSMIC
                ]
            },
            effect: { 
                type: Type.STRING, 
                enum: [WeaponEffect.NONE, WeaponEffect.FIRE, WeaponEffect.LIGHTNING, WeaponEffect.GLOW] 
            },
            effectColor: { type: Type.STRING },
          },
          required: ["type", "handleLength", "bladeLength", "handleColor", "metalColor"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    return { ...DEFAULT_CONFIG, ...data };
  } catch (error) {
    console.error("Failed to generate weapon config:", error);
    return null;
  }
};