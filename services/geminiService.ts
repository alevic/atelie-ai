import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, UploadedImage, AtelierProfile } from "../types";

// Helper to get the correct API Key
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key não encontrada. A chave deve ser configurada via ambiente.");
  return key;
};

const getSystemInstruction = (profile: AtelierProfile) => {
  return `You are an expert UGC (User Generated Content) Creator AI and professional social media photographer working for the brand "${profile.name}".

Your GOAL is to create images that look like authentic, high-quality content shot on a premium smartphone (like an iPhone 15 Pro) for Instagram or TikTok.

Brand Context: ${profile.description}

CRITICAL RULES:
1. **Aesthetics:** The image MUST look like a real photo, NOT a 3D render. Use natural depth of field, authentic textures, and "perfectly imperfect" lighting typical of top-tier influencers.
2. **Subject:** The FIRST image provided is the PRODUCT. It must remain recognizable but blended naturally into the scene.
3. **Pattern/Texture:** If a PATTERN image is provided, apply it realistically to the product's material, respecting folds and shadows.
4. **Reference:** If a STYLE reference is provided, mimic its color grading and vibe.
5. **Composition:** Frame the shot for social media engagement (rule of thirds, clear focal point).
`;
};

const getCaptionSystemInstruction = (profile: AtelierProfile) => {
  return `Você é a gerente de mídias sociais da marca "${profile.name}".
  
  CONTEXTO DA MARCA:
  ${profile.description}
  
  OBJETIVO:
  - Crie legendas engajadoras para o Instagram/TikTok (estilo UGC).
  - Use emojis, espaçamento amigável e uma CTA (Chamada para Ação) no final.
  - O tom deve ser autêntico, como uma criadora de conteúdo falando com amigas.
  `;
};

export const generateCaptions = async (config: GenerationConfig, profile: AtelierProfile): Promise<string[]> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Crie 3 opções de legendas para um post UGC da marca ${profile.name}.
  Detalhes do post:
  - Vibe: ${config.style}
  - Cenário: ${config.environment || 'Lifestyle'}
  ${config.customPrompt ? `- Contexto extra: ${config.customPrompt}` : ''}
  
  Opção 1: Curta e impactante.
  Opção 2: Storytelling (história breve).
  Opção 3: Focada em benefícios/venda suave.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getCaptionSystemInstruction(profile),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return ["Não foi possível gerar legendas."];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Caption Error:", error);
    return ["Erro ao gerar legendas."];
  }
};

export const generateUGCImage = async (
  images: UploadedImage[],
  config: GenerationConfig,
  profile: AtelierProfile
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Prepare the prompt based on configuration
  let promptText = `Generate a high-quality UGC (User Generated Content) photo for ${profile.name}.`;
  
  // Construct parts for the API
  const parts: any[] = [];

  // 1. Add Product images first (Subject)
  images.forEach((img) => {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType,
      },
    });
  });

  // 2. Add Pattern Image if exists
  if (config.patternReference) {
    promptText += `\nINSTRUCTION: The NEXT image is a PATTERN. Apply this texture to the product realistically.`;
    parts.push({
      inlineData: {
        data: config.patternReference.base64,
        mimeType: config.patternReference.mimeType,
      },
    });
  }

  // 3. Add Style Reference if exists
  if (config.styleReference) {
    promptText += `\nINSTRUCTION: The NEXT image is a VISUAL REFERENCE. Copy this exact lighting and color grade.`;
    parts.push({
      inlineData: {
        data: config.styleReference.base64,
        mimeType: config.styleReference.mimeType,
      },
    });
  }

  promptText += `\n\nSCENE & VIBE:`;
  if (config.environment) promptText += `\n- Setting: ${config.environment.replace('_', ' ')}`;
  if (config.character !== 'none') {
    promptText += `\n- Model: ${config.character} interacting naturally with the product`;
    if (config.characterStyle) promptText += ` (${config.characterStyle})`;
  }
  
  promptText += `\n- Aesthetics: ${config.style.replace('_', ' ')}, shot on high-end phone, high resolution, authentic social media look.`;
  
  if (config.lighting) promptText += `\n- Lighting: ${config.lighting.replace('_', ' ')}`;
  
  if (config.style === 'studio_clean') {
    promptText += `\n- SPECIAL: Clean background, e-commerce focus, sharp details.`;
  }
  
  if (config.customPrompt) {
    promptText += `\n- Specific Details: ${config.customPrompt}`;
  }

  promptText += `\n\nACTION: Create the photo now.`;

  // Add text prompt at the end
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        systemInstruction: getSystemInstruction(profile),
      }
    });

    // Extract image from response
    let generatedImageBase64 = null;
    
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          break; 
        }
      }
    }

    if (!generatedImageBase64) {
        const textOutput = response.text;
        if (textOutput) {
            throw new Error(`The model returned text instead of an image: "${textOutput.substring(0, 100)}..."`);
        }
        throw new Error("No image data found in response.");
    }

    return `data:image/png;base64,${generatedImageBase64}`;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate image.");
  }
};

export const refineImage = async (
  imageBase64: string,
  instruction: string,
  profile: AtelierProfile
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const rawBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
             inlineData: {
                data: rawBase64,
                mimeType: 'image/png'
             }
          },
          { text: `INSTRUCTION: ${instruction}. Keep it realistic and high quality.` }
        ],
      },
      config: {
        systemInstruction: `You are a professional photo editor for "${profile.name}". Edit the image as requested while maintaining the product's integrity.`,
      }
    });

    let generatedImageBase64 = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          break; 
        }
      }
    }

    if (!generatedImageBase64) throw new Error("No image data found in response.");
    return `data:image/png;base64,${generatedImageBase64}`;

  } catch (error: any) {
    console.error("Refine Error:", error);
    throw new Error(error.message || "Failed to refine image.");
  }
}

export const generateVideo = async (
  imageBase64: string,
  promptContext: string, // This will now include the video style description
  profile: AtelierProfile
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const rawBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  try {
    // Improve prompt for Veo to ensure UGC feel
    const veoPrompt = `Vertical social media video (9:16) for brand ${profile.name}. 
    Style: ${promptContext}. 
    High quality, smooth motion, authentic UGC look, 4k resolution feel.`;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: veoPrompt,
      image: {
        imageBytes: rawBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) throw new Error("No video URI returned.");

    const response = await fetch(`${videoUri}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Veo Video Error:", error);
    if (error.message && (error.message.includes("404") || error.message.includes("NOT_FOUND"))) {
        throw new Error("VEO_KEY_ERROR");
    }
    throw new Error("Falha ao gerar o vídeo. Verifique se sua chave de API suporta o modelo Veo.");
  }
}