/**
 * services/supabaseClient.js
 * Singleton Supabase client — satu-satunya titik akses ke Supabase
 * Semua service layer mengimport dari sini
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL dan Anon Key harus diset di file .env\n' +
    'Salin .env.example ke .env dan isi nilainya.'
  );
}

/**
 * Supabase client dengan konfigurasi untuk React Native:
 * - Menggunakan AsyncStorage untuk persistensi sesi auth
 * - autoRefreshToken: true — token diperbarui otomatis
 * - persistSession: true — sesi disimpan di AsyncStorage
 * - detectSessionInUrl: false — tidak relevan di mobile (tidak ada URL)
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabaseClient;
