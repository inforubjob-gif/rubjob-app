"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Icons } from "./Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface PhotoUploadProps {
  onPhotoCapture: (url: string) => void;
  label?: string;
  required?: boolean;
}

export interface PhotoUploadHandle {
  triggerCapture: () => void;
}

const PhotoUpload = forwardRef<PhotoUploadHandle, PhotoUploadProps>(({ onPhotoCapture, label, required }, ref) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useImperativeHandle(ref, () => ({
    triggerCapture: () => {
      fileInputRef.current?.click();
    }
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Compress image using canvas
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          // Resize if too large
          const MAX_WIDTH = 1000;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Output as compressed base64
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setPreview(compressedBase64);
          onPhotoCapture(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase block px-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative aspect-video rounded-xl border-4 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${
          preview ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Verification" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
               <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/30 text-white font-black text-[10px] uppercase">
                 Change Photo
               </div>
            </div>
            <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                <Icons.Check size={20} strokeWidth={4} />
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white rounded-full shadow-xl shadow-slate-200/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
               <Icons.Camera size={32} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase">{t("rider.takePhoto")}</p>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          capture="environment"
          className="hidden" 
        />
      </div>
    </div>
  );
});

PhotoUpload.displayName = "PhotoUpload";

export default PhotoUpload;
