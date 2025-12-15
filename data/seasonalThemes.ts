import { Calendar, Heart, Gift, Sun, Snowflake, PartyPopper, Rabbit } from 'lucide-react';
import { GenerationConfig } from '../types';

export interface SeasonalTheme {
  id: string;
  name: string;
  Icon: any;
  description: string;
  startMonth: number; // 0-11 (Jan is 0)
  startDay: number;
  endMonth: number;
  endDay: number;
  config: Partial<GenerationConfig>;
}

// Helper to check if date is in range (handles year wrap for xmas)
const isDateInRange = (date: Date, theme: SeasonalTheme) => {
  const currentMonth = date.getMonth();
  const currentDay = date.getDate();

  // Simple check for same-year ranges
  if (theme.startMonth <= theme.endMonth) {
    if (currentMonth < theme.startMonth || currentMonth > theme.endMonth) return false;
    if (currentMonth === theme.startMonth && currentDay < theme.startDay) return false;
    if (currentMonth === theme.endMonth && currentDay > theme.endDay) return false;
    return true;
  }
  // Wrap around year (e.g. Dec to Jan)
  return (
    (currentMonth > theme.startMonth || (currentMonth === theme.startMonth && currentDay >= theme.startDay)) ||
    (currentMonth < theme.endMonth || (currentMonth === theme.endMonth && currentDay <= theme.endDay))
  );
};

export const SEASONAL_THEMES: SeasonalTheme[] = [
  {
    id: 'carnaval',
    name: 'Carnaval',
    Icon: PartyPopper,
    description: 'Crie peças coloridas e vibrantes para a folia!',
    startMonth: 0, startDay: 15, // Mid Jan
    endMonth: 1, endDay: 28, // End Feb
    config: {
      environment: 'outdoor_park',
      lighting: 'natural',
      style: 'social_media',
      customPrompt: 'Atmosfera de carnaval, confetes coloridos voando, fitas brilhantes, cores vibrantes, alegria, verão brasileiro.'
    }
  },
  {
    id: 'pascoa',
    name: 'Páscoa',
    Icon: Rabbit,
    description: 'Tons pastéis e coelhinhos para encantar.',
    startMonth: 2, startDay: 1, // March
    endMonth: 3, endDay: 15, // Mid April
    config: {
      environment: 'living_room',
      lighting: 'studio_soft',
      style: 'studio_product',
      customPrompt: 'Decoração de Páscoa, ovos de chocolate artesanais ao fundo, coelhinhos de pelúcia, flores de primavera, tons pastéis suaves (rosa, azul bebê, amarelo).'
    }
  },
  {
    id: 'dia_maes',
    name: 'Dia das Mães',
    Icon: Heart,
    description: 'A data mais importante do ano! Amor e carinho.',
    startMonth: 3, startDay: 16, // Mid April
    endMonth: 4, endDay: 15, // Mid May
    config: {
      environment: 'living_room',
      lighting: 'natural',
      style: 'social_media',
      customPrompt: 'Cenário emocionante de Dia das Mães, buquê de rosas cor de rosa, cartão de presente, café da manhã na cama, iluminação suave e acolhedora, sentimento de amor familiar.'
    }
  },
  {
    id: 'festas_juninas',
    name: 'Festa Junina',
    Icon: PartyPopper,
    description: 'Hora do Xadrez! Bandeirinhas e clima rústico.',
    startMonth: 4, startDay: 16, // Late May
    endMonth: 6, endDay: 30, // End June
    config: {
      environment: 'outdoor_park',
      lighting: 'golden_hour',
      style: 'vintage',
      customPrompt: 'Festa Junina tradicional, bandeirinhas coloridas penduradas, fogueira ao fundo (desfocada), tecido de chita, chapéu de palha, clima rústico e acolhedor de fazenda.'
    }
  },
  {
    id: 'dia_pais',
    name: 'Dia dos Pais',
    Icon: Gift,
    description: 'Estilo sóbrio e elegante para eles.',
    startMonth: 7, startDay: 1, // Aug
    endMonth: 7, endDay: 15, // Mid Aug
    config: {
      environment: 'studio_minimal',
      lighting: 'moody',
      style: 'editorial',
      customPrompt: 'Dia dos Pais, elementos em couro e madeira, ferramentas vintage decorativas, paleta de cores azul marinho e marrom, sofisticado.'
    }
  },
  {
    id: 'natal',
    name: 'Natal',
    Icon: Snowflake,
    description: 'A magia do Natal nas suas fotos.',
    startMonth: 10, startDay: 1, // Nov
    endMonth: 11, endDay: 26, // Dec
    config: {
      environment: 'living_room',
      lighting: 'studio_soft',
      style: 'cinematic',
      customPrompt: 'Decoração de Natal clássica e luxuosa, árvore de natal iluminada ao fundo, luzes pisca-pisca (bokeh), presentes embrulhados em vermelho e dourado, neve artificial na janela, clima mágico.'
    }
  }
];

export const getCurrentSeason = (): SeasonalTheme => {
  const today = new Date();
  
  // Find specific holiday match
  const match = SEASONAL_THEMES.find(theme => isDateInRange(today, theme));
  
  if (match) return match;

  // Default fallback if no holiday matches (Generic Season)
  return {
    id: 'default',
    name: 'Coleção Atual',
    Icon: Sun,
    description: 'Destaque seus produtos com luz natural.',
    startMonth: 0, startDay: 0, endMonth: 0, endDay: 0,
    config: {
      environment: 'studio_minimal',
      lighting: 'natural',
      style: 'social_media',
      customPrompt: 'Fundo clean e organizado, planta verde decorativa no canto, luz da manhã suave, foco total no produto.'
    }
  };
};