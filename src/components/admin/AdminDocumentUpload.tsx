"use client";

import { useState, useRef } from "react";
import { Icons } from "@/components/ui/Icons";

interface AdminDocumentUploadProps {
  value?: string; // Current URL or Base64
  onChange: (value: string) => void;
  label: string;
  variant?: 'video' | 'square';
}

export default function AdminDocumentUpload({ value, onChange, label, variant = 'video' }: AdminDocumentUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      // 1. Convert to Base64 and Compress
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Use high compression to stay under D1 limits
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);
          setPreview(compressedDataUrl);
          onChange(compressedDataUrl);
          setIsCompressing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Compression failed", err);
      setIsCompressing(false);
    }
  };

  // If the value is a UUID/Internal ID, use the proxy URL
  const displayUrl = preview?.startsWith("data:") 
    ? preview 
    : preview?.startsWith("http") 
      ? preview 
      : preview ? `/api/admin/documents/${preview}` : null;

  return (
    <div className="space-y-3">
      <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 ml-1">{label}</label>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${
          variant === 'square' ? 'aspect-square' : 'aspect-video'
        } ${
          displayUrl ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
        }`}
      >
        {displayUrl ? (
          <>
            <img src={displayUrl} alt="Document Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
               <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 text-white font-black text-[10px] uppercase">
                 Replace Document
               </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
               <Icons.Camera size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isCompressing ? "Compressing..." : "Upload Photo"}
            </p>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>
      
      {displayUrl && !displayUrl.startsWith("data:") && (
        <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-tight flex items-center gap-1">
          <Icons.Shield size={10} /> Securely stored & protected
        </p>
      )}
    </div>
  );
}
