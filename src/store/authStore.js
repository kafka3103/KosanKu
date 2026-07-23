/**
 * store/authStore.js
 * Zustand store untuk state autentikasi global
 * Diakses oleh AppNavigator untuk routing berdasarkan auth state & role
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USER_ROLE } from '../constants/userRole';

const useAuthStore = create((set, get) => ({
  // ── State ──
  currentSession: null,       // Supabase session object
  currentUser: null,          // Data dari public.users (termasuk role)
  userRole: null,             // 'owner' | 'tenant' | null
  isAuthenticated: false,
  isLoading: true,            // Loading awal saat cek sesi
  isProfileComplete: false,   // Apakah profil sudah lengkap
  isAuthValidating: false,    // Mencegah flicker saat Google Sign In

  // ── Actions ──

  setIsAuthValidating: (val) => set({ isAuthValidating: val }),

  /**
   * Set sesi dan user setelah login/register berhasil
   * @param {Object} session - Supabase session
   * @param {Object} userProfile - Data dari public.users
   * @param {string} [lastUsedRole] - Role terakhir sebelum logout
   */
  setAuthenticatedUser: (session, userProfile, lastUsedRole = null) => {
    let initialActiveRole = userProfile?.role ?? null;
    if (initialActiveRole === USER_ROLE.BOTH) {
      initialActiveRole = lastUsedRole || USER_ROLE.TENANT; 
    }

    // Simpan role yang dipilih ke AsyncStorage dengan key yang spesifik untuk user ini
    if (userProfile?.role === USER_ROLE.BOTH && initialActiveRole && userProfile?.id) {
      AsyncStorage.setItem(`@last_used_role_${userProfile.id}`, initialActiveRole).catch(console.error);
    }

    set({
      currentSession: session,
      currentUser: userProfile,
      userRole: initialActiveRole,
      isAuthenticated: true,
      isLoading: false,
      isProfileComplete: userProfile?.is_profile_complete ?? false,
    });
  },

  /**
   * Clear semua state auth saat logout
   */
  clearAuthState: () => {
    set({
      currentSession: null,
      currentUser: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: false,
      isProfileComplete: false,
    });
  },

  /**
   * Pindah antar role (jika user memiliki role 'both')
   */
  switchRole: () => {
    const state = get();
    if (state.currentUser?.role === USER_ROLE.BOTH) {
      const newRole = state.userRole === USER_ROLE.OWNER ? USER_ROLE.TENANT : USER_ROLE.OWNER;
      set({ 
        userRole: newRole 
      });
      
      if (state.currentUser?.id) {
        AsyncStorage.setItem(`@last_used_role_${state.currentUser.id}`, newRole).catch(console.error);
      }
    }
  },

  /**
   * Set loading state (saat cek sesi pertama kali)
   */
  setIsLoading: (isLoading) => set({ isLoading }),

  /**
   * Update data user profile (setelah edit profil)
   * @param {Object} updatedProfile - Field yang berubah
   */
  updateCurrentUser: (updatedProfile) => {
    set((state) => ({
      currentUser: { ...state.currentUser, ...updatedProfile },
      isProfileComplete: updatedProfile.is_profile_complete ?? state.isProfileComplete,
    }));
  },

  // ── Computed / Getters ──
  isOwner: () => get().userRole === USER_ROLE.OWNER,
  isTenant: () => get().userRole === USER_ROLE.TENANT,
}));

export default useAuthStore;
