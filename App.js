/**
 * App.js — Entry point aplikasi KosanKu
 *
 * Tanggung jawab:
 * 1. Inisialisasi i18n (localization)
 * 2. Setup React Native Paper theme
 * 3. Setup gesture handler dan safe area
 * 4. Render AppNavigator sebagai root
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { initializeI18n } from './src/localization/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import COLORS from './src/constants/colors';

// Paper Theme — kustom sesuai brand KosanKu
const paperTheme = {
  colors: {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onBackground: COLORS.textPrimary,
    onSurface: COLORS.textPrimary,
    onError: COLORS.white,
  },
};

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    // Inisialisasi i18n sebelum render layar apapun
    initializeI18n().then(() => {
      setIsI18nReady(true);
    });
  }, []);

  if (!isI18nReady) {
    // Splash sederhana saat i18n belum siap
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <StatusBar style="auto" />
          <AppNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
