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
      const currentLang = language || "th";
      
      // Look up helper
      const lookup = (lang: string) => {
        let current: any = (translations as any)[lang];
        if (!current) return null;
        
        for (const key of keys) {
          if (current[key] === undefined) return null;
          current = current[key];
        }
        return typeof current === 'string' ? current : null;
      };

      // 1. Try exact language
      let result = lookup(currentLang);
      if (result) return result;

      // 2. Try base language (e.g. 'en' from 'en-US')
      const baseLang = currentLang.split("-")[0];
      if (baseLang !== currentLang) {
        result = lookup(baseLang);
        if (result) return result;
      }

      // 3. Ultimate fallback to 'th'
      if (currentLang !== "th") {
        result = lookup("th");
        if (result) return result;
      }

      // 4. Fallback to English just in case Thai is missing
      if (currentLang !== "en" && baseLang !== "en") {
        result = lookup("en");
        if (result) return result;
      }

      console.warn(`Translation path not found: ${path} (Lang: ${currentLang})`);
      return path;
    } catch (err) {
      console.error("Critical translation error:", err);
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
