// src/components/LanguageSwitcher.jsx
// Compact EN/हि toggle that:
//  - Shows current language
//  - Persists to localStorage via i18n/index.js changeLanguage()
//  - Applies Hindi font class to body for clean Devanagari rendering
//  - Works inside Header (desktop + mobile)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n/index.js';

/**
 * @param {{ className?: string }} props
 */
const LanguageSwitcher = ({ className = '' }) => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en';

  const toggle = () => {
    const next = currentLang === 'en' ? 'hi' : 'en';
    changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={t('langSwitcher.label')}
      title={t('langSwitcher.label')}
      className={`
        flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold
        transition-all duration-200 select-none
        ${currentLang === 'hi'
          ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
          : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
        }
        ${className}
      `}
    >
      {/* Pill-style dual label */}
      <span
        className={`transition-opacity duration-200 ${currentLang === 'en' ? 'opacity-100' : 'opacity-40'}`}
      >
        EN
      </span>
      <span className="text-slate-400 font-light">|</span>
      <span
        className={`transition-opacity duration-200 font-devanagari ${currentLang === 'hi' ? 'opacity-100' : 'opacity-40'}`}
      >
        हि
      </span>
    </button>
  );
};

export default LanguageSwitcher;
