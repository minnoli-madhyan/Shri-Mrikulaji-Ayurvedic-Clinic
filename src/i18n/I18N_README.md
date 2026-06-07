# 🌐 SMAC Bilingual System — i18n Implementation Guide

## Overview
This document covers the complete English ↔ Hindi (हिन्दी) bilingual implementation
for Shree Mrikula Ji Ayurvedic Clinic using **react-i18next**.

---

## 📁 File Structure

```
src/
├── i18n/
│   └── index.js                  # i18n config, changeLanguage(), detection
├── locales/
│   ├── en/
│   │   └── translation.json      # English strings (master)
│   └── hi/
│       └── translation.json      # Hindi strings (culturally accurate)
├── components/
│   ├── LanguageSwitcher.jsx      # EN | हि toggle button
│   ├── Header.jsx                # ✅ i18n-enabled
│   ├── Hero.jsx                  # ✅ i18n-enabled
│   ├── AboutAyurveda.jsx         # ✅ i18n-enabled
│   ├── AyurvedicPrincipals.jsx   # ✅ i18n-enabled
│   ├── Features.jsx              # ✅ i18n-enabled
│   ├── Services.jsx              # ✅ i18n-enabled
│   ├── Testimonials.jsx          # ✅ i18n-enabled
│   ├── ContactCTA.jsx            # ✅ i18n-enabled
│   ├── Footer.jsx                # ✅ i18n-enabled
│   └── AuthModal.jsx             # ✅ i18n-enabled (validation + UI)
├── pages/
│   └── Home.jsx                  # Orchestrates all components
├── App.jsx                       # MetaUpdater for SEO title
├── App.css                       # lang-hi body class, Devanagari font
└── main.jsx                      # i18n initialized before render
index.html                        # Noto Sans Devanagari font loaded
package.json                      # i18next + i18next-browser-languagedetector added
```

---

## ⚡ Quick Setup

### 1. Install new dependencies
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### 2. Replace files
Copy all files from this output into your `trial/` project, maintaining the same paths.

### 3. Run
```bash
npm run dev
```

---

## 🏗️ Architecture

### Language Detection Priority
```
localStorage (smac_language) → Browser navigator.language → Default: 'en'
```

### Language Persistence
When user toggles language:
1. `changeLanguage(lang)` is called
2. `i18n.changeLanguage(lang)` updates all components instantly
3. `localStorage.setItem('smac_language', lang)` persists the choice
4. `document.documentElement.lang = lang` updates HTML for SEO + a11y
5. `document.body.classList.toggle('lang-hi')` switches to Noto Devanagari font

### Translation Key Namespace Structure
```
translation.json
├── meta.*           → SEO title, description
├── nav.*            → Header navigation
├── brand.*          → Clinic name, logo alt
├── hero.*           → Hero section
├── about.*          → About Ayurveda section
├── principles.*     → Ayurvedic principals + shloka
├── features.*       → Feature cards (array)
├── services.*       → Services marquee (array)
├── testimonials.*   → Testimonials (array)
├── cta.*            → Call-to-action section
├── footer.*         → Footer (nested: clinic, quickLinks, specializations, badges)
├── auth.*           → Auth modal (form labels, validation, messages)
├── langSwitcher.*   → Language switcher labels
├── loading          → Generic loading state
├── error.*          → Error states
└── empty.*          → Empty states
```

---

## 📝 Usage Patterns

### Simple string
```jsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();

<h1>{t('hero.headline')}</h1>
```

### String with interpolation (e.g., copyright year)
```jsx
// en.json: "copyright": "© {{year}} Shree Mrikula Ji..."
<p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
```

### Arrays (features, services, testimonials)
```jsx
// Returns the translated array
const items = t('features.items', { returnObjects: true });

{Array.isArray(items) && items.map((item, i) => (
  <div key={i}>{item.title}</div>
))}
```

### Aria labels
```jsx
<button aria-label={t('nav.cartLabel')}>
  <ShoppingCart />
</button>
```

### Conditional/dynamic text
```jsx
{loading ? t('auth.loading') : isLogin ? t('auth.loginButton') : t('auth.signupButton')}
```

---

## 🔤 Hindi Font Rendering

**Font used:** [Noto Sans Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari)
- Loaded via Google Fonts in `index.html`
- Applied via `.lang-hi` class on `<body>` when Hindi is active
- `line-height: 1.75` and `word-break: keep-all` prevent layout breaks
- `.font-devanagari` utility class for shloka/Sanskrit text

---

## 🌿 Ayurvedic/Sanskrit Terminology Notes

| English | Hindi Used | Note |
|---------|-----------|------|
| Dosha | दोष | Correct Sanskrit term |
| Panchakarma | पंचकर्म | Standard transliteration |
| Bal Rog | बाल रोग | Child disease (classical Ayurvedic) |
| Shloka | श्लोक | Sanskrit verse (kept in Devanagari) |
| Prakriti/Constitution | प्रकृति | Used contextually |

---

## 🚀 Adding a 3rd Language (Future)

1. Create `src/locales/mr/translation.json` (Marathi, for example)
2. Import it in `src/i18n/index.js`:
   ```js
   import mrTranslation from '../locales/mr/translation.json';
   resources: {
     en: { translation: enTranslation },
     hi: { translation: hiTranslation },
     mr: { translation: mrTranslation },  // ← add
   }
   ```
3. Add `'mr'` to `SUPPORTED_LANGUAGES` array
4. Update `LanguageSwitcher.jsx` to show the new option

---

## ✅ Translation Coverage Checklist

| Section | Covered |
|---------|---------|
| Header / Navbar | ✅ |
| Mobile menu | ✅ |
| Dropdowns (user menu) | ✅ |
| Hero badge, headline, CTA buttons | ✅ |
| Stats/counters labels | ✅ |
| About Ayurveda section | ✅ |
| Ayurvedic Principals + Shloka | ✅ |
| Feature cards | ✅ |
| Services marquee | ✅ |
| Testimonials | ✅ |
| CTA banner | ✅ |
| Footer (all 4 columns) | ✅ |
| Copyright text | ✅ |
| Trust badges | ✅ |
| Auth modal (login/signup) | ✅ |
| Form labels + placeholders | ✅ |
| Validation messages | ✅ |
| Password strength labels | ✅ |
| Loading states | ✅ |
| Aria labels | ✅ |
| SEO title (meta.title) | ✅ |
| Logo alt text | ✅ |
| Scroll to top aria | ✅ |
| Empty / error states | ✅ |
