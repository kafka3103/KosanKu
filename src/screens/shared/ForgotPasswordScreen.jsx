import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/spacing';
import { sendPasswordResetEmail } from '../../services/authService';
import { AUTH_SCREENS } from '../../constants/screenNames';

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Error', t('common.errors.required'));
      return;
    }

    setIsLoading(true);
    const { error } = await sendPasswordResetEmail({ email });
    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.navigate(AUTH_SCREENS.OTP_VERIFICATION, { email });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{t('auth.login.forgotPassword.title') || 'Enter Your Email to Proceed'}</Text>
        <Text style={styles.subtitle}>{t('auth.login.forgotPassword.subtitle') || 'Please enter your registered email to continue.'}</Text>

        <Text style={styles.label}>{t('auth.login.forgotPassword.emailLabel') || 'Email'}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.login.forgotPassword.emailPlaceholder') || 'uiuxrouf2202@gmail.com'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.textTertiary}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.login.forgotPassword.sendOtpButton') || 'Send OTP'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
});

export default ForgotPasswordScreen;
