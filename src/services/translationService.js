/**
 * services/translationService.js
 * Service untuk memanggil API translasi MyMemory.
 * Menggunakan MyMemory API yang tidak memerlukan API Key (limit 5,000 karakter per hari untuk anonymous).
 */

const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

/**
 * Translate satu teks.
 * @param {string} text - Teks yang akan diterjemahkan
 * @param {string} langpair - Pasangan bahasa, contoh: 'id|en'
 * @returns {Promise<string|null>} - Teks hasil translasi atau null jika gagal
 */
export const translateText = async (text, langpair = 'id|en') => {
  if (!text || text.trim() === '') return null;

  try {
    const emailParam = process.env.EXPO_PUBLIC_MYMEMORY_EMAIL ? `&de=${encodeURIComponent(process.env.EXPO_PUBLIC_MYMEMORY_EMAIL)}` : '';
    const response = await fetch(`${MYMEMORY_API_URL}?q=${encodeURIComponent(text)}&langpair=${langpair}${emailParam}`);
    const data = await response.json();

    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  } catch (error) {
    console.error('Translation error:', error);
    return null; // Graceful failure
  }
};

/**
 * Translate banyak field sekaligus dalam satu object.
 * Jika salah satu gagal, maka kembalikan null untuk field tersebut.
 * @param {Object} fieldsObj - Objek yang berisi key-value teks untuk ditranslate
 * @param {string} langpair - Pasangan bahasa, contoh: 'id|en'
 * @returns {Promise<Object>} - Objek yang berisi hasil translasi
 */
export const translateMultipleFields = async (fieldsObj, langpair = 'id|en') => {
  const translatedObj = {};

  for (const [key, text] of Object.entries(fieldsObj)) {
    if (text && typeof text === 'string') {
      const translated = await translateText(text, langpair);
      translatedObj[`${key}_en`] = translated;
    } else {
      translatedObj[`${key}_en`] = null;
    }
  }

  return translatedObj;
};
