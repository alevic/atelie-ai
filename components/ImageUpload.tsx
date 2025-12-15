import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { UploadedImage } from '../types';
import { fileToBase64, generateId } from '../utils/fileUtils';

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  label?: string;
  maxFiles?: number;
  compact?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  images, 
  onImagesChange, 
  label = "Imagens do Produto", 
  maxFiles = 10,
  compact = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: UploadedImage[] = [];
      
      // Calculate how many we can add
      const remainingSlots = maxFiles - images.length;
      const filesToProcess = (Array.from(e.target.files) as File[]).slice(0, remainingSlots);

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        try {
          const base64 = await fileToBase64(file);
          newImages.push({
            id: generateId(),
            file,
            previewUrl: URL.createObjectURL(file),
            base64,
            mimeType: file.type
          });
        } catch (err) {
          console.error("Error processing file", file.name, err);
        }
      }

      onImagesChange([...images, ...newImages]);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  const isFull = images.length >= maxFiles;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-500">{images.length}/{maxFiles}</span>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
        {images.map((img) => (
          <div key={img.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <img 
              src={img.previewUrl} 
              alt="Upload preview" 
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removeImage(img.id)}
              className="absolute top-1 right-1 p-1 bg-white/90 text-red-600 rounded-full shadow-sm hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!isFull && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer text-gray-500 hover:text-indigo-600 bg-white"
          >
            <Upload className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} mb-1`} />
            <span className="text-[10px] uppercase font-bold tracking-wide">Add</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        multiple={maxFiles > 1}
      />
    </div>
  );
};