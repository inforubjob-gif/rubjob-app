"use client";

import { useTranslation } from "@/components/providers/LanguageProvider";
import RubberForm from "@/components/admin/RubberForm";

export default function NewRubberPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10 px-4 md:px-0">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('admin.rubbers.new.title')}</h1>
        <p className="text-slate-500 font-medium mt-2">{t('admin.rubbers.new.subtitle')}</p>
      </header>
      
      <RubberForm />
    </div>
  );
}
