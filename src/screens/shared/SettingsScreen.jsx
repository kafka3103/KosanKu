/**
 * screens/shared/SettingsScreen.jsx
 * Halaman pengaturan aplikasi — shared Owner dan Tenant
 */

import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { logout, updatePassword } from '../../services/authService';

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { clearAuthState } = useAuthStore();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);

  const currentLang = i18n.language;

  const handleChangeLanguage = () => {
    Alert.alert(
      'Bahasa / Language',
      'Pilih bahasa aplikasi:',
      [
        {
          text: '🇮🇩 Bahasa Indonesia',
          onPress: () => i18n.changeLanguage('id'),
        },
        {
          text: '🇬🇧 English',
          onPress: () => i18n.changeLanguage('en'),
        },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Ubah Password',
      'Fitur ubah password akan membuka halaman reset via email.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kirim Email Reset',
          onPress: () => {
            Alert.alert('Email Terkirim', 'Cek inbox email Anda untuk link reset password.');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Hapus Akun',
      'Akun yang dihapus tidak dapat dipulihkan. Seluruh data Anda akan hilang.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Akun',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Hubungi Support', 'Untuk menghapus akun, hubungi support@kosanku.id'),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearAuthState();
        },
      },
    ]);
  };

  const SettingRow = ({ label, value, onPress, rightElement, showArrow = true }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {rightElement ?? (showArrow && onPress && <Text style={styles.settingArrow}>›</Text>)}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
              
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      {/* Notifikasi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.notifications.title')}</Text>
        <SettingRow
          label={t('settings.notifications.push')}
          rightElement={
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: COLORS.grey300, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <SettingRow
          label={t('settings.notifications.email')}
          rightElement={
            <Switch
              value={emailNotif}
              onValueChange={setEmailNotif}
              trackColor={{ false: COLORS.grey300, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
      </View>

      {/* Preferensi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.preferences.title')}</Text>
        <SettingRow
          label={t('settings.preferences.language')}
          value={currentLang === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
          onPress={handleChangeLanguage}
        />
      </View>

      {/* Akun */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account.title')}</Text>
        <SettingRow
          label={t('settings.account.changePassword')}
          onPress={handleChangePassword}
        />
        <SettingRow
          label={t('settings.account.privacyPolicy')}
          onPress={() => Linking.openURL('https://kosanku.id/privacy')}
        />
        <SettingRow
          label={t('settings.account.termsOfService')}
          onPress={() => Linking.openURL('https://kosanku.id/terms')}
        />
        <SettingRow
          label="Hubungi Support"
          onPress={() => Linking.openURL('mailto:support@kosanku.id')}
        />
      </View>

      {/* Zona Bahaya */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Akun</Text>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>🚪 {t('profile.logoutButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteRow}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteText}>🗑️ Hapus Akun</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Version */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>KosanKu v1.0.0</Text>
        <Text style={styles.footerSubtext}>© 2025 KosanKu. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: { marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[2],
    backgroundColor: COLORS.grey50,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingLeft: { flex: 1 },
  settingLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  settingValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textTertiary,
    marginLeft: SPACING[2],
  },
  logoutRow: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  logoutText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  deleteRow: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  deleteText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
    gap: SPACING[1],
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHT.medium,
  },
  footerSubtext: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
});

export default SettingsScreen;
