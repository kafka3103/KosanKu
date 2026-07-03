/**
 * services/authService.js
 * Service layer untuk semua operasi autentikasi via Supabase Auth
 * Komponen UI tidak boleh langsung memanggil supabaseClient
 */

import supabaseClient from './supabaseClient';

/**
 * Registrasi user baru dengan email dan password
 * Setelah registrasi, user perlu verifikasi OTP
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.role - 'owner' | 'tenant'
 * @returns {Promise<{data, error}>}
 */
export const registerWithEmail = async ({ email, password, role }) => {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  });

  return { data, error };
};

/**
 * Registrasi via nomor telepon (OTP via SMS)
 *
 * @param {Object} params
 * @param {string} params.phoneNumber - Format internasional: +628123456789
 * @param {string} params.role - 'owner' | 'tenant'
 * @returns {Promise<{data, error}>}
 */
export const registerWithPhone = async ({ phoneNumber, role }) => {
  const { data, error } = await supabaseClient.auth.signInWithOtp({
    phone: phoneNumber,
    options: {
      data: { role },
      shouldCreateUser: true,
    },
  });

  return { data, error };
};

/**
 * Login dengan email dan password
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{data, error}>}
 */
export const loginWithEmail = async ({ email, password }) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

/**
 * Login via OTP (email atau phone)
 *
 * @param {Object} params
 * @param {string} [params.email] - Email untuk OTP via email
 * @param {string} [params.phoneNumber] - Nomor telepon untuk OTP via SMS
 * @returns {Promise<{data, error}>}
 */
export const requestOtp = async ({ email, phoneNumber }) => {
  if (phoneNumber) {
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      phone: phoneNumber,
    });
    return { data, error };
  }

  const { data, error } = await supabaseClient.auth.signInWithOtp({
    email,
  });
  return { data, error };
};

/**
 * Verifikasi OTP yang dikirim via email atau SMS
 *
 * @param {Object} params
 * @param {string} [params.email]
 * @param {string} [params.phoneNumber]
 * @param {string} params.otpCode - 6-digit OTP yang diinput user
 * @returns {Promise<{data, error}>}
 */
export const verifyOtp = async ({ email, phoneNumber, otpCode }) => {
  if (phoneNumber) {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      phone: phoneNumber,
      token: otpCode,
      type: 'sms',
    });
    return { data, error };
  }

  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token: otpCode,
    type: 'email',
  });
  return { data, error };
};

/**
 * Logout dari sesi aktif
 *
 * @returns {Promise<{error}>}
 */
export const logout = async () => {
  const { error } = await supabaseClient.auth.signOut();
  return { error };
};

/**
 * Ambil sesi aktif saat ini
 *
 * @returns {Promise<{data: {session}, error}>}
 */
export const getCurrentSession = async () => {
  const { data, error } = await supabaseClient.auth.getSession();
  return { data, error };
};

/**
 * Ambil user yang sedang login
 *
 * @returns {Promise<{data: {user}, error}>}
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabaseClient.auth.getUser();
  return { data, error };
};

/**
 * Update password user yang sedang login
 *
 * @param {Object} params
 * @param {string} params.newPassword
 * @returns {Promise<{data, error}>}
 */
export const updatePassword = async ({ newPassword }) => {
  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

/**
 * Ambil profil user dari tabel public.users (termasuk role)
 *
 * @param {string} userId
 * @returns {Promise<{data, error}>}
 */
export const getUserProfile = async (userId) => {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
};

/**
 * Update profil dasar user (nama, avatar)
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {Object} params.profileData - Data yang akan diupdate
 * @returns {Promise<{data, error}>}
 */
export const updateUserProfile = async ({ userId, profileData }) => {
  const { data, error } = await supabaseClient
    .from('users')
    .update({ ...profileData, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
};

/**
 * Subscribe ke perubahan auth state (login/logout)
 * Mengembalikan fungsi unsubscribe untuk cleanup di useEffect
 *
 * @param {Function} callback - Dipanggil dengan (event, session)
 * @returns {Function} unsubscribe
 */
export const subscribeToAuthChanges = (callback) => {
  const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
};
