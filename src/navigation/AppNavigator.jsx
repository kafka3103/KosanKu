/**
 * navigation/AppNavigator.jsx
 * Root navigator — routing berdasarkan auth state dan role user
 * Menggunakan Zustand authStore sebagai single source of truth
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import useAuthStore from '../store/authStore';
import { subscribeToAuthChanges, getUserProfile } from '../services/authService';
import COLORS from '../constants/colors';

import AuthNavigator from './AuthNavigator';
import OwnerNavigator from './OwnerNavigator';
import TenantNavigator from './TenantNavigator';
import USER_ROLE from '../constants/userRole';

const RootStack = createStackNavigator();

/**
 * Layar loading saat cek sesi awal
 */
const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <Image 
      source={require('../../assets/logo.png')} 
      style={styles.splashLogo} 
      resizeMode="contain"
    />
    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
  </View>
);

const AppNavigator = () => {
  const {
    isLoading,
    isAuthenticated,
    userRole,
    setAuthenticatedUser,
    clearAuthState,
    setIsLoading,
  } = useAuthStore();

  useEffect(() => {
    // Subscribe ke perubahan auth state Supabase
    const unsubscribe = subscribeToAuthChanges(async (event, session) => {
      // Handler untuk sesi aktif: baik saat login baru maupun saat restore sesi sebelumnya
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        try {
          const { data: userProfile } = await getUserProfile(session.user.id);
          
          // Mencegah race condition: jika authStore sudah keburu di-update oleh authService
          // dengan role yang benar, jangan timpa dengan data usang (role null) dari fetch ini.
          const currentRole = useAuthStore.getState().userRole;
          if (currentRole && !userProfile?.role) {
            console.log('AppNavigator: Mengabaikan data usang karena role sudah terupdate di store.');
            return;
          }

          if (userProfile) {
            setAuthenticatedUser(session, userProfile);
          } else {
            // User baru — belum ada di public.users (sebelum lengkap profilnya)
            setAuthenticatedUser(session, {
              id: session.user.id,
              email: session.user.email,
              role: session.user.user_metadata?.role ?? null,
              is_profile_complete: false,
            });
          }
        } catch (error) {
          console.error('Error mengambil profil user:', error);
          clearAuthState();
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuthState();
      } else if (event === 'TOKEN_REFRESHED') {
        // Token diperbarui — update session tanpa ubah user data
        setAuthenticatedUser(session, useAuthStore.getState().currentUser);
      } else if (event === 'INITIAL_SESSION' && !session) {
        // Tidak ada sesi aktif saat buka app pertama kali
        setIsLoading(false);
      } else {
        // Fallback: selesaikan loading
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  /**
   * Tentukan navigator mana yang dirender:
   * 1. Tidak authenticated → AuthNavigator
   * 2. Authenticated tapi profil belum lengkap → AuthNavigator (ke ProfileSetup)
   * 3. Authenticated, role owner → OwnerNavigator
   * 4. Authenticated, role tenant → TenantNavigator
   */
  const renderNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }
    if (userRole === USER_ROLE.OWNER) {
      return <OwnerNavigator />;
    }
    if (userRole === USER_ROLE.TENANT) {
      return <TenantNavigator />;
    }
    // Fallback — role tidak dikenal
    return <AuthNavigator />;
  };

  return (
    <NavigationContainer>
      {renderNavigator()}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  splashLogo: {
    width: 220,
    height: 120
  },
});

export default AppNavigator;
