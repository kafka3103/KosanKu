/**
 * navigation/AppNavigator.jsx
 * Root navigator — routing berdasarkan auth state dan role user
 * Menggunakan Zustand authStore sebagai single source of truth
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import useAuthStore from '../store/authStore';
import { subscribeToAuthChanges, getUserProfile, updateFcmToken, getCurrentSession, logout } from '../services/authService';
import { syncLanguagePreferenceToBackend } from '../localization/i18n';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../utils/notificationUtils';
import COLORS from '../constants/colors';

import AuthNavigator from './AuthNavigator';
import OwnerNavigator from './OwnerNavigator';
import TenantNavigator from './TenantNavigator';
import USER_ROLE from '../constants/userRole';
import { AUTH_SCREENS } from '../constants/screenNames';

import OtpVerificationScreen from '../screens/shared/OtpVerificationScreen';
import ResetPasswordScreen from '../screens/shared/ResetPasswordScreen';

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

// Create a global navigation ref to use outside of React components if needed
export const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  const {
    isLoading,
    isAuthenticated,
    userRole,
    setAuthenticatedUser,
    clearAuthState,
    setIsLoading,
    isAuthValidating,
  } = useAuthStore();

  useEffect(() => {
    // Setup listener untuk Foreground, Background, dan Terminated Notifications
    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        // Foreground notification handler (Bisa ditambah custom logic jika diperlukan)
      },
      (response) => {
        // Background / Terminated tap handler
        const role = useAuthStore.getState().userRole;
        // Navigasi ke halaman Notifikasi sesuai role
        if (navigationRef.isReady()) {
          if (role === USER_ROLE.OWNER) {
            navigationRef.navigate('OwnerMain', { screen: 'OwnerNotifications' });
          } else if (role === USER_ROLE.TENANT) {
            navigationRef.navigate('TenantMain', { screen: 'Notifications' });
          }
        }
      }
    );

    // Subscribe ke perubahan auth state Supabase
    const unsubscribe = subscribeToAuthChanges(async (event, session) => {
      // Handler untuk sesi aktif: baik saat login baru maupun saat restore sesi sebelumnya
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        try {
          const { data: userProfile } = await getUserProfile(session.user.id);
          
          // Request and save FCM Token
          const fcmToken = await registerForPushNotificationsAsync();
          if (fcmToken) {
            await updateFcmToken(session.user.id, fcmToken);
          }
          await syncLanguagePreferenceToBackend();
          
          // Mencegah race condition: jika authStore sudah keburu di-update oleh authService
          // dengan role yang benar, jangan timpa dengan data usang (role null) dari fetch ini.
          const currentRole = useAuthStore.getState().userRole;
          if (currentRole && !userProfile?.role) {
            console.log('AppNavigator: Mengabaikan data usang karena role sudah terupdate di store.');
            return;
          }

          // Fix Race Condition 2: Karena event ini berjalan asynchronous (await), ada kemungkinan
          // fungsi signInWithGoogle sudah memanggil signOut() jika user tidak terdaftar.
          // Kita harus mengecek ulang apakah sesi masih benar-benar ada di Supabase.
          const { data: currentSessionData } = await getCurrentSession();
          if (!currentSessionData?.session) {
            console.log('AppNavigator: Sesi dibatalkan secara internal (SIGNED_OUT). Menghentikan auto-login.');
            return;
          }

          if (userProfile) {
            // Cek apakah akun dinonaktifkan (Soft Delete)
            if (userProfile.is_active === false) {
              Alert.alert('Akun Dinonaktifkan', 'Akun Anda telah dinonaktifkan. Silakan hubungi support untuk informasi lebih lanjut.');
              await logout();
              useAuthStore.getState().clearAuthState();
              return;
            }

            let lastUsedRole = null;
            if (userProfile.role === USER_ROLE.BOTH) {
              try {
                lastUsedRole = await AsyncStorage.getItem(`@last_used_role_${userProfile.id}`);
              } catch (e) {
                console.error('Failed to get last used role:', e);
              }
            }
            setAuthenticatedUser(session, userProfile, lastUsedRole);
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

    return () => {
      unsubscribe();
      cleanupListeners();
    };
  }, []);

  if (isLoading || isAuthValidating) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="AuthRoot" component={AuthNavigator} />
        ) : userRole === USER_ROLE.OWNER ? (
          <RootStack.Screen name="OwnerMain" component={OwnerNavigator} />
        ) : userRole === USER_ROLE.TENANT ? (
          <RootStack.Screen name="TenantMain" component={TenantNavigator} />
        ) : (
          <RootStack.Screen name="AuthFallback" component={AuthNavigator} />
        )}
        <RootStack.Screen name={AUTH_SCREENS.OTP_VERIFICATION} component={OtpVerificationScreen} />
        <RootStack.Screen name={AUTH_SCREENS.RESET_PASSWORD} component={ResetPasswordScreen} />
      </RootStack.Navigator>
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
