import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './Locales/en/Translation.json';
import ar from './Locales/ar/Translation.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: localStorage.getItem('pa_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
