/**
 * store/authStore.js
 * Zustand store untuk state autentikasi global
 * Diakses oleh AppNavigator untuk routing berdasarkan auth state & role
 */

import { create } from 'zustand';
import { USER_ROLE } from '../constants/userRole';

const useAuthStore = create((set, get) => ({
  // ── State ──
  currentSession: null,       // Supabase session object
  currentUser: null,          // Data dari public.users (termasuk role)
  userRole: null,             // 'owner' | 'tenant' | null
  isAuthenticated: false,
  isLoading: true,            // Loading awal saat cek sesi
  isProfileComplete: false,   // Apakah profil sudah lengkap

  // ── Actions ──

  /**
   * Set sesi dan user setelah login/register berhasil
   * @param {Object} session - Supabase session
   * @param {Object} userProfile - Data dari public.users
   */
  setAuthenticatedUser: (session, userProfile) => {
    let initialActiveRole = userProfile?.role ?? null;
    if (initialActiveRole === USER_ROLE.BOTH) {
      initialActiveRole = USER_ROLE.TENANT; // Default login sebagai tenant
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
      set({ 
        userRole: state.userRole === USER_ROLE.OWNER ? USER_ROLE.TENANT : USER_ROLE.OWNER 
      });
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
