/**
 * screens/shared/RegisterScreen.jsx
 * Registrasi user baru dengan email + password
 * Pilihan role: Owner (Pemilik Kosan) atau Tenant (Pencari Kosan)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/spacing';
import { registerWithEmail } from '../../services/authService';
import { AUTH_SCREENS } from '../../navigation/AuthNavigator';
import { USER_ROLE } from '../../constants/userRole';

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(USER_ROLE.TENANT);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Nama lengkap wajib diisi';
    }
    if (!email.trim()) {
      newErrors.email = t('auth.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.errors.emailInvalid');
    }
    if (!password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.errors.passwordTooShort');
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    const { data, error } = await registerWithEmail({
      email: email.trim().toLowerCase(),
      password,
      role: selectedRole,
    });
    setIsLoading(false);

    if (error) {
      const msg = error.message?.includes('already registered')
        ? t('auth.errors.emailAlreadyUsed')
        : error.message;
      Alert.alert('Registrasi Gagal', msg);
      return;
    }

    // Registrasi berhasil — arahkan ke ProfileSetup
    // AppNavigator akan otomatis handle routing setelah auth state berubah
    Alert.alert(
      'Registrasi Berhasil! 🎉',
      'Akun Anda berhasil dibuat. Silakan lengkapi profil Anda.',
      [{ text: 'Lanjutkan', onPress: () => navigation.navigate(AUTH_SCREENS.PROFILE_SETUP) }]
    );
  };

  const RoleCard = ({ role, label, emoji, description }) => {
    const isSelected = selectedRole === role;
    return (
      <TouchableOpacity
        style={[styles.roleCard, isSelected && styles.roleCardSelected]}
        onPress={() => setSelectedRole(role)}
        activeOpacity={0.7}
      >
        <View style={styles.roleCardHeader}>
          <Text style={styles.roleEmoji}>{emoji}</Text>
          <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.roleDescription, isSelected && styles.roleDescriptionSelected]}>
          {description}
        </Text>
        {isSelected && (
          <View style={styles.roleCheckBadge}>
            <Text style={styles.roleCheckText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.appName}>KosanKu</Text>
          <Text style={styles.title}>{t('auth.register.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
        </View>

        {/* Role Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('auth.register.roleLabel')}</Text>
          <View style={styles.roleRow}>
            <RoleCard
              role={USER_ROLE.OWNER}
              label={t('auth.register.roleOwner')}
              emoji="🏠"
              description="Daftarkan dan kelola properti kos Anda"
            />
            <RoleCard
              role={USER_ROLE.TENANT}
              label={t('auth.register.roleTenant')}
              emoji="🔍"
              description="Cari dan sewa kos impian Anda"
            />
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Nama Lengkap */}
          <Text style={styles.label}>{t('auth.register.fullNameLabel')}</Text>
          <TextInput
            style={[styles.input, errors.fullName && styles.inputError]}
            placeholder={t('auth.register.fullNamePlaceholder')}
            value={fullName}
            onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: undefined })); }}
            autoCapitalize="words"
            placeholderTextColor={COLORS.textTertiary}
          />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          {/* Email */}
          <Text style={styles.label}>{t('auth.register.emailLabel')}</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder={t('auth.register.emailPlaceholder')}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textTertiary}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <Text style={styles.label}>{t('auth.register.passwordLabel')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, errors.password && styles.inputError]}
              placeholder={t('auth.register.passwordPlaceholder')}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.textTertiary}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Confirm Password */}
          <Text style={styles.label}>{t('auth.register.confirmPasswordLabel')}</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
            secureTextEntry={!showPassword}
            placeholderTextColor={COLORS.textTertiary}
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerBtnText}>{t('auth.register.registerButton')}</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate(AUTH_SCREENS.LOGIN)}
          >
            <Text style={styles.loginLinkText}>{t('auth.register.loginLink')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },
  header: {
    marginTop: SPACING[8],
    marginBottom: SPACING[6],
  },
  backBtn: {
    marginBottom: SPACING[4],
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  appName: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.extraBold,
    color: COLORS.primary,
    marginBottom: SPACING[1],
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginTop: SPACING[1],
  },
  section: {
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[3],
  },
  roleRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[2],
    gap: SPACING[2],
  },
  roleEmoji: {
    fontSize: 22,
  },
  roleLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  roleLabelSelected: {
    color: COLORS.primaryDark,
  },
  roleDescription: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  roleDescriptionSelected: {
    color: COLORS.primary,
  },
  roleCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleCheckText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING[1],
    marginTop: SPACING[4],
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.grey50,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.grey50,
  },
  passwordInput: {
    flex: 1,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    borderWidth: 0,
  },
  eyeButton: {
    padding: SPACING[3],
  },
  eyeText: {
    fontSize: 18,
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[6],
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: SPACING[4],
    paddingVertical: SPACING[2],
  },
  loginLinkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.base,
  },
});

export default RegisterScreen;
