import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

const OtpScreen = () => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.screenName}>{t('auth.otp.title', 'OTP Verification')}</Text>
      <Text style={styles.scopeLabel}>PROBIS-01</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING[6] },
  screenName: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[2] },
  scopeLabel: { fontSize: FONT_SIZE.sm, color: COLORS.primary, backgroundColor: COLORS.primarySurface, paddingHorizontal: SPACING[3], paddingVertical: SPACING[1], borderRadius: 20 },
});

export default OtpScreen;
