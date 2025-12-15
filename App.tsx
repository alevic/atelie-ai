import React, { useState } from 'react';
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
  Scissors
} from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { SelectInput } from './components/SelectInput';
import { Button } from './components/Button';
import { SeasonalWidget } from './components/SeasonalWidget';
import { ENVIRONMENTS, CHARACTERS, STYLES, LIGHTING, GenerationConfig, UploadedImage } from './types';
import { generateUGCImage, generateCaptions, generateVideo, refineImage } from './services/geminiService';
import { getCurrentSeason } from './data/seasonalThemes';

function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [styleImage, setStyleImage] = useState<UploadedImage[]>([]);
  const [patternImage, setPatternImage] = useState<UploadedImage[]>([]);
  
  const [config, setConfig] = useState<GenerationConfig>({
    environment: '',
    character: 'none',
    characterStyle: '',
    lighting: '',
    style: '',
    customPrompt: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [autoGenerateVideo, setAutoGenerateVideo] = useState(false);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  
  const [captions, setCaptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const currentSeason = getCurrentSeason();

  const handleConfigChange = (field: keyof GenerationConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const applySeasonalTheme = (themeConfig: Partial<GenerationConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...themeConfig
    }));
  };

  // Refactored to accept an optional image source for auto-generation flow
  const handleGenerateVideo = async (imageSource?: string) => {
    const src = imageSource || generatedImage;
    if (!src) return;

    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
       const promptContext = `${config.style} ${config.environment} ${config.lighting}`;
       const videoUrl = await generateVideo(src, promptContext);
       setGeneratedVideo(videoUrl);
    } catch (err: any) {
      setVideoError(err.message || "Erro ao criar vídeo.");
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
        generateUGCImage(images, fullConfig),
        generateCaptions(fullConfig)
      ]);

      setGeneratedImage(imageResult);
      setCaptions(captionsResult);

      // Auto-generate video if checkbox is checked
      if (autoGenerateVideo && imageResult) {
        handleGenerateVideo(imageResult);
      }

    } catch (err: any) {
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
      const newImage = await refineImage(generatedImage, refinePrompt);
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
      link.download = `glorinha-atelie-${Date.now()}.png`;
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left Sidebar - Controls */}
      <aside className="w-full md:w-[450px] bg-white border-r border-gray-200 overflow-y-auto h-auto md:h-screen shadow-lg z-10 flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-rose-500 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Glorinha Ateliê AI</h1>
          </div>
          <p className="text-sm text-gray-500">Criador de conteúdo para redes sociais.</p>
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
              <Wand2 className="w-4 h-4" /> 4. Personalização
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
                label="Estilo da Imagem" 
                options={STYLES}
                value={config.style}
                onChange={(e) => handleConfigChange('style', e.target.value)}
              />
            </div>

            {config.character !== 'none' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estilo do Personagem (Opcional)
                </label>
                <input 
                  type="text" 
                  className="block w-full rounded-lg border-gray-300 border bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5"
                  placeholder="Ex: Jovem moderna, Cabelo cacheado, etc."
                  value={config.characterStyle}
                  onChange={(e) => handleConfigChange('characterStyle', e.target.value)}
                />
              </div>
            )}

            <SelectInput 
              label="Iluminação & Clima" 
              options={LIGHTING}
              value={config.lighting}
              onChange={(e) => handleConfigChange('lighting', e.target.value)}
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instruções Adicionais (Prompt)
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-lg border-gray-300 border bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 resize-none"
                placeholder="Ex: Adicione um filtro retrô, remova objetos do fundo..."
                value={config.customPrompt}
                onChange={(e) => handleConfigChange('customPrompt', e.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-20">
          
          {/* Checkbox for Video Generation */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => setAutoGenerateVideo(!autoGenerateVideo)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoGenerateVideo ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
               {autoGenerateVideo && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <label className="text-sm text-purple-900 font-medium cursor-pointer flex items-center gap-2 select-none">
              <Video className="w-4 h-4 text-purple-700" />
              Gerar Vídeo Automaticamente
            </label>
          </div>

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
            {isGenerating ? 'Criando Mágica...' : 'Criar Imagem & Legendas'}
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
                <h3 className="font-semibold text-gray-800">Resultado Gerado</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setGeneratedImage(null); setGeneratedVideo(null); setCaptions([]); }} title="Limpar">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleDownload} className="bg-gray-800 hover:bg-gray-900 text-white">
                    <Download className="w-4 h-4 mr-2" /> Download
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
                          Animar (Reels)
                        </Button>
                    </div>
                  )}
                  {isGeneratingVideo && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                      <div className="bg-white p-4 rounded-full shadow-lg mb-3">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                      <span className="font-semibold text-purple-800">Criando vídeo com Veo...</span>
                      <span className="text-xs text-purple-600 mt-1">Isso pode levar alguns segundos</span>
                    </div>
                  )}
                </div>

                {/* Video Result */}
                {(generatedVideo || isGeneratingVideo) && (
                  <div className="w-full md:w-1/2 flex flex-col animate-in slide-in-from-right duration-500">
                     {generatedVideo ? (
                       <>
                         <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] shadow-lg group">
                            <video 
                              src={generatedVideo} 
                              controls 
                              autoPlay 
                              loop 
                              className="w-full h-full object-cover"
                            />
                             <div className="absolute top-4 left-4 bg-purple-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-md flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI Video (Veo)
                            </div>
                         </div>
                         <div className="mt-4 text-center">
                            <a 
                              href={generatedVideo} 
                              download="video-glorinha.mp4"
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
                    placeholder="O que deseja mudar na imagem? (Ex: Fundo mais claro, remover sombras, mudar cor...)"
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
                <Sparkles className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">Pronto para criar?</h3>
              <p className="text-gray-500">
                Configure suas preferências, use o Provador Virtual e gere vídeos incríveis!
              </p>
            </div>
          )}

          {/* Captions Result */}
          {captions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-150">
              <div className="p-6 border-b border-gray-100 bg-rose-50">
                <h3 className="font-semibold text-rose-900 flex items-center gap-2">
                  <span className="text-xl">✍️</span> Sugestões de Legenda
                </h3>
                <p className="text-sm text-rose-700 mt-1">
                  Criadas com carinho para o público do Glorinha Ateliê.
                </p>
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