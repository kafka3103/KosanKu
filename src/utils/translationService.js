// Caching to avoid duplicate network requests for the same string
const translationCache = {};

/**
 * Translates text dynamically using a free, public Google Translate API endpoint.
 * Note: This endpoint is unauthenticated and rate-limited. It is suitable for 
 * academic projects or low-volume text translation.
 * 
 * @param {string} text - The source text to translate
 * @param {string} targetLang - The target language code (e.g. 'en')
 * @param {string} sourceLang - The source language code (e.g. 'id')
 * @returns {Promise<string>} The translated text
 */
export const translateDynamicText = async (text, targetLang = 'en', sourceLang = 'id') => {
  if (!text || typeof text !== 'string') return text;
  
  // Return original text if target language is the same as source language
  if (targetLang === sourceLang) return text;
  
  const cacheKey = `${text}_${sourceLang}_${targetLang}`;
  
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // The response structure is [[[ "translated", "original", null, null, 10 ]], null, "id"]
    if (data && data[0]) {
      let translated = '';
      for (let i = 0; i < data[0].length; i++) {
        if (data[0][i][0]) {
          translated += data[0][i][0];
        }
      }
      
      translationCache[cacheKey] = translated;
      return translated;
    }
    
    return text; // Fallback to original if parsing fails
  } catch (error) {
    console.log('Dynamic translation error:', error);
    return text; // Fallback to original text on network error
  }
};
