import React, { useState, useEffect } from 'react';
import { X, Save, Store, FileText, Key } from 'lucide-react';
import { Button } from './Button';
import { AtelierProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile: AtelierProfile;
  onSave: (profile: AtelierProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  initialProfile, 
  onSave 
}) => {
  const [profile, setProfile] = useState<AtelierProfile>(initialProfile);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            Configurações do Ateliê
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Nome da Marca / Ateliê
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="block w-full rounded-lg border-gray-300 border bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5"
              placeholder="Ex: Glorinha Ateliê"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Descrição & Tom de Voz
            </label>
            <textarea
              required
              rows={3}
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              className="block w-full rounded-lg border-gray-300 border bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 resize-none"
              placeholder="Descreva a história da marca e como ela se comunica. Ex: Ateliê tradicional focado em 'feito à mão', tom acolhedor e familiar..."
            />
            <p className="text-xs text-gray-500 mt-1">Essa descrição será usada pela IA para criar legendas e ajustar o estilo.</p>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-500" />
              Veo API Key (Opcional)
            </label>
            <input
              type="password"
              value={profile.veoApiKey || ''}
              onChange={(e) => setProfile({ ...profile, veoApiKey: e.target.value })}
              className="block w-full rounded-lg border-gray-300 border bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5"
              placeholder="Chave específica para geração de vídeo..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco para usar a chave padrão. Use apenas se a chave principal não tiver acesso ao modelo Veo.
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};