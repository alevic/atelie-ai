export interface GenerationConfig {
  environment: string;
  character: string;
  characterStyle: string;
  lighting: string;
  style: string;
  customPrompt: string;
  styleReference?: UploadedImage | null;
  patternReference?: UploadedImage | null;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export const ENVIRONMENTS = [
  { value: 'living_room', label: 'Sala de Estar Aconchegante' },
  { value: 'kitchen', label: 'Cozinha Moderna' },
  { value: 'outdoor_park', label: 'Parque ao Ar Livre' },
  { value: 'studio_minimal', label: 'Estúdio Minimalista' },
  { value: 'beach', label: 'Praia Ensolarada' },
  { value: 'urban_street', label: 'Rua Urbana' },
  { value: 'luxury_bedroom', label: 'Quarto de Luxo' },
  { value: 'gym', label: 'Academia' },
  { value: 'garden', label: 'Jardim Florido' },
];

export const CHARACTERS = [
  { value: 'none', label: 'Apenas o Produto' },
  { value: 'woman', label: 'Mulher' },
  { value: 'man', label: 'Homem' },
  { value: 'child', label: 'Criança' },
  { value: 'dog', label: 'Cachorro' },
  { value: 'cat', label: 'Gato' },
  { value: 'hand_model', label: 'Mãos (Segurando o produto)' },
];

export const STYLES = [
  { value: 'hyper_realistic', label: 'Hiper Realista (Foto)' },
  { value: 'social_media', label: 'Estilo Instagram/TikTok' },
  { value: 'cinematic', label: 'Cinematográfico' },
  { value: 'vintage', label: 'Vintage / Retrô' },
  { value: 'studio_product', label: 'Fotografia de Produto (Clean)' },
  { value: 'editorial', label: 'Editorial de Moda' },
  { value: 'studio_clean', label: '✨ Estúdio Mágico (Fundo Branco/Limpo)' },
];

export const LIGHTING = [
  { value: 'natural', label: 'Luz Natural' },
  { value: 'golden_hour', label: 'Golden Hour (Pôr do sol)' },
  { value: 'studio_soft', label: 'Estúdio Suave' },
  { value: 'neon', label: 'Neon / Cyberpunk' },
  { value: 'moody', label: 'Dramático / Escuro' },
];