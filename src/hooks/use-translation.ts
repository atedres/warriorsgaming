'use client';

import { useContext } from 'react';
import { LanguageContext, LanguageContextType } from '@/components/language-provider';
import { translations } from '@/lib/translations';

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key: keyof (typeof translations)['en']) => {
    return translations[language][key] || key;
  };

  return { t, language };
};
