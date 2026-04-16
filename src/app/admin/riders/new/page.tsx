"use client";

import { useLanguage } from "@/lib/contexts/LanguageContext";
import RiderForm from "@/components/admin/RiderForm";

export default function NewRiderPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10 px-4 md:px-0">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('admin.riders.new.title')}</h1>
        <p className="text-slate-500 font-medium mt-2">{t('admin.riders.new.subtitle')}</p>
      </header>
      
      <RiderForm />
    </div>
  );
}
