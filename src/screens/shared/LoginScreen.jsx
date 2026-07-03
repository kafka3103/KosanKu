/**
 * screens/shared/LoginScreen.jsx
 * Placeholder — akan diisi penuh di Langkah 2 (PROBIS-01)
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/spacing';
import { loginWithEmail } from '../../services/authService';
import { AUTH_SCREENS } from '../../navigation/AuthNavigator';

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('common.errors.required'));
      return;
    }
    setIsLoading(true);
    const { error } = await loginWithEmail({ email, password });
    setIsLoading(false);
    if (error) {
      Alert.alert('Login Gagal', error.message);
    }
    // Jika berhasil, AppNavigator akan otomatis redirect via auth state
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerContainer}>
        <Text style={styles.appName}>KosanKu</Text>
        <Text style={styles.title}>{t('auth.login.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>{t('auth.login.emailLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.login.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.textTertiary}
        />

        <Text style={styles.label}>{t('auth.login.passwordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.login.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={COLORS.textTertiary}
        />

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.loginButtonText}>{t('auth.login.loginButton')}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate(AUTH_SCREENS.REGISTER)}
        >
          <Text style={styles.registerLinkText}>{t('auth.login.registerLink')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: SPACING[6] },
  headerContainer: { alignItems: 'center', marginTop: SPACING[16], marginBottom: SPACING[8] },
  appName: { fontSize: FONT_SIZE['3xl'], fontWeight: FONT_WEIGHT.extraBold, color: COLORS.primary, marginBottom: SPACING[2] },
  title: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, marginTop: SPACING[1] },
  formContainer: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING[6] },
  label: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textSecondary, marginBottom: SPACING[1], marginTop: SPACING[4] },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING[3], fontSize: FONT_SIZE.base, color: COLORS.textPrimary, backgroundColor: COLORS.grey50 },
  loginButton: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING[4], alignItems: 'center', marginTop: SPACING[6] },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semiBold },
  registerLink: { alignItems: 'center', marginTop: SPACING[4] },
  registerLinkText: { color: COLORS.primary, fontSize: FONT_SIZE.base },
});

export default LoginScreen;
