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
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import DrawerButton from '../../components/navigation/DrawerButton';
import REGIONS_DATA from '../../constants/cities.json';

const ALL_CITIES = REGIONS_DATA.reduce((acc, region) => [...acc, ...region.kota], []).sort();

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getUserProfile, updateUserProfile, uploadAvatar, getTenantProfile, upsertTenantProfile } from '../../services/userService';
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

const SelectableInfoRow = ({ label, value, onPress, icon, placeholder }) => (
  <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.infoIcon} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoInput, !value && { color: COLORS.textTertiary }]}>
        {value || placeholder}
      </Text>
    </View>
    <Ionicons name="chevron-down-outline" size={20} color={COLORS.textTertiary} />
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser, currentSession, clearAuthState, setAuthenticatedUser, userRole, switchRole } = useAuthStore();

  const [profile, setProfile] = useState(currentUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [homeCity, setHomeCity] = useState('');

  // Tenant Specific States
  const [occupation, setOccupation] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [isGenderModalVisible, setIsGenderModalVisible] = useState(false);
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [citySearchText, setCitySearchText] = useState('');

  const filteredCities = ALL_CITIES.filter(city => city.toLowerCase().includes(citySearchText.toLowerCase()));

  const isOwner = userRole === USER_ROLE.OWNER;

  const loadProfile = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    const { data, error } = await getUserProfile(currentUser.id, userRole);
    if (!error && data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhoneNumber(data.phone_number || '');
      setGender(data.gender || '');
      setHomeCity(data.home_city || '');
    }

    if (!isOwner) {
      const { data: tenantData } = await getTenantProfile(currentUser.id);
      if (tenantData) {
        setOccupation(tenantData.occupation || '');
        setEmergencyName(tenantData.emergency_contact_name || '');
        setEmergencyPhone(tenantData.emergency_contact_phone || '');
      }
    }

    if (!silent) setIsRefreshing(false);
  }, [currentUser?.id, userRole, isOwner]);

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
      Alert.alert(t('common.buttons.error', 'Gagal'), t('profile.uploadFail', 'Tidak bisa upload foto profil'));
    }
    setIsUploadingAvatar(false);
  };

  const pickAvatarFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('profile.permissionReq', 'Izin Diperlukan'), t('profile.cameraReq', 'Akses kamera diperlukan untuk mengambil foto profil.'));
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
      Alert.alert(t('profile.permissionReq', 'Izin Diperlukan'), t('profile.galleryReq', 'Akses galeri foto diperlukan.'));
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
      t('profile.avatarSource', 'Foto Profil'),
      t('profile.chooseSource', 'Pilih sumber foto profil Anda'),
      [
        { text: t('profile.camera', 'Kamera'), onPress: pickAvatarFromCamera },
        { text: t('profile.gallery', 'Galeri'), onPress: pickAvatarFromGallery },
        { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutButton', 'Keluar'),
      t('profile.confirmLogout', 'Yakin ingin keluar dari akun?'),
      [
        { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('profile.logoutButton', 'Keluar'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            clearAuthState();
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.buttons.error', 'Error'), t('profile.nameReq', 'Nama Lengkap wajib diisi'));
      return;
    }
    setIsSaving(true);
    const { data, error } = await updateUserProfile(currentUser.id, {
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim() || null,
      gender: gender.trim() || null,
      home_city: homeCity.trim() || null,
      is_profile_complete: true,
    });

    let tenantError = null;
    if (!isOwner) {
      const { error: tError } = await upsertTenantProfile(currentUser.id, {
        occupation: occupation.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
      });
      tenantError = tError;
    }

    setIsSaving(false);

    if (error || tenantError) {
      Alert.alert(t('common.buttons.error', 'Gagal'), error?.message || tenantError?.message || t('profile.saveFailed', 'Gagal menyimpan profil'));
    } else if (data) {
      Alert.alert(t('common.buttons.success', 'Berhasil'), t('profile.updateSuccess', 'Profil berhasil diperbarui'));
      setProfile(data);
      setAuthenticatedUser(currentSession, data);
    }
  };

  const handleSwitchRole = () => {
    if (currentUser.role !== USER_ROLE.BOTH) {
      const targetRole = isOwner ? USER_ROLE.TENANT : USER_ROLE.OWNER;
      navigation.navigate('RoleRegistrationScreen', { targetRole });
      return;
    }

    const targetRoleText = isOwner ? t('profile.tenant', 'Pencari Kosan') : t('profile.owner', 'Pemilik Kosan');
    Alert.alert(
      t('profile.switchRole', 'Beralih Peran'),
      t('profile.switchPrompt', `Apakah Anda ingin beralih mode aplikasi menjadi ${targetRoleText}?`, { role: targetRoleText }),
      [
        { text: t('common.buttons.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('profile.switchNow', 'Beralih'),
          onPress: () => {
            switchRole();
          },
        },
      ]
    );
  };

  return (
    <>
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
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <DrawerButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          </View>
        </View>
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
            {isOwner ? t('profile.owner', 'Pemilik Kosan') : t('profile.tenant', 'Pencari Kosan')}
          </Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('profile.editButton')}</Text>
        </View>
        <EditableInfoRow
          label={t('profile.fullNameLabel', 'Nama Lengkap')}
          value={fullName}
          onChangeText={setFullName}
          icon="person-outline"
          placeholder={t('profile.fullNameLabel', 'Nama Lengkap')}
        />
        <InfoRow label={t('profile.emailLabel', 'Email')} value={profile?.email ?? currentUser?.email} icon="mail-outline" />
        <EditableInfoRow
          label={t('profile.phoneLabel', 'Nomor Telepon')}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          icon="call-outline"
          placeholder="+628123456789"
          keyboardType="phone-pad"
        />
        <SelectableInfoRow
          label={t('profile.genderLabel', 'Jenis Kelamin')}
          value={gender}
          onPress={() => setIsGenderModalVisible(true)}
          icon="male-female-outline"
          placeholder={t('profile.genderPlaceholder', 'Pilih Jenis Kelamin')}
        />
        <SelectableInfoRow
          label={t('profile.cityLabel', 'Kota Asal')}
          value={homeCity}
          onPress={() => setIsCityModalVisible(true)}
          icon="location-outline"
          placeholder={t('profile.cityPlaceholder', 'Cari Kota/Kabupaten')}
        />
        <InfoRow
          label={t('profile.statusLabel', 'Status Profil')}
          value={profile?.is_profile_complete ? t('profile.complete', 'Lengkap') : t('profile.incomplete', 'Belum Lengkap')}
          icon={profile?.is_profile_complete ? "checkmark-circle" : "warning"} iconColor={profile?.is_profile_complete ? COLORS.success : COLORS.warning}
        />

        {!isOwner && (
          <>
            <View style={[styles.sectionHeader, { marginTop: SPACING[4] }]}>
              <Text style={styles.sectionTitle}>Data Tambahan Pencari Kos</Text>
            </View>
            <EditableInfoRow
              label="Pekerjaan / Status"
              value={occupation}
              onChangeText={setOccupation}
              icon="briefcase-outline"
              placeholder="Cth: Mahasiswa, Karyawan"
            />
            <EditableInfoRow
              label="Nama Kontak Darurat"
              value={emergencyName}
              onChangeText={setEmergencyName}
              icon="shield-checkmark-outline"
              placeholder="Nama kerabat/keluarga"
            />
            <EditableInfoRow
              label="No. Telp Darurat"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              icon="call-outline"
              placeholder="Contoh: +628123456789"
              keyboardType="phone-pad"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.saveProfileBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveProfileBtnText}>{t('profile.saveButton')}</Text>}
        </TouchableOpacity>
      </View>

      {/* Switch Role Section */}
      <View style={[styles.section, { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primaryLight, borderWidth: 1 }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: COLORS.primaryDark, marginBottom: 0 }]}>
            {currentUser.role === USER_ROLE.BOTH ? t('profile.switchRole', 'Beralih Peran') : t('profile.registerOtherRole', 'Daftar Peran Lain')}
          </Text>
        </View>
        <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING[4], lineHeight: 20 }}>
          {isOwner
            ? t('profile.tenantPrompt', 'Ingin mencari kosan? Anda bisa mendaftar atau beralih ke mode Pencari Kosan sekarang.')
            : t('profile.ownerPrompt', 'Punya properti kosan? Anda bisa mendaftar atau beralih ke mode Pemilik Kosan untuk mulai mengelola.')}
        </Text>
        <TouchableOpacity
          style={[styles.saveProfileBtn, { backgroundColor: COLORS.primary }]}
          onPress={handleSwitchRole}
          disabled={isSaving}
        >
          <Text style={styles.saveProfileBtnText}>
            {currentUser.role === USER_ROLE.BOTH
              ? (isOwner ? t('profile.switchTenantBtn', 'Beralih ke Pencari Kosan') : t('profile.switchOwnerBtn', 'Beralih ke Pemilik Kosan'))
              : (isOwner ? t('profile.registerTenantBtn', 'Daftar sebagai Pencari Kos') : t('profile.registerOwnerBtn', 'Daftar sebagai Pemilik'))}
          </Text>
        </TouchableOpacity>
      </View>

      {/* About App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.aboutApp', 'Tentang Aplikasi')}</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>{t('profile.version', 'Versi')}</Text>
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
          <Text style={styles.logoutBtnText}>{t('profile.logoutButton', 'Keluar')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: insets.bottom + 100 }} />
    </ScrollView>

    {/* Gender Modal */}
    <Modal visible={isGenderModalVisible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsGenderModalVisible(false)}>
        <View style={styles.actionSheet}>
          <Text style={styles.actionSheetTitle}>Pilih Jenis Kelamin</Text>
          <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setGender('Laki-laki'); setIsGenderModalVisible(false); }}>
            <Text style={styles.actionSheetOptionText}>Laki-laki</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionSheetOption, { borderBottomWidth: 0 }]} onPress={() => { setGender('Perempuan'); setIsGenderModalVisible(false); }}>
            <Text style={styles.actionSheetOptionText}>Perempuan</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>

    {/* City Modal */}
    <Modal visible={isCityModalVisible} animationType="slide">
      <View style={[styles.container, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setIsCityModalVisible(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Pilih Kota Asal</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kota atau kabupaten..."
            value={citySearchText}
            onChangeText={setCitySearchText}
            autoFocus
          />
          {citySearchText ? (
            <TouchableOpacity onPress={() => setCitySearchText('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cityOption}
              onPress={() => {
                setHomeCity(item);
                setIsCityModalVisible(false);
                setCitySearchText('');
              }}
            >
              <Text style={styles.cityOptionText}>{item}</Text>
            </TouchableOpacity>
          )}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
    </>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  actionSheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: 15, textAlign: 'center' },
  actionSheetOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  actionSheetOptionText: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, margin: 15, paddingHorizontal: 15, borderRadius: BORDER_RADIUS.md, height: 45, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 10, fontSize: FONT_SIZE.base, color: COLORS.text },
  cityOption: { paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cityOptionText: { fontSize: FONT_SIZE.base, color: COLORS.text },
});

export default ProfileScreen;
