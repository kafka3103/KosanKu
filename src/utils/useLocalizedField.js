/**
 * utils/useLocalizedField.js
 * Helper untuk mengambil field berdasarkan bahasa yang aktif di aplikasi.
 */

import i18n from '../localization/i18n';

/**
 * Ambil nilai field yang sesuai dengan bahasa aktif saat ini.
 * @param {Object} obj - Objek data (misal: property atau room)
 * @param {string} fieldName - Nama field original (misal: 'name' atau 'description')
 * @returns {string} - Nilai field dalam bahasa yang sesuai, fallback ke bahasa asli jika null
 */
export const getLocalizedField = (obj, fieldName) => {
  if (!obj) return '';

  const lang = i18n.language; // 'id' atau 'en'

  if (lang === 'en') {
    // Coba ambil field *_en, kalau null/kosong/undefined balik ke field original
    const enField = obj[`${fieldName}_en`];
    if (enField && enField.trim() !== '') {
      return enField;
    }
  }

  // Fallback ke bahasa asli
  return obj[fieldName] || '';
};
