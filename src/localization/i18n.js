/**
 * localization/i18n.js
 * Setup i18next untuk React Native
 * Mendukung Bahasa Indonesia (default) dan English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import idTranslations from './id.json';
import enTranslations from './en.json';
import supabaseClient from '../services/supabaseClient';

const LANGUAGE_STORAGE_KEY = '@kosanku_language';

/**
 * Deteksi bahasa yang tersimpan di AsyncStorage
 * Jika belum ada, gunakan Bahasa Indonesia sebagai default
 */
const detectStoredLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage ?? 'id';
  } catch {
    return 'id';
  }
};

/**
 * Simpan preferensi bahasa ke AsyncStorage & sinkronkan ke Supabase
 * @param {string} languageCode - 'id' | 'en'
 */
export const saveLanguagePreference = async (languageCode) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);

    // Sinkronkan preferensi bahasa ke server Supabase (kolom preferred_language di tabel users)
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user?.id) {
        await supabaseClient
          .from('users')
          .update({ preferred_language: languageCode })
          .eq('id', session.user.id);
      }
    } catch (_) {
      // Abaikan jika tidak tersambung ke network / belum login
    }
  } catch (error) {
    console.error('Gagal menyimpan preferensi bahasa:', error);
  }
};

/**
 * Sinkronkan preferensi bahasa saat user login/restoration sesi
 */
export const syncLanguagePreferenceToBackend = async () => {
  try {
    const storedLanguage = await detectStoredLanguage();
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user?.id && storedLanguage) {
      await supabaseClient
        .from('users')
        .update({ preferred_language: storedLanguage })
        .eq('id', session.user.id);
    }
  } catch (_) {
    // Abaikan jika gagal sinkronisasi
  }
};

/**
 * Inisialisasi i18next
 * Dipanggil sekali di App.js sebelum render
 */
export const initializeI18n = async () => {
  const detectedLanguage = await detectStoredLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        id: { translation: idTranslations },
        en: { translation: enTranslations },
      },
      lng: detectedLanguage,
      fallbackLng: 'id',
      // Namespace default
      defaultNS: 'translation',
      // Interpolasi untuk nilai dinamis seperti {{name}}, {{count}}, dll.
      interpolation: {
        escapeValue: false, // React Native sudah handle XSS
      },
      // Jangan load dari remote — semua teks sudah bundled
    });

  return i18n;
};

export default i18n;
