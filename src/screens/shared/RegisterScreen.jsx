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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/spacing';
import { registerWithEmail, signInWithGoogle } from '../../services/authService';
import { AUTH_SCREENS } from '../../navigation/AuthNavigator';
import { USER_ROLE } from '../../constants/userRole';

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(USER_ROLE.TENANT);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const validate = () => {
    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', t('common.errors.required'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', t('auth.errors.emailInvalid'));
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Error', t('auth.errors.passwordTooShort'));
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error', 'Error'), t('auth.errors.passwordMismatch', 'Password mismatch'));
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    const { data, error } = await registerWithEmail({
      email: email.trim().toLowerCase(),
      password,
      role: selectedRole,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
    });
    setIsLoading(false);

    if (error) {
      const isAlreadyRegistered = error.message?.toLowerCase().includes('already registered') || error.code === 'user_already_exists';
      if (isAlreadyRegistered) {
        Alert.alert(
          t('auth.notRegisteredTitle', 'Akun Sudah Terdaftar'),
          t('auth.errors.emailAlreadyUsed', 'Email ini sudah terdaftar. Silakan gunakan menu Login.'),
          [
            { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
            { text: t('auth.loginNow', 'Masuk (Login)'), onPress: () => navigation.navigate(AUTH_SCREENS.LOGIN) }
          ]
        );
      } else {
        Alert.alert(t('auth.registerFailedTitle', 'Registrasi Gagal'), error.message);
      }
      return;
    }

    // Jika Supabase mengaktifkan "Confirm Email", session akan null
    if (!data?.session) {
      Alert.alert(
        t('auth.registerSuccessTitle', 'Registrasi Berhasil!'),
        t('auth.registerSuccessEmailMsg', 'Silakan periksa kotak masuk email Anda untuk memverifikasi akun Anda sebelum login.'),
        [{ text: 'OK', onPress: () => navigation.navigate(AUTH_SCREENS.LOGIN) }]
      );
    } else {
      Alert.alert(
        t('auth.registerSuccessTitle2', 'Registrasi Berhasil! 🎉'),
        t('auth.registerSuccessMsg', 'Akun Anda berhasil dibuat. Anda sekarang masuk.'),
        [{ text: t('common.buttons.next', 'Lanjutkan'), onPress: () => { } }] // AppNavigator will auto route
      );
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle(selectedRole);
    setIsLoading(false);

    if (error) {
      if (error.code === 'ALREADY_REGISTERED') {
        Alert.alert(
          t('auth.notRegisteredTitle', 'Akun Sudah Terdaftar'),
          error.message,
          [
            { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
            {
              text: t('auth.loginNow', 'Masuk (Login)'),
              onPress: () => navigation.navigate(AUTH_SCREENS.LOGIN)
            }
          ]
        );
      } else {
        Alert.alert(t('common.error', 'Error'), error.message);
      }
    }
  };

  const RoleCard = ({ role, label, description, style }) => {
    const isSelected = selectedRole === role;
    return (
      <TouchableOpacity
        style={[styles.roleCard, style, isSelected && styles.roleCardSelected]}
        onPress={() => setSelectedRole(role)}
        activeOpacity={0.7}
      >
        <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>{label}</Text>
        <Text style={[styles.roleDescription, isSelected && styles.roleDescriptionSelected]}>{description}</Text>
        {isSelected && (
          <View style={styles.roleCheckBadge}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: COLORS.background || '#EDF4F7' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: Math.max((insets?.top || 0) + 16, 48), paddingBottom: Math.max((insets?.bottom || 0) + 16, 48) }]} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('auth.register.title') || 'Create Account'}</Text>
          <Text style={styles.subtitle}>{t('auth.register.subtitle') || 'Sign up and explore KosanKu'}</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Role Selector */}
          <View style={[styles.roleRow, { flexWrap: 'wrap' }]}>
            <RoleCard
              role={USER_ROLE.TENANT}
              label={t('auth.register.roleTenant') || 'Pencari Kosan'}
              description="Cari & sewa kos"
              style={{ minWidth: '47%' }}
            />
            <RoleCard
              role={USER_ROLE.OWNER}
              label={t('auth.register.roleOwner') || 'Pemilik Kosan'}
              description="Kelola properti"
              style={{ minWidth: '47%' }}
            />
          </View>

          {/* Nama Lengkap */}
          <Text style={styles.label}>{t('auth.register.fullNameLabel') || 'Nama Lengkap'}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.register.fullNamePlaceholder') || 'Enter your name'}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Nomor Handphone */}
          <Text style={styles.label}>Nomor Handphone</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 08123456789"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>{t('auth.register.emailLabel') || 'Email'}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.register.emailPlaceholder') || 'Enter your email'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>{t('auth.register.passwordLabel') || 'Password'}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder={t('auth.register.passwordPlaceholder') || 'Enter your password'}
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

          {/* Confirm Password */}
          <Text style={styles.label}>{t('auth.register.confirmPasswordLabel') || 'Confirm Password'}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder={t('auth.register.confirmPasswordPlaceholder') || 'Confirm your password'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={COLORS.textTertiary}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

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
              <Text style={styles.registerBtnText}>{t('auth.register.registerButton') || 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.login.or') || 'OR'}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialLoginContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
              <Image
                source={{ uri: 'https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png' }}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Sign up with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>{t('auth.register.alreadyHaveAccount', 'Already have an account?')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate(AUTH_SCREENS.LOGIN)}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#EDF4F7',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING[6],
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: SPACING[10],
    marginBottom: SPACING[6],
  },
  logoImage: {
    width: 200,
    height: 120
  },
  title: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginTop: SPACING[1],
  },
  formContainer: {
    paddingHorizontal: SPACING[2],
  },
  roleRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  roleCardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.primarySurface,
  },
  roleLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roleLabelSelected: {
    color: COLORS.primaryDark,
  },
  roleDescription: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleDescriptionSelected: {
    color: COLORS.primaryDark,
  },
  roleCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING[1],
    marginTop: SPACING[4],
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
  registerBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 30,
    padding: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[8],
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semiBold,
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

export default RegisterScreen;
