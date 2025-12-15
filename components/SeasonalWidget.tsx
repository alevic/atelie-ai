import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SeasonalTheme } from '../data/seasonalThemes';

interface SeasonalWidgetProps {
  theme: SeasonalTheme;
  onApply: (config: any) => void;
}

export const SeasonalWidget: React.FC<SeasonalWidgetProps> = ({ theme, onApply }) => {
  const Icon = theme.Icon;

  return (
    <div className="bg-gradient-to-r from-rose-50 to-indigo-50 border border-indigo-100 rounded-xl p-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-white/50 w-16 h-16 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 text-indigo-900 font-semibold text-sm uppercase tracking-wider">
          <Icon className="w-4 h-4 text-rose-500" />
          <span>Sugestão do Dia</span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mb-1">{theme.name}</h3>
        <p className="text-sm text-gray-600 mb-3 leading-snug">
          {theme.description}
        </p>

        <button 
          onClick={() => onApply(theme.config)}
          className="text-xs font-semibold bg-white text-indigo-600 px-3 py-2 rounded-lg shadow-sm border border-indigo-100 flex items-center gap-1 hover:bg-indigo-50 hover:scale-105 transition-all w-full justify-center"
        >
          <Sparkles className="w-3 h-3" />
          Aplicar Tema
        </button>
      </div>
    </div>
  );
};