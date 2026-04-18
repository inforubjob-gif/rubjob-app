"use client";

export const runtime = "edge";

import { useState, useEffect, use } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";
import StoreForm from "@/components/admin/StoreForm";

export default function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const [storeData, setStoreData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStore();
  }, [id]);

  async function fetchStore() {
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json() as any;
      const found = data.stores.find((s: any) => s.id === id);
      if (found) setStoreData(found);
    } catch (err) {
      console.error("Failed to fetch store", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('common.loading')}</p>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="text-center py-40">
        <h2 className="text-2xl font-black text-slate-900 mb-2">{t('common.notFoundTitle')}</h2>
        <p className="text-slate-500">{t('common.notFoundDesc')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10 flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('admin.stores.edit.title')}</h1>
           <p className="text-slate-500 font-medium mt-2">{t('admin.stores.edit.subtitle')} <span className="text-slate-900 font-bold">{storeData.name}</span>.</p>
        </div>
        <div className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t('admin.settings.refId')}</span>
           <span className="text-sm font-mono font-black text-slate-900">{storeData.id}</span>
        </div>
      </header>
      
      <StoreForm initialData={storeData} isEdit={true} />
    </div>
  );
}
