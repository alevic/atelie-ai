import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, UploadedImage } from "../types";

const getSystemInstruction = () => {
  return `You are an expert UGC (User Generated Content) creator AI and professional product photographer.
Your SOLE task is to generate a photorealistic image based on the input images and configuration.

CRITICAL RULES:
1. You MUST generate an image. Do not simply describe the image or reply conversationally.
2. The FIRST image provided is always the PRODUCT (Subject).
3. If a PATTERN/TEXTURE image is provided, you must apply this pattern to the fabric/material of the product, maintaining the original folds, shadows, and draping.
4. If a STYLE REFERENCE image is provided, use its lighting, colors, and mood.
5. Blend everything seamlessly into the requested environment.
`;
};

const getCaptionSystemInstruction = () => {
  return `Você é a gerente de mídias sociais do "Glorinha Ateliê", um ateliê de costura e artesanato tradicional.
  
  CONTEXTO DA MARCA:
  - O ateliê é comandado por Mãe e Filha.
  - Elas trabalham juntas há mais de 40 anos.
  - O tom de voz deve ser: Acolhedor, familiar, afetivo, enfatizando o "feito à mão" (handmade), a tradição e o amor envolvido em cada peça.
  - Use emojis adequados ao universo de costura/artesanato.
  
  OBJETIVO:
  - Crie legendas engajadoras para o Instagram baseadas na descrição da imagem fornecida.
  `;
};

export const generateCaptions = async (config: GenerationConfig): Promise<string[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Crie 3 opções de legendas para o Instagram para uma foto com as seguintes características:
  - Ambiente: ${config.environment || 'Estúdio do Ateliê'}
  - Personagem: ${config.character !== 'none' ? config.character : 'Foco no produto'}
  - Estilo: ${config.style}
  - Detalhes extras: ${config.customPrompt || 'Nenhum'}
  ${config.patternReference ? '- Destaque: A peça está com uma NOVA ESTAMPA exclusiva.' : ''}
  
  As legendas devem convidar o cliente a conhecer o ateliê ou encomendar a peça. Inclua hashtags relevantes.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getCaptionSystemInstruction(),
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
  config: GenerationConfig
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare the prompt based on configuration
  let promptText = `Generate a high-quality, photorealistic image.`;
  
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
    promptText += `\nINSTRUCTION: The NEXT image is a PATTERN/TEXTURE. Apply this texture to the clothing/material of the product in the first image. Replace the original pattern but keep the object's shape perfectly.`;
    parts.push({
      inlineData: {
        data: config.patternReference.base64,
        mimeType: config.patternReference.mimeType,
      },
    });
  }

  // 3. Add Style Reference if exists
  if (config.styleReference) {
    promptText += `\nINSTRUCTION: The NEXT image is a STYLE REFERENCE (Moodboard). Use its lighting, colors, and mood.`;
    parts.push({
      inlineData: {
        data: config.styleReference.base64,
        mimeType: config.styleReference.mimeType,
      },
    });
  }

  promptText += `\n\nSCENE CONFIGURATION:`;
  if (config.environment) promptText += `\n- Environment: ${config.environment.replace('_', ' ')}`;
  if (config.character !== 'none') {
    promptText += `\n- Character: ${config.character}`;
    if (config.characterStyle) promptText += ` (${config.characterStyle})`;
  }
  if (config.lighting) promptText += `\n- Lighting: ${config.lighting.replace('_', ' ')}`;
  if (config.style) promptText += `\n- Style: ${config.style.replace('_', ' ')}`;
  
  if (config.style === 'studio_clean') {
    promptText += `\n- SPECIAL INSTRUCTION: Isolate the product on a clean, solid white or neutral background. Professional e-commerce studio lighting. Sharp focus. No clutter.`;
  }
  
  if (config.customPrompt) {
    promptText += `\n- Additional Instructions: ${config.customPrompt}`;
  }

  promptText += `\n\nACTION: Generate the image now.`;

  // Add text prompt at the end
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        systemInstruction: getSystemInstruction(),
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
            throw new Error(`The model returned text instead of an image: "${textOutput.substring(0, 100)}..." Please try again.`);
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
  instruction: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract base64 raw string if it has prefix
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
          { text: `INSTRUCTION: ${instruction}. Maintain the product look and high quality.` }
        ],
      },
      config: {
        systemInstruction: "You are a professional photo editor. Modify the image according to the instruction. Keep the main subject (product) identical.",
      }
    });

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
        throw new Error("No image data found in response.");
    }

    return `data:image/png;base64,${generatedImageBase64}`;

  } catch (error: any) {
    console.error("Refine Error:", error);
    throw new Error(error.message || "Failed to refine image.");
  }
}

export const generateVideo = async (
  imageBase64: string,
  promptContext: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract base64 raw string if it has prefix
  const rawBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic product video, slow motion, elegant movement. ${promptContext}`,
      image: {
        imageBytes: rawBase64,
        mimeType: 'image/png', // Assuming PNG output from Gemini Flash Image
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16' // Portrait for Social Media (Reels)
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
        throw new Error("No video URI returned.");
    }

    // Fetch the actual video bytes using the URI + API Key
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Veo Video Error:", error);
    throw new Error("Falha ao gerar o vídeo. Verifique se sua chave de API suporta o modelo Veo.");
  }
}