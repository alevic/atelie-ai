import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Download, 
  Wand2, 
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Palette,
  Video,
  Play,
  Scissors,
  Settings,
  Camera,
  Mic,
  Lightbulb
} from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { SelectInput } from './components/SelectInput';
import { Button } from './components/Button';
import { SeasonalWidget } from './components/SeasonalWidget';
import { SettingsModal } from './components/SettingsModal';
import { ENVIRONMENTS, CHARACTERS, STYLES, LIGHTING, VIDEO_STYLES, GenerationConfig, UploadedImage, AtelierProfile } from './types';
import { generateUGCImage, generateCaptions, generateVideo, refineImage, generateSpeech, suggestUGCPrompt } from './services/geminiService';
import { getCurrentSeason } from './data/seasonalThemes';

// Default profile
const DEFAULT_PROFILE: AtelierProfile = {
  name: "Glorinha Ateliê",
  description: "O ateliê é comandado por Mãe e Filha. Elas trabalham juntas há mais de 40 anos. O tom de voz deve ser: Acolhedor, familiar, afetivo, enfatizando o 'feito à mão' (handmade), a tradição e o amor envolvido em cada peça."
};

function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [styleImage, setStyleImage] = useState<UploadedImage[]>([]);
  const [patternImage, setPatternImage] = useState<UploadedImage[]>([]);
  
  const [config, setConfig] = useState<GenerationConfig>({
    environment: '',
    character: 'none',
    characterStyle: '',
    lighting: '',
    style: 'social_media', // Default to Social Media for UGC
    videoStyle: 'handheld', // Default video style
    speechText: '', // TTS text
    customPrompt: ''
  });

  // Profile State with LocalStorage persistence
  const [profile, setProfile] = useState<AtelierProfile>(() => {
    const saved = localStorage.getItem('atelierProfile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
  const [autoGenerateVideo, setAutoGenerateVideo] = useState(false);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  
  const [captions, setCaptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentSeason = getCurrentSeason();

  // Save profile changes
  const handleSaveProfile = (newProfile: AtelierProfile) => {
    setProfile(newProfile);
    localStorage.setItem('atelierProfile', JSON.stringify(newProfile));
  };

  const handleConfigChange = (field: keyof GenerationConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const applySeasonalTheme = (themeConfig: Partial<GenerationConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...themeConfig
    }));
  };

  const handleSuggestPrompt = async () => {
    if (images.length === 0) {
      setError("Faça upload de uma foto do produto para que a IA possa sugerir um prompt.");
      return;
    }

    setIsSuggestingPrompt(true);
    setError(null);
    try {
      // Pass both images, profile AND current config for context-aware suggestion
      const suggested = await suggestUGCPrompt(images, profile, config);
      handleConfigChange('customPrompt', suggested);
    } catch (err: any) {
      setError("Não foi possível sugerir um prompt agora.");
    } finally {
      setIsSuggestingPrompt(false);
    }
  };

  // Refactored to accept an optional image source for auto-generation flow
  const handleGenerateVideo = async (imageSource?: string) => {
    const src = imageSource || generatedImage;
    if (!src) return;

    setIsGeneratingVideo(true);
    setVideoError(null);
    setGeneratedVideo(null);
    setGeneratedAudio(null);

    try {
       // Combine visual style with video movement style for the prompt
       const promptContext = `Motion Style: ${config.videoStyle.replace('_', ' ')}. Visual aesthetic: ${config.style} in ${config.environment}.`;
       
       // Run video and speech generation in parallel if text is provided
       const promises: Promise<any>[] = [
           generateVideo(src, promptContext, profile)
       ];

       if (config.speechText.trim()) {
           promises.push(generateSpeech(config.speechText, profile));
       }

       const results = await Promise.all(promises);
       setGeneratedVideo(results[0]);
       
       if (results[1]) {
           setGeneratedAudio(results[1]);
       }

    } catch (err: any) {
      if (err.message === "VEO_KEY_ERROR") {
         // Handle AI Studio / IDX Environment Key Selection
         if (window.aistudio) {
             setVideoError("Selecionando projeto pago...");
             try {
                await window.aistudio.openSelectKey();
                // Retry immediately after selection
                const promptContext = `Motion Style: ${config.videoStyle.replace('_', ' ')}. Visual aesthetic: ${config.style} in ${config.environment}.`;
                // Retry logic same as above
                 const promises: Promise<any>[] = [
                    generateVideo(src, promptContext, profile)
                ];
                if (config.speechText.trim()) {
                    promises.push(generateSpeech(config.speechText, profile));
                }
                const results = await Promise.all(promises);
                setGeneratedVideo(results[0]);
                if (results[1]) setGeneratedAudio(results[1]);
                setVideoError(null);
             } catch (retryError) {
                console.error(retryError);
                setVideoError("Não foi possível gerar o vídeo. Certifique-se de selecionar um projeto com faturamento ativado.");
             }
         } else {
             setVideoError("A chave configurada não tem permissão para gerar vídeos (Veo). Por favor, use uma chave de um projeto pago no menu de configurações.");
             setIsSettingsOpen(true);
         }
      } else {
         setVideoError(err.message || "Erro ao criar vídeo.");
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError("Por favor, faça upload de pelo menos uma imagem do produto.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setVideoError(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setGeneratedAudio(null);
    setCaptions([]);
    setCopiedIndex(null);
    setRefinePrompt("");

    // Prepare full config with style image and pattern image
    const fullConfig: GenerationConfig = {
      ...config,
      styleReference: styleImage.length > 0 ? styleImage[0] : null,
      patternReference: patternImage.length > 0 ? patternImage[0] : null
    };

    try {
      // Execute both requests in parallel to save time
      const [imageResult, captionsResult] = await Promise.all([
        generateUGCImage(images, fullConfig, profile),
        generateCaptions(fullConfig, profile)
      ]);

      setGeneratedImage(imageResult);
      setCaptions(captionsResult);

      // Auto-generate video if checkbox is checked
      if (autoGenerateVideo && imageResult) {
        handleGenerateVideo(imageResult);
      }

    } catch (err: any) {
      if (err.message?.includes("API Key")) {
         setIsSettingsOpen(true);
      }
      setError(err.message || "Ocorreu um erro ao gerar a imagem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedImage || !refinePrompt.trim()) return;
    
    setIsRefining(true);
    setError(null);
    
    try {
      const newImage = await refineImage(generatedImage, refinePrompt, profile);
      setGeneratedImage(newImage);
      setRefinePrompt(""); // clear input after success
    } catch (err: any) {
      setError(err.message || "Erro ao editar imagem.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `${profile.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Sync video play/pause with audio
  const onVideoPlay = () => {
    if (audioRef.current && generatedAudio) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const onVideoPause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        initialProfile={profile}
        onSave={handleSaveProfile}
      />

      {/* Left Sidebar - Controls */}
      <aside className="w-full md:w-[450px] bg-white border-r border-gray-200 overflow-y-auto h-auto md:h-screen shadow-lg z-10 flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-rose-500 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{profile.name} AI</h1>
            </div>
            <p className="text-sm text-gray-500">UGC Creator: Imagens & Vídeos Reais.</p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Configurações do Ateliê"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-8">
          
          {/* Section: Seasonal Suggestion */}
          <SeasonalWidget 
            theme={currentSeason} 
            onApply={applySeasonalTheme} 
          />

          {/* Section 1: Upload */}
          <section>
            <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> 1. Produto Original
            </h2>
            <ImageUpload images={images} onImagesChange={setImages} />
          </section>

          <hr className="border-gray-100" />
          
          <div className="grid grid-cols-2 gap-4">
             {/* Section 2: Pattern Swap */}
             <section>
              <h2 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 flex items-center gap-2">
                <Scissors className="w-3 h-3" /> 2. Estampa (Opcional)
              </h2>
              <ImageUpload 
                images={patternImage} 
                onImagesChange={setPatternImage} 
                label=""
                maxFiles={1}
                compact
              />
            </section>

             {/* Section 3: Moodboard */}
             <section>
              <h2 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 flex items-center gap-2">
                <Palette className="w-3 h-3" /> 3. Referência (Opcional)
              </h2>
              <ImageUpload 
                images={styleImage} 
                onImagesChange={setStyleImage} 
                label=""
                maxFiles={1}
                compact
              />
            </section>
          </div>

          <hr className="border-gray-100" />

          {/* Section 4: Configuration */}
          <section className="space-y-4">
            <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-4 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> 4. Personalização UGC
            </h2>
            
            <SelectInput 
              label="Ambiente / Cenário" 
              options={ENVIRONMENTS}
              value={config.environment}
              onChange={(e) => handleConfigChange('environment', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
               <SelectInput 
                label="Personagem" 
                options={CHARACTERS}
                value={config.character}
                onChange={(e) => handleConfigChange('character', e.target.value)}
              />
              <SelectInput 
                label="Estilo (Vibe)" 
                options={STYLES}
                value={config.style}
                onChange={(e) => handleConfigChange('style', e.target.value)}
              />
            </div>

            <SelectInput 
              label="Iluminação & Clima" 
              options={LIGHTING}
              value={config.lighting}
              onChange={(e) => handleConfigChange('lighting', e.target.value)}
            />

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Instruções Adicionais (Prompt)
                </label>
                <button
                  onClick={handleSuggestPrompt}
                  disabled={isSuggestingPrompt || images.length === 0}
                  className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 transition-colors"
                >
                  {isSuggestingPrompt ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                  {isSuggestingPrompt ? "Analisando..." : "Sugerir com IA"}
                </button>
              </div>
              <textarea
                rows={3}
                className="block w-full rounded-lg border-gray-300 border bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 resize-none"
                placeholder="Ex: Focar na textura, mostrar em uso, ângulo de cima..."
                value={config.customPrompt}
                onChange={(e) => handleConfigChange('customPrompt', e.target.value)}
              />
            </div>
          </section>

           {/* Section 5: Video Settings */}
           <section className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-4">
             <h2 className="text-sm uppercase tracking-wide text-purple-800 font-semibold mb-3 flex items-center gap-2">
                <Video className="w-4 h-4" /> 5. Configuração de Vídeo (Reels)
              </h2>
              
              <SelectInput 
                label="Estilo de Movimento (Câmera)" 
                options={VIDEO_STYLES}
                value={config.videoStyle}
                onChange={(e) => handleConfigChange('videoStyle', e.target.value)}
                className="bg-white"
              />

              <div>
                <label className="block text-sm font-medium text-purple-900 mb-1 flex items-center gap-2">
                  <Mic className="w-3 h-3" />
                  Roteiro de Narração (Opcional)
                </label>
                <textarea
                  rows={2}
                  className="block w-full rounded-lg border-purple-200 border bg-white text-gray-900 focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-2.5 resize-none placeholder-purple-300"
                  placeholder="Escreva o texto que será falado no vídeo (TTS)..."
                  value={config.speechText}
                  onChange={(e) => handleConfigChange('speechText', e.target.value)}
                />
              </div>

               <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAutoGenerateVideo(!autoGenerateVideo)}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoGenerateVideo ? 'bg-purple-600 border-purple-600' : 'bg-white border-purple-200'}`}>
                  {autoGenerateVideo && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <label className="text-sm text-purple-900 cursor-pointer select-none">
                  Gerar vídeo automaticamente após a imagem
                </label>
              </div>
           </section>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-20">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button 
            onClick={handleGenerate} 
            isLoading={isGenerating} 
            fullWidth 
            className="h-12 text-base shadow-lg shadow-indigo-200 bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
          >
            {isGenerating ? 'Criar UGC com IA' : 'Criar Imagem & Legendas'}
          </Button>
        </div>
      </aside>

      {/* Right Content - Preview */}
      <main className="flex-1 bg-slate-100 p-6 md:p-12 min-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Image Result */}
          {generatedImage ? (
            <div className="bg-white p-4 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Resultado UGC</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setGeneratedImage(null); setGeneratedVideo(null); setGeneratedAudio(null); setCaptions([]); }} title="Limpar">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleDownload} className="bg-gray-800 hover:bg-gray-900 text-white">
                    <Download className="w-4 h-4 mr-2" /> Salvar
                  </Button>
                </div>
              </div>
              <div className="relative rounded-lg overflow-hidden bg-checkerboard aspect-auto bg-gray-50 flex flex-col md:flex-row gap-4">
                {/* Image */}
                <div className={`relative ${generatedVideo || isGeneratingVideo || autoGenerateVideo ? 'w-full md:w-1/2' : 'w-full'} transition-all duration-500`}>
                   <img 
                    src={generatedImage} 
                    alt="Generated UGC" 
                    className="w-full h-auto object-contain max-h-[70vh] rounded-lg shadow-sm" 
                  />
                  {!generatedVideo && !isGeneratingVideo && !autoGenerateVideo && (
                    <div className="absolute bottom-4 right-4">
                        <Button 
                          onClick={() => handleGenerateVideo()} 
                          className="bg-purple-600 hover:bg-purple-700 text-white shadow-xl flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Animar ({VIDEO_STYLES.find(v => v.value === config.videoStyle)?.label.split(' ')[0]})
                        </Button>
                    </div>
                  )}
                  {isGeneratingVideo && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                      <div className="bg-white p-4 rounded-full shadow-lg mb-3">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                      <span className="font-semibold text-purple-800">Criando vídeo Veo...</span>
                      <span className="text-xs text-purple-600 mt-1">Estilo: {VIDEO_STYLES.find(v => v.value === config.videoStyle)?.label}</span>
                    </div>
                  )}
                </div>

                {/* Video Result */}
                {(generatedVideo || isGeneratingVideo) && (
                  <div className="w-full md:w-1/2 flex flex-col animate-in slide-in-from-right duration-500">
                     {generatedVideo ? (
                       <>
                         <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] shadow-lg group border-4 border-gray-900">
                            <video 
                              ref={videoRef}
                              src={generatedVideo} 
                              controls 
                              autoPlay 
                              loop 
                              className="w-full h-full object-cover"
                              onPlay={onVideoPlay}
                              onPause={onVideoPause}
                            />
                             <div className="absolute top-4 left-4 bg-purple-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-md flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI Video (Veo)
                            </div>
                            {generatedAudio && (
                                <div className="absolute top-4 right-4 bg-rose-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-md flex items-center gap-1">
                                  <Mic className="w-3 h-3" />
                                  Narração Ativa
                                </div>
                            )}
                         </div>
                         {generatedAudio && (
                             <audio ref={audioRef} src={generatedAudio} className="hidden" />
                         )}
                         <div className="mt-4 text-center">
                            <a 
                              href={generatedVideo} 
                              download={`${profile.name.replace(/\s+/g, '-').toLowerCase()}-video.mp4`}
                              className="inline-flex items-center text-sm font-medium text-purple-700 hover:text-purple-900"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Baixar Vídeo MP4
                            </a>
                         </div>
                       </>
                     ) : (
                       <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3"></div>
                          <p className="text-sm text-gray-500 font-medium">Renderizando vídeo...</p>
                       </div>
                     )}
                  </div>
                )}
              </div>
              
              {/* Magic Edit Section */}
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" /> Edição Mágica (Refino)
                </h4>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="O que deseja mudar? (Ex: Trocar fundo, melhorar luz...)"
                    className="flex-1 rounded-lg border-gray-300 border text-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  />
                  <Button onClick={handleRefine} isLoading={isRefining} variant="primary" disabled={!refinePrompt.trim()}>
                    Ajustar
                  </Button>
                </div>
              </div>

              {videoError && (
                 <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{videoError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 opacity-50">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">Estúdio de Criação UGC</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Faça upload do seu produto, escolha um estilo e gere fotos e vídeos prontos para postar no Instagram e TikTok.
              </p>
            </div>
          )}

          {/* Captions Result */}
          {captions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-150">
              <div className="p-6 border-b border-gray-100 bg-rose-50">
                <h3 className="font-semibold text-rose-900 flex items-center gap-2">
                  <span className="text-xl">✍️</span> Legendas para Social Media
                </h3>
              </div>
              <div className="p-6 grid gap-4">
                {captions.map((caption, idx) => (
                  <div key={idx} className="group relative bg-slate-50 p-4 rounded-xl border border-gray-200 hover:border-rose-200 transition-colors">
                    <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed pr-8">
                      {caption}
                    </p>
                    <button
                      onClick={() => copyToClipboard(caption, idx)}
                      className="absolute top-3 right-3 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Copiar legenda"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;