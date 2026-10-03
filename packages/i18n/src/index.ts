import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all locale files statically for bundling
// es-VE namespaces
import esVECommon from './locales/es-VE/common.json';
import esVEAuth from './locales/es-VE/auth.json';
import esVEPaciente from './locales/es-VE/paciente.json';
import esVEClinico from './locales/es-VE/clinico.json';
import esVEAdmin from './locales/es-VE/admin.json';
import esVEErrors from './locales/es-VE/errors.json';

export const defaultNS = 'common';
export const supportedLngs = ['es-VE', 'es'] as const;
export type SupportedLng = (typeof supportedLngs)[number];

export const resources = {
  'es-VE': {
    common:   esVECommon,
    auth:     esVEAuth,
    paciente: esVEPaciente,
    clinico:  esVEClinico,
    admin:    esVEAdmin,
    errors:   esVEErrors,
  },
  // Fallback: Spanish (generic) — same as es-VE for now
  es: {
    common:   esVECommon,
    auth:     esVEAuth,
    paciente: esVEPaciente,
    clinico:  esVEClinico,
    admin:    esVEAdmin,
    errors:   esVEErrors,
  },
} as const;

/**
 * Initialise i18next for the SNHCE system.
 * Call this once at the app entry point before rendering.
 * Returns the i18n instance (useful for testing).
 */
export function initI18n() {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      lng: 'es-VE',
      fallbackLng: 'es',
      defaultNS,
      ns: ['common', 'auth', 'paciente', 'clinico', 'admin', 'errors'],
      resources,
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: true,
      },
    });
  }
  return i18n;
}

export { i18n };
export default i18n;
