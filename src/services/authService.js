/**
 * services/authService.js
 * Service layer untuk semua operasi autentikasi via Supabase Auth
 * Komponen UI tidak boleh langsung memanggil supabaseClient
 */

import supabaseClient from './supabaseClient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import useAuthStore from '../store/authStore';

// Konfigurasi Google Sign-In awal
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || 'ISI_WEB_CLIENT_ID_DISINI.apps.googleusercontent.com',
  offlineAccess: true,
});

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
export const registerWithEmail = async ({ email, password, role, fullName, phoneNumber }) => {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { 
        role,
        full_name: fullName,
        phone: phoneNumber
      },
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
 * Login / Sign Up menggunakan Google
 *
 * @param {string} role - 'owner' | 'tenant' (Hanya digunakan saat Sign Up pertama kali)
 * @returns {Promise<{data, error}>}
 */
export const signInWithGoogle = async (role = null) => {
  try {
    await GoogleSignin.hasPlayServices();

    // SignOut dari Google terlebih dahulu agar dialog pilih akun selalu muncul
    try { await GoogleSignin.signOut(); } catch (_) {}

    const userInfo = await GoogleSignin.signIn();
    
    // Cek pembatalan login untuk GoogleSignin v16+
    if (userInfo?.type === 'cancelled' || userInfo?.type === 'noSavedCredentialFound') {
      return { data: null, error: null };
    }
    
    // Mendukung versi v16+ maupun versi lama dari GoogleSignin
    const idToken = userInfo?.data?.idToken || userInfo?.idToken;
    const googleName = userInfo?.data?.user?.name || userInfo?.user?.name || null;

    if (idToken) {
      // SET isAuthValidating = true agar AppNavigator tidak flicker ke menu utama
      const useAuthStore = require('../store/authStore').default;
      useAuthStore.getState().setIsAuthValidating(true);

      const { data, error } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (!error && data?.session) {
        const userId = data.session.user.id;

        // Cek apakah profil user sudah ada di public.users
        const { data: existingUser } = await supabaseClient
          .from('users')
          .select('role, full_name, created_at')
          .eq('id', userId)
          .single();

        // Siapkan data yang akan di-upsert
        const upsertData = {
          id: userId,
          email: data.session.user.email,
          updated_at: new Date().toISOString(),
        };

        // Karena trigger database otomatis memasukkan user baru ke public.users dengan role 'tenant',
        // kita mendeteksi user baru berdasarkan kapan akunnya dibuat (dalam 15 detik terakhir)
        const userCreatedAt = existingUser?.created_at ? new Date(existingUser.created_at).getTime() : 0;
        const isNewUser = (new Date().getTime() - userCreatedAt) < 15000;

        if (isNewUser) {
          if (role) {
            // Berasal dari RegisterScreen, perbarui role sesuai yang dipilih (owner/tenant)
            upsertData.role = role;
          } else {
            // Berasal dari LoginScreen tapi belum pernah daftar, tolak login
            await supabaseClient.auth.signOut();
            useAuthStore.getState().setIsAuthValidating(false);
            return { error: { code: 'NOT_REGISTERED', message: 'Akun Anda belum terdaftar. Silakan Sign Up terlebih dahulu.' } };
          }
        } else {
          // User SUDAH punya akun (sudah pernah daftar sebelumnya)
          if (role) {
            // Berasal dari RegisterScreen tapi mencoba daftar ulang, tolak!
            await supabaseClient.auth.signOut();
            useAuthStore.getState().setIsAuthValidating(false);
            return { error: { code: 'ALREADY_REGISTERED', message: 'Akun Google ini sudah terdaftar. Silakan gunakan menu Login.' } };
          }
        }

        // Isi nama dari Google jika user belum punya nama
        if (!existingUser?.full_name && googleName) {
          upsertData.full_name = googleName;
        }

        // Hanya upsert jika ada sesuatu yang perlu diperbarui
        if (upsertData.role || upsertData.full_name) {
          const { error: upsertError } = await supabaseClient.from('users').upsert(upsertData);
          
          if (upsertError) {
            console.error('UPSERT ERROR:', upsertError);
            // Sign out karena proses registrasi profile gagal
            await supabaseClient.auth.signOut();
            return { error: { message: 'Gagal menyimpan profil: ' + upsertError.message } };
          }

          // Fix Race Condition: update store secara manual setelah pendaftaran selesai
          const store = useAuthStore.getState();
          store.setAuthenticatedUser(data.session, {
            ...store.currentUser,
            ...upsertData,
            email: data.session.user.email,
          });
        }
      }

      return { data, error };
    } else {
      throw new Error('No ID token present!');
    }
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { data: null, error: null };
    }
    console.error('Error signing in with Google:', error);
    return { error };
  } finally {
    const useAuthStore = require('../store/authStore').default;
    useAuthStore.getState().setIsAuthValidating(false);
  }
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

export const sendPasswordResetEmail = async ({ email }) => {
  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
  return { data, error };
};

export const verifyPasswordResetOtp = async ({ email, otpCode }) => {
  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token: otpCode,
    type: 'recovery',
  });
  return { data, error };
};

/**
 * Logout dari sesi aktif
 *
 * @returns {Promise<{error}>}
 */
export const logout = async () => {
  try {
    await supabaseClient.auth.signOut();
    try { await GoogleSignin.signOut(); } catch (e) { }
    const store = useAuthStore.getState();
    store.clearAuthState();
    return { error: null };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Hapus Akun Permanen
 * Memanggil RPC delete_user di backend yang akan menghapus data di auth.users
 * dan memicu cascade delete ke public.users
 */
export const deleteAccount = async () => {
  try {
    // Panggil fungsi RPC delete_user di backend
    const { error } = await supabaseClient.rpc('delete_user');
    
    if (error) {
      console.error('Error deleting account:', error);
      return { error };
    }

    // Jika berhasil, otomatis sign out dan bersihkan state
    await supabaseClient.auth.signOut();
    try { await GoogleSignin.signOut(); } catch (e) { }
    const store = useAuthStore.getState();
    store.clearAuthState();
    
    return { error: null };
  } catch (err) {
    return { error: err };
  }
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
    .upsert({ id: userId, ...profileData, updated_at: new Date().toISOString() })
    .select()
    .single();

  return { data, error };
};

/**
 * Update FCM token user
 *
 * @param {string} userId
 * @param {string} token
 */
export const updateFcmToken = async (userId, token) => {
  if (!token) return;

  // 1. Simpan ke tabel users (untuk backward compatibility)
  const { error: userError } = await supabaseClient
    .from('users')
    .update({ fcm_token: token })
    .eq('id', userId);
  
  if (userError) console.error('Error updating FCM token on users table:', userError);

  // 2. Simpan ke tabel fcm_tokens (mendukung multiple devices)
  const { error: tokensError } = await supabaseClient
    .from('fcm_tokens')
    .upsert(
      { 
        user_id: userId, 
        token: token, 
        platform: Platform.OS, 
        updated_at: new Date().toISOString() 
      }, 
      { onConflict: 'token' }
    );

  if (tokensError && tokensError.code !== '42501') {
    console.error('Error upserting FCM token on fcm_tokens table:', tokensError);
  }
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
