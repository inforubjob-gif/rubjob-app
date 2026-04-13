"use client";

export const runtime = "edge";

import { useState, useEffect, use } from "react";
import RiderForm from "@/components/admin/RiderForm";

export default function EditRiderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [riderData, setRiderData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRider();
  }, [id]);

  async function fetchRider() {
    try {
      const res = await fetch("/api/admin/riders");
      const data = await res.json() as any;
      const found = data.riders.find((r: any) => r.id === id);
      if (found) setRiderData(found);
    } catch (err) {
      console.error("Failed to fetch rider", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Fleet Personnel Data...</p>
      </div>
    );
  }

  if (!riderData) {
    return (
      <div className="text-center py-40">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Personnel Not Found</h2>
        <p className="text-slate-500">The rider record you are trying to access does not exist in our directory.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10 flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Fleet Personnel Profiling</h1>
           <p className="text-slate-500 font-medium mt-2">Manage documentation and verification status for <span className="text-slate-900 font-bold">{riderData.name}</span>.</p>
        </div>
        <div className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Fleet ID</span>
           <span className="text-sm font-mono font-black text-slate-900">{riderData.id}</span>
        </div>
      </header>
      
      <RiderForm initialData={riderData} isEdit={true} />
    </div>
  );
}
