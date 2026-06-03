import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Minimal i18n setup. The admin pages carry their en/ar strings inline via the
 * `tr(isAr, en, ar)` helper, so we only need i18next to expose the active
 * language (and RTL toggling). Default English; the header has a toggle.
 */
i18n.use(initReactI18next).init({
  resources: { en: { translation: {} }, ar: { translation: {} } },
  lng: localStorage.getItem('pa_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
