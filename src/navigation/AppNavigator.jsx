/**
 * navigation/AppNavigator.jsx
 * Root navigator — routing berdasarkan auth state dan role user
 * Menggunakan Zustand authStore sebagai single source of truth
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import useAuthStore from '../store/authStore';
import { subscribeToAuthChanges, getUserProfile } from '../services/authService';
import COLORS from '../constants/colors';

import AuthNavigator from './AuthNavigator';
import OwnerNavigator from './OwnerNavigator';
import TenantNavigator from './TenantNavigator';
import ProfileSetupScreen from '../screens/shared/ProfileSetupScreen';
import USER_ROLE from '../constants/userRole';

const RootStack = createStackNavigator();

/**
 * Layar loading saat cek sesi awal
 */
const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

const AppNavigator = () => {
  const {
    isLoading,
    isAuthenticated,
    userRole,
    isProfileComplete,
    setAuthenticatedUser,
    clearAuthState,
    setIsLoading,
  } = useAuthStore();

  useEffect(() => {
    // Subscribe ke perubahan auth state Supabase
    const unsubscribe = subscribeToAuthChanges(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: userProfile } = await getUserProfile(session.user.id);
          if (userProfile) {
            setAuthenticatedUser(session, userProfile);
          } else {
            // User baru — belum ada di public.users (sebelum complete profile)
            setAuthenticatedUser(session, {
              id: session.user.id,
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
      } else {
        // Initial check selesai tanpa session
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
    if (!isProfileComplete) {
      return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        </RootStack.Navigator>
      );
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
    backgroundColor: COLORS.background,
  },
});

export default AppNavigator;
