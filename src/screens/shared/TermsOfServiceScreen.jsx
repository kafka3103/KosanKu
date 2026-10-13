import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { USER_ROLE } from '../../constants/userRole';
import { TENANT_SCREENS, OWNER_SCREENS } from '../../constants/screenNames';

const TermsOfServiceScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userRole = useAuthStore(state => state.userRole);

  const handleBack = useCallback(() => {
    if (userRole === USER_ROLE.OWNER) {
      navigation.navigate(OWNER_SCREENS.SETTINGS);
    } else {
      navigation.navigate(TENANT_SCREENS.SETTINGS);
    }
    return true; // prevent default behavior
  }, [navigation, userRole]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => handleBack();
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [handleBack])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={handleBack} style={{ paddingRight: SPACING[2] }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} style={{ marginRight: 12 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('termsOfServiceScreen.title', 'Syarat & Ketentuan')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {t('termsOfServiceScreen.sections', { returnObjects: true }).map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={section.icon} size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING[6],
    paddingBottom: SPACING[4],
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  content: {
    padding: SPACING[5],
    paddingBottom: 60,
  },
  introCard: {
    alignItems: 'center',
    marginBottom: SPACING[6],
    paddingHorizontal: SPACING[2],
  },
  introIcon: {
    marginBottom: SPACING[3],
  },
  introText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: FONT_WEIGHT.medium,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '20', // subtle transparent background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  sectionContent: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  outroContainer: {
    marginTop: SPACING[4],
    padding: SPACING[4],
    backgroundColor: COLORS.grey100,
    borderRadius: 12,
  },
  outroText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default TermsOfServiceScreen;
