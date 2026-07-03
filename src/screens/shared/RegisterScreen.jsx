/**
 * screens/shared/RegisterScreen.jsx — Placeholder (dikembangkan di Langkah 2)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { AUTH_SCREENS } from '../../navigation/AuthNavigator';

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.register.title')}</Text>
      <Text style={styles.subtitle}>Form registrasi lengkap — dikembangkan di Langkah 2 (PROBIS-01)</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate(AUTH_SCREENS.LOGIN)}>
        <Text style={styles.backText}>{t('common.buttons.back')} ke Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING[6], backgroundColor: COLORS.background },
  title: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[3] },
  subtitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING[6] },
  backButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING[6], paddingVertical: SPACING[3], borderRadius: 8 },
  backText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
});

export default RegisterScreen;
