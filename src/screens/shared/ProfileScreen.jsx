/**
 * screens/shared/ProfileScreen.jsx
 * Halaman profil user (shared antara Owner dan Tenant)
 * Menampilkan info profil, tombol edit, dan logout
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getUserProfile, updateUserProfile, uploadAvatar } from '../../services/userService';
import { logout, deleteAccount } from '../../services/authService';
import { USER_ROLE } from '../../constants/userRole';

const InfoRow = ({ label, value, icon, iconColor = COLORS.textSecondary }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color={iconColor} style={styles.infoIcon} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  </View>
);

const EditableInfoRow = ({ label, value, onChangeText, icon, placeholder, keyboardType = 'default' }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.infoIcon} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        style={styles.infoInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={COLORS.textTertiary}
      />
    </View>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser, currentSession, clearAuthState, setAuthenticatedUser, userRole } = useAuthStore();

  const [profile, setProfile] = useState(currentUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const isOwner = userRole === USER_ROLE.OWNER;

  const loadProfile = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    const { data, error } = await getUserProfile(currentUser.id, userRole);
    if (!error && data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhoneNumber(data.phone_number || '');
    }
    if (!silent) setIsRefreshing(false);
  }, [currentUser?.id, userRole]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const processAvatarUri = async (uri) => {
    if (!uri) return;
    setIsUploadingAvatar(true);
    const { url, error: uploadError } = await uploadAvatar(currentUser.id, uri);
    if (!uploadError && url) {
      const { data } = await updateUserProfile(currentUser.id, { avatar_url: url });
      if (data) {
        setProfile(data);
        setAuthenticatedUser(currentSession, data);
      }
    } else {
      Alert.alert('Gagal', 'Tidak bisa upload foto profil');
    }
    setIsUploadingAvatar(false);
  };

  const pickAvatarFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Akses kamera diperlukan untuk mengambil foto profil.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processAvatarUri(result.assets[0].uri);
    }
  };

  const pickAvatarFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Akses galeri foto diperlukan.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processAvatarUri(result.assets[0].uri);
    }
  };

  const handlePickAvatar = () => {
    Alert.alert(
      'Foto Profil',
      'Pilih sumber foto profil Anda',
      [
        { text: 'Kamera', onPress: pickAvatarFromCamera },
        { text: 'Galeri', onPress: pickAvatarFromGallery },
        { text: 'Batal', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutButton'),
      'Yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: t('profile.logoutButton'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            clearAuthState();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Apakah Anda yakin ingin menghapus akun ini secara permanen? Semua data Anda (termasuk properti/kamar yang Anda kelola atau sewa) akan ikut terhapus dan tidak dapat dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya, Hapus Permanen', 
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const { error } = await deleteAccount();
            setIsSaving(false);
            if (error) {
              Alert.alert('Gagal Menghapus Akun', error.message || 'Terjadi kesalahan saat menghapus akun.');
            } else {
              Alert.alert(
                'Akun Berhasil Dihapus',
                'Akun beserta seluruh data Anda telah dihapus secara permanen dari sistem.',
                [
                  { text: 'Tutup', onPress: () => useAuthStore.getState().clearAuthState() }
                ],
                { cancelable: false }
              );
            }
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Nama Lengkap wajib diisi');
      return;
    }
    setIsSaving(true);
    const { data, error } = await updateUserProfile(currentUser.id, {
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim() || null,
      is_profile_complete: true,
    });
    setIsSaving(false);

    if (error) {
      Alert.alert('Gagal', error.message);
    } else if (data) {
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
      setProfile(data);
      setAuthenticatedUser(currentSession, data);
    }
  };



  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); loadProfile(); }}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText}>Kembali</Text>
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handlePickAvatar}
          disabled={isUploadingAvatar}
          activeOpacity={0.8}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, isOwner ? styles.avatarOwner : styles.avatarTenant]}>
              <Text style={styles.avatarInitial}>
                {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {isUploadingAvatar ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="camera" size={16} color={COLORS.white} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{profile?.full_name ?? 'User'}</Text>
        <Text style={styles.profileEmail}>{profile?.email ?? currentUser?.email}</Text>

        {/* Role Badge */}
        <View style={[styles.roleBadge, isOwner ? styles.roleBadgeOwner : styles.roleBadgeTenant]}>
          <Text style={styles.roleBadgeText}>
            {isOwner ? 'Pemilik Kosan' : 'Pencari Kosan'}
          </Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('profile.editButton') || 'Informasi Akun'}</Text>
        </View>
        <EditableInfoRow 
          label="Nama Lengkap" 
          value={fullName} 
          onChangeText={setFullName}
          icon="person-outline" 
          placeholder="Masukkan nama lengkap"
        />
        <InfoRow label="Email" value={profile?.email ?? currentUser?.email} icon="mail-outline" />
        <EditableInfoRow 
          label="Nomor Telepon" 
          value={phoneNumber} 
          onChangeText={setPhoneNumber}
          icon="call-outline" 
          placeholder="Contoh: +628123456789"
          keyboardType="phone-pad"
        />
        <InfoRow
          label="Status Profil"
          value={profile?.is_profile_complete ? 'Lengkap' : 'Belum Lengkap'}
          icon={profile?.is_profile_complete ? "checkmark-circle" : "warning"} iconColor={profile?.is_profile_complete ? COLORS.success : COLORS.warning}
        />
        <TouchableOpacity
          style={[styles.saveProfileBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveProfileBtnText}>{t('profile.saveButton') || 'Simpan Perubahan'}</Text>}
        </TouchableOpacity>
      </View>

      {/* About App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Versi</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App</Text>
          <Text style={styles.aboutValue}>KosanKu</Text>
        </View>
      </View>

            <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutBtnText}>Keluar (Logout)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          <Text style={styles.deleteBtnText}>Hapus Akun Permanen</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: insets.bottom + 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[14],
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
  avatarSection: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING[6],
    marginBottom: SPACING[2],
  },
  avatarContainer: { position: 'relative', marginBottom: SPACING[3] },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.md,
  },
  avatarOwner: { backgroundColor: COLORS.primary },
  avatarTenant: { backgroundColor: COLORS.secondary },
  avatarInitial: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarEditText: { fontSize: 13 },
  profileName: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[1],
  },
  profileEmail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[3],
  },
  roleBadge: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  roleBadgeOwner: { backgroundColor: COLORS.primarySurface },
  roleBadgeTenant: { backgroundColor: COLORS.secondarySurface },
  roleBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primary,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    ...SHADOW.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING[3],
  },
  infoIcon: { width: 24, textAlign: 'center', marginRight: SPACING[2] },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  infoValue: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: 2,
  },
  infoInput: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
    paddingVertical: 0,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING[1],
  },
  saveProfileBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    alignItems: 'center',
    marginTop: SPACING[4],
  },
  saveProfileBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  aboutLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  aboutValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.errorLight,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
  },
  logoutBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    marginTop: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  deleteBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    marginTop: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  deleteBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default ProfileScreen;
