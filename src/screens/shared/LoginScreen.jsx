import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/spacing';
import { loginWithEmail, signInWithGoogle } from '../../services/authService';
import { AUTH_SCREENS } from '../../navigation/AuthNavigator';

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('common.errors.required') || 'Email dan password wajib diisi');
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Format email tidak valid. Pastikan Anda menggunakan format email yang benar (contoh: nama@email.com)');
      return;
    }

    setIsLoading(true);
    const { error } = await loginWithEmail({ email, password });
    setIsLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        Alert.alert(
          'Login Gagal',
          'Akun tidak terdaftar atau kombinasi email dan password salah.',
          [
            { text: 'Coba Lagi', style: 'cancel' },
            { text: 'Daftar Sekarang', onPress: () => navigation.navigate(AUTH_SCREENS.REGISTER) }
          ]
        );
      } else {
        Alert.alert('Login Gagal', error.message);
      }
    }
    // Jika berhasil, AppNavigator akan otomatis redirect via auth state
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    setIsLoading(false);
    
    if (error) {
      if (error.code === 'NOT_REGISTERED') {
        Alert.alert(
          'Akun Belum Terdaftar',
          error.message,
          [
            { text: 'Batal', style: 'cancel' },
            { 
              text: 'Daftar Sekarang', 
              onPress: () => navigation.navigate(AUTH_SCREENS.REGISTER) 
            }
          ]
        );
      } else {
        Alert.alert(t('common.errors.error'), error.message);
      }
    }
    // Jika sukses, auth state listener akan otomatis memindahkan layar
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: Math.max((insets?.top || 0) + 16, 48), paddingBottom: Math.max((insets?.bottom || 0) + 16, 48) }]} keyboardShouldPersistTaps="handled">
      <View style={styles.headerContainer}>
        <Image 
          source={require('../../../assets/logo.png')} 
          style={styles.logoImage} 
          resizeMode="contain"
        />
        <Text style={styles.title}>{t('auth.login.title')}</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>{t('auth.login.emailLabel')}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <Text style={styles.label}>{t('auth.login.passwordLabel')}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { paddingRight: 50 }]}
            placeholder={t('auth.login.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor={COLORS.textTertiary}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
            <Text style={styles.rememberText}>{t('auth.login.rememberMe')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate(AUTH_SCREENS.FORGOT_PASSWORD)}>
            <Text style={styles.forgotPasswordText}>{t('auth.login.forgetPassword')}</Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialLoginContainer}>
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
            <Image 
              source={{ uri: 'https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png' }} 
              style={styles.socialIcon} 
            />
            <Text style={styles.socialButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>{t('auth.login.dontHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate(AUTH_SCREENS.REGISTER)}>
            <Text style={styles.footerLink}>{t('auth.login.signUp')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: COLORS.white, 
    paddingHorizontal: SPACING[6],
  },
  headerContainer: { 
    alignItems: 'center', 
    marginTop: SPACING[12], 
    marginBottom: SPACING[8] 
  },
  logoImage: { 
    width: 200, 
    height: 120 
  },
  title: { 
    fontSize: 28, 
    fontWeight: FONT_WEIGHT.bold, 
    color: COLORS.textPrimary 
  },
  formContainer: { 
    paddingHorizontal: SPACING[2]
  },
  label: { 
    fontSize: FONT_SIZE.base, 
    fontWeight: FONT_WEIGHT.medium, 
    color: COLORS.textPrimary, 
    marginBottom: SPACING[2], 
    marginTop: SPACING[4] 
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: { 
    borderWidth: 1, 
    borderColor: 'transparent', 
    borderRadius: 30, 
    padding: SPACING[4], 
    fontSize: FONT_SIZE.base, 
    color: COLORS.textPrimary, 
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING[4],
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING[4],
    marginBottom: SPACING[8],
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[2],
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
  loginButton: { 
    backgroundColor: COLORS.primaryDark, 
    borderRadius: 30, 
    padding: SPACING[4], 
    alignItems: 'center', 
  },
  loginButtonDisabled: { 
    opacity: 0.7 
  },
  loginButtonText: { 
    color: COLORS.white, 
    fontSize: FONT_SIZE.lg, 
    fontWeight: FONT_WEIGHT.semiBold 
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.grey300,
  },
  dividerText: {
    marginHorizontal: SPACING[3],
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  socialButton: {
    flexDirection: 'row',
    height: 50,
    width: '100%',
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grey200,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: SPACING[3],
  },
  socialButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING[8],
  },
  footerText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  footerLink: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primaryDark,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default LoginScreen;
