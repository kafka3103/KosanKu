import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/spacing';
import { updatePassword, logout } from '../../services/authService';
import { AUTH_SCREENS } from '../../constants/screenNames';
import useAuthStore from '../../store/authStore';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email, otp } = route.params || {};
  const { t } = useTranslation();
  const { clearAuthState } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', t('common.errors.required'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password dan Konfirmasi Password tidak cocok');
      return;
    }

    setIsLoading(true);

    // Update password. Session was already created in OTPVerificationScreen
    const { error: updateError } = await updatePassword({ newPassword: password });
    setIsLoading(false);

    if (updateError) {
      Alert.alert('Error', updateError.message);
    } else {
      setShowSuccessModal(true);
    }
  };

  const handleDone = async () => {
    setShowSuccessModal(false);
    // Logout the temporary session so user has to log in with new password
    await logout();
    clearAuthState();
    // Use reset to avoid back navigation taking them back to OTP
    navigation.reset({
      index: 0,
      routes: [{ name: AUTH_SCREENS.LOGIN }],
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{t('auth.login.forgotPassword.newPasswordTitle') || 'Enter New Password'}</Text>
          <Text style={styles.subtitle}>{t('auth.login.forgotPassword.newPasswordSubtitle') || 'Please enter your new password.'}</Text>

          <Text style={styles.label}>{t('auth.login.forgotPassword.newPasswordLabel') || 'New Password'}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.login.forgotPassword.newPasswordPlaceholder') || 'Enter your new password'}
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

          <Text style={styles.label}>{t('auth.login.forgotPassword.confirmPasswordLabel') || 'Confirm Password'}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.login.forgotPassword.confirmPasswordPlaceholder') || 'Enter your confirm password'}
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

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login.forgotPassword.confirmButton') || 'Confirm'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="checkmark" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.modalTitle}>{t('auth.login.forgotPassword.successTitle') || 'Successful'}</Text>
              <Text style={styles.modalSubtitle}>
                {t('auth.login.forgotPassword.successSubtitle') || 'Your password has been updated successfully. You can now use your new password to log in securely.'}
              </Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleDone}>
                <Text style={styles.modalButtonText}>{t('auth.login.forgotPassword.doneButton') || 'Done'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF4F7',
  },
  backButton: {
    marginTop: SPACING[12],
    marginLeft: SPACING[6],
    marginBottom: SPACING[4],
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING[6],
    paddingTop: SPACING[6],
  },
  title: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING[2],
    marginBottom: SPACING[8],
    paddingHorizontal: SPACING[4],
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
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
    paddingRight: 50,
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
  button: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 30,
    padding: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[10],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[6],
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: SPACING[6],
    alignItems: 'center',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING[6],
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 30,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[10],
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  }
});

export default ResetPasswordScreen;
