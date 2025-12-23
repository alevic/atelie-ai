import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, UploadedImage, AtelierProfile, ENVIRONMENTS, CHARACTERS, STYLES, LIGHTING } from "../types";

// Helper to get labels from values for the prompt
const getLabel = (list: {value: string, label: string}[], value: string) => {
  return list.find(item => item.value === value)?.label || value;
};

// Helper to get the correct API Key with priority: Profile Key > Env Key
const getApiKey = (profile?: AtelierProfile) => {
  // 1. Check if user provided a custom key in Settings
  if (profile?.veoApiKey && profile.veoApiKey.trim() !== '') {
    return profile.veoApiKey.trim();
  }

  // 2. Fallback to Environment Variable
  const envKey = process.env.API_KEY;
  if (envKey) return envKey;

  // 3. Throw error if neither exists
  throw new Error("API Key não encontrada. Configure nas Configurações do App ou via variável de ambiente.");
};

// Helper to convert Raw PCM to WAV for browser playback
const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const getSystemInstruction = (profile: AtelierProfile) => {
  return `You are an expert UGC (User Generated Content) Creator AI and professional social media photographer working for the brand "${profile.name}".

Your GOAL is to create images that look like authentic, high-quality content shot on a premium smartphone (like an iPhone 15 Pro) for Instagram or TikTok.

Brand Context: ${profile.description}

CRITICAL RULES:
0. **NO TEXT OUTPUT:** You are an image generation engine. Do NOT reply with conversational text like "Here is the image" or "Sure". Return ONLY the generated image data.
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

export const suggestUGCPrompt = async (images: UploadedImage[], profile: AtelierProfile, config: GenerationConfig): Promise<string> => {
  const apiKey = getApiKey(profile);
  const ai = new GoogleGenAI({ apiKey });

  const parts = images.map(img => ({
    inlineData: { data: img.base64, mimeType: img.mimeType }
  }));

  const userSelections = [
    config.environment ? `Cenário: ${getLabel(ENVIRONMENTS, config.environment)}` : '',
    config.character !== 'none' ? `Personagem: ${getLabel(CHARACTERS, config.character)}` : '',
    config.style ? `Estilo Visual: ${getLabel(STYLES, config.style)}` : '',
    config.lighting ? `Iluminação: ${getLabel(LIGHTING, config.lighting)}` : '',
  ].filter(Boolean).join(', ');

  const prompt = `Analise as imagens deste produto para a marca "${profile.name}".
  Descrição da marca: ${profile.description}
  
  O usuário já selecionou os seguintes parâmetros: ${userSelections || 'Nenhum parâmetro selecionado ainda'}.
  
  Sua tarefa é sugerir um PROMPT ADICIONAL criativo (máximo 2 frases) que complemente essas escolhas e detalhe a cena de forma ultra-realista e atraente para redes sociais (UGC).
  
  Foque em detalhes que as opções de menu não cobrem:
  - Detalhes sensoriais específicos (ex: gotas de água, textura do tecido, reflexos).
  - Ação ou momento exato (ex: sendo segurado, pousado em uma mesa de café, luz atravessando a janela).
  - Se houver personagem, descreva brevemente a interação.
  
  Responda APENAS o texto do prompt sugerido em Português, sem introduções ou aspas.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...parts, { text: prompt }] },
    });
    return response.text?.trim() || "Focar na textura e na iluminação natural do produto em um cenário lifestyle.";
  } catch (error) {
    console.error("Suggest Prompt Error:", error);
    return "Focar nos detalhes artesanais do produto em um ambiente acolhedor.";
  }
};

export const generateCaptions = async (config: GenerationConfig, profile: AtelierProfile): Promise<string[]> => {
  const apiKey = getApiKey(profile);
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
  const apiKey = getApiKey(profile);
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

  promptText += `\n\nACTION: Create the photo now. DO NOT generate text descriptions, ONLY the image.`;

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
             // If we got text instead of image, allow retry by throwing specific error
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
  instruction: string,
  profile: AtelierProfile
): Promise<string> => {
  const apiKey = getApiKey(profile);
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
          { text: `INSTRUCTION: ${instruction}. Keep it realistic and high quality. Output ONLY the image.` }
        ],
      },
      config: {
        systemInstruction: `You are a professional photo editor for "${profile.name}". Edit the image as requested while maintaining the product's integrity. DO NOT Output text.`,
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
  const apiKey = getApiKey(profile);
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

    // IMPORTANT: Use the resolved apiKey for fetching the video
    const response = await fetch(`${videoUri}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Veo Video Error:", error);
    
    // Check for 404 Not Found in various formats to trigger key selection logic
    const errorString = error.message || error.toString();
    const isNotFound = 
        errorString.includes("404") || 
        errorString.includes("NOT_FOUND") || 
        errorString.includes("Requested entity was not found") ||
        (error.status === 404);

    if (isNotFound) {
        throw new Error("VEO_KEY_ERROR");
    }
    
    throw new Error("Falha ao gerar o vídeo. Verifique se sua chave de API suporta o modelo Veo.");
  }
}

export const generateSpeech = async (
  text: string, 
  profile: AtelierProfile
): Promise<string> => {
  const apiKey = getApiKey(profile);
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: text,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' } // Using Aoede for a pleasant narrator voice
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data generated.");
    }

    // Convert Base64 string to Uint8Array
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert Raw PCM (Gemini Default is 24kHz) to WAV Blob
    const wavBlob = pcmToWav(bytes, 24000);
    
    return URL.createObjectURL(wavBlob);

  } catch (error: any) {
    console.error("TTS Error:", error);
    throw new Error(error.message || "Failed to generate speech.");
  }
};