import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { AUTH_SCREENS } from '../../constants/screenNames';
import { sendPasswordResetEmail, verifyPasswordResetOtp } from '../../services/authService';

const OtpVerificationScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    const { error } = await sendPasswordResetEmail({ email });
    setIsResending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Berhasil', 'Kode OTP baru telah dikirim ke email Anda.');
      setCountdown(30);
    }
  };

  const handleConfirm = async () => {
    if (otp.length < 6) return;
    
    setIsVerifying(true);
    const { error } = await verifyPasswordResetOtp({ email, otpCode: otp });
    setIsVerifying(false);

    if (error) {
      Alert.alert('Error', error.message || 'Kode OTP tidak valid atau sudah kadaluarsa.');
      return;
    }
    
    // Jika valid, navigasi ke halaman Reset Password
    navigation.navigate(AUTH_SCREENS.RESET_PASSWORD, { email, otp });
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
          <Text style={styles.title}>{t('auth.login.forgotPassword.otpTitle') || 'Enter OTP to Verify Your Identity'}</Text>
          <Text style={styles.subtitle}>{t('auth.login.forgotPassword.otpSubtitle') || 'A one-time password (OTP) has been sent to your registered email address.'}</Text>

          <View style={styles.otpInputContainer}>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
              placeholder="• • • • • • • •"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={styles.resendText}>
                {t('auth.login.forgotPassword.resendCode') || 'Resend code in'} 00:{countdown.toString().padStart(2, '0')}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                {isResending ? (
                  <ActivityIndicator size="small" color={COLORS.primaryDark} />
                ) : (
                  <Text style={[styles.resendText, { textDecorationLine: 'underline', fontWeight: 'bold' }]}>
                    Kirim Ulang Kode OTP
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, (otp.length < 6 || isVerifying) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={otp.length < 6 || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login.forgotPassword.confirmButton') || 'Confirm'}</Text>
            )}
          </TouchableOpacity>
        </View>
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
  otpInputContainer: {
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  otpInput: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 30,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[8],
    fontSize: 24,
    letterSpacing: 8,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    minWidth: 200,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING[8],
  },
  resendText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryDark,
  },
  button: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 30,
    padding: SPACING[4],
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default OtpVerificationScreen;
