import { GoogleGenAI, Type } from "@google/genai";
import { PlaylistAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePlaylistVibe = async (songTitles: string[]): Promise<PlaylistAnalysis> => {
  if (songTitles.length === 0) {
    return {
      vibe: "Silence",
      description: "Add some tracks to get the party started.",
      suggestedColorFrom: "#1e293b", // slate-800
      suggestedColorTo: "#0f172a",   // slate-900
      playlistName: "Empty Space"
    };
  }

  const prompt = `Analyze this list of songs and generate a 'Vibe Report'. 
  Songs: ${songTitles.join(", ")}.
  
  Return a creative playlist name, a short poetic description of the mood (max 2 sentences), a short 'vibe' keyword (e.g., 'Melancholy', 'High Energy', 'Focus'), and two hex color codes that represent this mood for a UI gradient.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playlistName: { type: Type.STRING },
            vibe: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedColorFrom: { type: Type.STRING, description: "A Hex color code" },
            suggestedColorTo: { type: Type.STRING, description: "A Hex color code" },
          },
          required: ["playlistName", "vibe", "description", "suggestedColorFrom", "suggestedColorTo"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as PlaylistAnalysis;
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback
    return {
      vibe: "Mixed",
      description: "An eclectic mix of personal favorites.",
      suggestedColorFrom: "#6366f1", // Indigo
      suggestedColorTo: "#a855f7",   // Purple
      playlistName: "My Collection"
    };
  }
};