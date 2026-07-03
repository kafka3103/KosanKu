/**
 * utils/storageUtils.js
 * Helper untuk AsyncStorage operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LANGUAGE: '@kosanku_language',
  ONBOARDING_DONE: '@kosanku_onboarding_done',
  SEARCH_HISTORY: '@kosanku_search_history',
};

/**
 * Simpan nilai ke AsyncStorage (dengan JSON serialization)
 * @param {string} key
 * @param {any} value
 */
export const saveToStorage = async (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`StorageUtils: Gagal menyimpan key "${key}":`, error);
  }
};

/**
 * Ambil nilai dari AsyncStorage (dengan JSON deserialization)
 * @param {string} key
 * @param {any} defaultValue - Nilai default jika key tidak ada
 * @returns {Promise<any>}
 */
export const getFromStorage = async (key, defaultValue = null) => {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored);
  } catch (error) {
    console.error(`StorageUtils: Gagal membaca key "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Hapus nilai dari AsyncStorage
 * @param {string} key
 */
export const removeFromStorage = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`StorageUtils: Gagal menghapus key "${key}":`, error);
  }
};

/**
 * Clear semua data aplikasi (dipakai saat logout total)
 */
export const clearAllStorage = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('StorageUtils: Gagal clear all storage:', error);
  }
};

export { STORAGE_KEYS };
export default { saveToStorage, getFromStorage, removeFromStorage, clearAllStorage, STORAGE_KEYS };
