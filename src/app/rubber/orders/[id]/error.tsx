"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";

export default function RubberOrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("🔴 Rubber Order Detail Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 px-6 text-center">
      <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-6">
        <Icons.AlertCircle size={40} />
      </div>
      
      <h1 className="text-xl font-black text-slate-900 mb-2">เกิดข้อผิดพลาด</h1>
      <p className="text-sm text-slate-500 font-bold mb-4">
        หน้ารายละเอียดงานไม่สามารถโหลดได้
      </p>

      {/* Show actual error for debugging */}
      <div className="w-full max-w-sm bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-left">
        <p className="text-[10px] font-black text-rose-400 uppercase mb-1">ERROR MESSAGE:</p>
        <p className="text-xs font-mono text-rose-700 break-all">{error?.message || "Unknown error"}</p>
        {error?.digest && (
          <p className="text-[10px] font-mono text-rose-400 mt-2">Digest: {error.digest}</p>
        )}
        
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 text-[10px] font-black text-rose-500 uppercase underline"
        >
          {showDetails ? "ซ่อน Stack Trace" : "แสดง Stack Trace"}
        </button>
        
        {showDetails && (
          <pre className="mt-2 text-[9px] text-rose-600 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto bg-rose-100 p-2 rounded">
            {error?.stack || "No stack trace available"}
          </pre>
        )}
      </div>

      <div className="w-full max-w-[200px] space-y-3">
        <Button 
          fullWidth 
          onClick={() => reset()}
          className="bg-primary text-white py-4 rounded-xl font-black uppercase"
        >
          ลองใหม่อีกครั้ง
        </Button>
        <button 
          onClick={() => window.location.href = "/rubber"}
          className="w-full py-3 text-slate-400 text-xs font-black uppercase"
        >
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}
