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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { logout, loginWithEmail, deactivateAccount, sendPasswordResetEmail, updatePassword } from '../../services/authService';
import { saveLanguagePreference } from '../../localization/i18n';
import { scheduleLocalNotification } from '../../utils/notificationUtils';

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { clearAuthState } = useAuthStore();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);

  // States for delete account
  const { currentUser, currentSession } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const providers = currentSession?.user?.app_metadata?.providers || [];
  const isGoogleOnly = providers.includes('google') && !providers.includes('email');
  const currentLang = i18n.language;

  const handleChangeLanguage = () => {
    setShowLanguageModal(true);
  };

  const handleSelectLanguage = (langCode) => {
    setShowLanguageModal(false);
    setTimeout(() => {
      saveLanguagePreference(langCode);
    }, 300);
  };

  const handleChangePassword = () => {
    Alert.alert(
      t('settings.changePasswordTitle', 'Ubah Password'),
      t('settings.changePasswordMsg', 'Fitur ubah password akan membuka halaman reset via email.'),
      [
        { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('settings.btnSendResetEmail', 'Kirim Email Reset'),
          onPress: async () => {
            if (!currentUser?.email) {
              Alert.alert(t('common.error', 'Error'), t('settings.noEmailFound', 'Email pengguna tidak ditemukan.'));
              return;
            }
            const { error } = await sendPasswordResetEmail({ email: currentUser.email });
            if (error) {
              Alert.alert(t('common.error', 'Gagal'), error.message || t('settings.emailSendFailMsg', 'Gagal mengirim email reset password.'));
            } else {
              Alert.alert(t('settings.emailSentTitle', 'Email Terkirim'), t('settings.emailSentMsg', 'Cek inbox email Anda untuk kode OTP reset password.'));
              navigation.navigate('OtpVerification', { email: currentUser.email });
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const executeDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert(t('common.error', 'Error'), isGoogleOnly ? t('settings.deleteConfirmEmail', 'Harap ketik {{email}} untuk konfirmasi.', { email: currentUser?.email }) : t('settings.deleteEmptyPassword', 'Harap masukkan password Anda.'));
      return;
    }

    if (isGoogleOnly && deletePassword.trim().toLowerCase() !== currentUser?.email?.toLowerCase()) {
      Alert.alert(t('common.error', 'Error'), t('settings.deleteWrongEmail', 'Ketik email Anda dengan benar untuk mengonfirmasi penghapusan akun.'));
      return;
    }

    setIsDeleting(true);

    if (!isGoogleOnly) {
      // Verifikasi password dengan mencoba login ulang
      const { error: verifyError } = await loginWithEmail({ email: currentUser.email, password: deletePassword });

      if (verifyError) {
        setIsDeleting(false);
        Alert.alert(t('common.fail', 'Gagal'), t('settings.deleteWrongPassword', 'Password salah atau terjadi kesalahan.'));
        return;
      }
    }

    // Jika password benar, lanjutkan nonaktifkan akun
    const { error: deleteError } = await deactivateAccount();
    setIsDeleting(false);

    if (deleteError) {
      Alert.alert(t('common.fail', 'Gagal'), t('settings.deleteFailMsg', 'Terjadi kesalahan saat menghapus akun. Silakan hubungi support@kosanku.id'));
    } else {
      setShowDeleteModal(false);
      Alert.alert(t('common.success', 'Sukses'), t('settings.deleteSuccessMsg', 'Akun berhasil dihapus.'), [
        {
          text: 'OK',
          onPress: async () => {
            await logout();
            clearAuthState();
          }
        }
      ]);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logoutTitle', 'Keluar'), t('settings.logoutConfirm', 'Yakin ingin keluar dari akun?'), [
      { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
      {
        text: t('settings.logoutTitle', 'Keluar'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearAuthState();
        },
      },
    ]);
  };

  const handleSupportWhatsApp = () => {
    setShowSupportModal(false);
    const message = encodeURIComponent(t('supportModal.waTemplate', 'Halo Admin KosanKu, saya butuh bantuan terkait aplikasi KosanKu.'));
    Linking.openURL(`https://wa.me/6288214717823?text=${message}`);
  };

  const handleSupportEmail = () => {
    setShowSupportModal(false);
    Linking.openURL('mailto:projectprg6.kosanku@gmail.com');
  };

  const SettingRow = ({ icon, label, value, onPress, rightElement, showArrow = true }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && <Ionicons name={icon} size={24} color={COLORS.textSecondary} style={{ marginRight: SPACING[3] }} />}
        <View style={styles.settingLeft}>
          <Text style={styles.settingLabel}>{label}</Text>
          {!!value && <Text style={styles.settingValue}>{value}</Text>}
        </View>
      </View>
      {rightElement ?? (!!showArrow && !!onPress && <Text style={styles.settingArrow}>›</Text>)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} style={{ marginRight: 12 }} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}>
        {/* Preferensi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.preferences.title')}</Text>
          <SettingRow
            icon="language-outline"
            label={t('settings.preferences.language')}
            value={currentLang === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
            onPress={handleChangeLanguage}
          />
        </View>

        {/* Akun */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account.title')}</Text>
          <SettingRow
            icon="key-outline"
            label={t('settings.account.changePassword')}
            onPress={handleChangePassword}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label={t('settings.account.privacyPolicy')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingRow
            icon="document-text-outline"
            label={t('settings.account.termsOfService')}
            onPress={() => navigation.navigate('TermsOfService')}
          />
          <SettingRow
            icon="headset-outline"
            label={t('settings.contactSupport', 'Hubungi Support')}
            onPress={() => setShowSupportModal(true)}
          />
        </View>

        {/* Zona Bahaya */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.accountSection', 'Akun')}</Text>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={[styles.logoutText, { marginLeft: 8 }]}>{t('profile.logoutButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteRow}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={[styles.deleteText, { marginLeft: 8 }]}>{t('settings.deleteAccount', 'Nonaktifkan Akun')}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Version */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>KosanKu v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2025 KosanKu. All rights reserved.</Text>
        </View>
      </ScrollView>
      {/* Modal Hapus Akun */}
      {showDeleteModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('settings.deleteAccount', 'Nonaktifkan Akun')}</Text>
                <TouchableOpacity onPress={() => setShowDeleteModal(false)} disabled={isDeleting}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                {t('settings.deleteWarning', 'Tindakan ini akan menonaktifkan akun Anda. Profil dan data Anda akan disembunyikan. Lanjutkan?')}
              </Text>

              <View style={styles.inputContainer}>
                {!isGoogleOnly && (
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
                )}
                <TextInput
                  key={modalKey}
                  style={styles.input}
                  placeholder={isGoogleOnly ? `Ketik "${currentUser?.email}"` : "Password"}
                  secureTextEntry={!isGoogleOnly}
                  onChangeText={setDeletePassword}
                  editable={!isDeleting}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, isDeleting && { opacity: 0.7 }]}
                onPress={executeDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalDeleteBtnText}>{t('settings.deleteAccount', 'Nonaktifkan Akun')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal Bahasa */}
      {showLanguageModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('settings.languageTitle', 'Bahasa / Language')}</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                {t('settings.languageMsg', 'Pilih bahasa aplikasi:')}
              </Text>

              <TouchableOpacity
                style={styles.languageOptionBtn}
                onPress={() => handleSelectLanguage('id')}
              >
                <Text style={styles.languageOptionText}>🇮🇩 Bahasa Indonesia</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.languageOptionBtn}
                onPress={() => handleSelectLanguage('en')}
              >
                <Text style={styles.languageOptionText}>🇬🇧 English</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal Contact Support */}
      <Modal
        visible={showSupportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('supportModal.title', 'Hubungi Support')}</Text>

            <TouchableOpacity style={styles.supportOption} onPress={handleSupportWhatsApp}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.supportOptionText}>{t('supportModal.whatsapp', 'Chat via WhatsApp')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOption} onPress={handleSupportEmail}>
              <Ionicons name="mail" size={24} color={COLORS.primary} />
              <Text style={styles.supportOptionText}>{t('supportModal.email', 'Kirim via Email')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalDeleteBtn, { backgroundColor: COLORS.grey300, marginTop: SPACING[4] }]}
              onPress={() => setShowSupportModal(false)}
            >
              <Text style={styles.modalDeleteBtnText}>{t('common.buttons.cancel', 'Batal')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  logoutText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[4],
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[5],
    ...SHADOW.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[4],
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    marginBottom: SPACING[5],
  },
  inputIcon: {
    marginRight: SPACING[2],
  },
  input: {
    flex: 1,
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  modalDeleteBtn: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  modalDeleteBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  languageOptionBtn: {
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  languageOptionText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: COLORS.grey100,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING[3],
    width: '100%',
  },
  supportOptionText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    marginLeft: SPACING[3],
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default SettingsScreen;

