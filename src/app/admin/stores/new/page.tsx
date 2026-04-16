"use client";

import { useTranslation } from "@/components/providers/LanguageProvider";
import StoreForm from "@/components/admin/StoreForm";

export default function NewStorePage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10 px-4 md:px-0">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('admin.stores.new.title')}</h1>
        <p className="text-slate-500 font-medium mt-2">{t('admin.stores.new.subtitle')}</p>
      </header>
      
      <StoreForm />
    </div>
  );
}
