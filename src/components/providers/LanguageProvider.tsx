"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("th");

  // Load saved preference if any
  useEffect(() => {
    const saved = localStorage.getItem("rubjob_lang") as Language;
    if (saved && (saved === "th" || saved === "en" || saved === "zh")) {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("rubjob_lang", lang);
  };

  const t = (path: string): string => {
    try {
      const keys = path.split(".");
      
      // Smart Fallback: if language is "en-US", try "en". If not found, use "th" as ultimate fallback.
      const baseLang = language.split("-")[0] as Language;
      const langsToTry = [language, baseLang, "th" as Language];
      
      for (const lang of langsToTry) {
        let current: any = (translations as any)[lang];
        if (!current) continue;
        
        let found = true;
        for (const key of keys) {
          if (!current || current[key] === undefined) {
            found = false;
            break;
          }
          current = current[key];
        }
        
        if (found && typeof current === 'string') {
          return current;
        }
      }
      
      return path;
    } catch (err) {
      console.error("Translation error for path:", path, err);
      return path;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
