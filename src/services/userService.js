/**
 * services/userService.js
 * Service layer untuk operasi profil user:
 * - public.users (data dasar)
 * - public.owner_profiles (data tambahan owner)
 * - public.tenant_profiles (data tambahan tenant)
 * - Supabase Storage (upload avatar, KTP)
 */

import supabaseClient from './supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// ─── Bucket Storage ───────────────────────────────────────────
const AVATARS_BUCKET = 'avatars';
const KTP_BUCKET = 'ktp-documents';

// ─── User Profile ─────────────────────────────────────────────

/**
 * Ambil profil user lengkap berdasarkan userId
 * Menggabungkan data users + owner_profiles atau tenant_profiles
 *
 * @param {string} userId
 * @param {'owner'|'tenant'} role
 */
export const getUserProfile = async (userId, role) => {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
};

/**
 * Update data dasar user (nama, avatar, dll)
 *
 * @param {string} userId
 * @param {Object} profileData
 */
export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabaseClient
    .from('users')
    .update({ ...profileData, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
};

/**
 * Tandai profil sebagai sudah lengkap
 *
 * @param {string} userId
 */
export const markProfileComplete = async (userId) => {
  const { data, error } = await supabaseClient
    .from('users')
    .update({ is_profile_complete: true, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
};

// ─── Owner Profile ────────────────────────────────────────────

/**
 * Ambil profil owner (data bank, KTP, NPWP)
 *
 * @param {string} userId
 */
export const getOwnerProfile = async (userId) => {
  const { data, error } = await supabaseClient
    .from('owner_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
};

/**
 * Buat atau update profil owner (upsert)
 *
 * @param {string} userId
 * @param {Object} ownerData
 */
export const upsertOwnerProfile = async (userId, ownerData) => {
  const { data, error } = await supabaseClient
    .from('owner_profiles')
    .upsert(
      { user_id: userId, ...ownerData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  return { data, error };
};

// ─── Tenant Profile ───────────────────────────────────────────

/**
 * Ambil profil tenant (pekerjaan, kontak darurat, dll)
 *
 * @param {string} userId
 */
export const getTenantProfile = async (userId) => {
  const { data, error } = await supabaseClient
    .from('tenant_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
};

/**
 * Buat atau update profil tenant (upsert)
 *
 * @param {string} userId
 * @param {Object} tenantData
 */
export const upsertTenantProfile = async (userId, tenantData) => {
  const { data, error } = await supabaseClient
    .from('tenant_profiles')
    .upsert(
      { user_id: userId, ...tenantData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  return { data, error };
};

// ─── Storage Upload ───────────────────────────────────────────

/**
 * Upload foto avatar ke Supabase Storage
 * Mengembalikan public URL foto
 *
 * @param {string} userId
 * @param {string} localUri - URI lokal dari expo-image-picker
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export const uploadAvatar = async (userId, localUri) => {
  try {
    const ext = localUri.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/avatar.${ext}`;
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabaseClient.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) return { url: null, error: uploadError };

    const { data } = supabaseClient.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(fileName);

    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: err };
  }
};

/**
 * Upload foto KTP ke Supabase Storage (bucket private)
 *
 * @param {string} userId
 * @param {string} localUri
 * @returns {Promise<{path: string|null, error: Error|null}>}
 */
export const uploadKtpPhoto = async (userId, localUri) => {
  try {
    const ext = localUri.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/ktp.${ext}`;
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabaseClient.storage
      .from(KTP_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) return { path: null, error: uploadError };

    return { path: fileName, error: null };
  } catch (err) {
    return { path: null, error: err };
  }
};
