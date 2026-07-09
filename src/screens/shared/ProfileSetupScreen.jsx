/**
 * screens/shared/ProfileSetupScreen.jsx
 * Screen setup profil setelah registrasi pertama kali
 * Wajib diisi sebelum user bisa akses fitur utama
 */

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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { updateUserProfile, uploadAvatar, markProfileComplete } from '../../services/userService';
import { USER_ROLE } from '../../constants/userRole';

const ProfileSetupScreen = () => {
  const { t } = useTranslation();
  const { currentUser, currentSession, setAuthenticatedUser, userRole } = useAuthStore();

  const [fullName, setFullName] = useState(currentUser?.full_name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone_number ?? '');
  const [avatarUri, setAvatarUri] = useState(currentUser?.avatar_url ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const isOwner = userRole === USER_ROLE.OWNER;

  const handlePickAvatar = async () => {
    setIsPickingImage(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Diperlukan', 'Akses galeri foto diperlukan untuk mengubah foto profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Nama lengkap wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      const userId = currentUser?.id ?? currentSession?.user?.id;
      let avatarUrl = currentUser?.avatar_url ?? null;

      // Upload avatar jika ada gambar baru (bukan URL yang sudah ada di server)
      if (avatarUri && !avatarUri.startsWith('http')) {
        const { url, error: uploadError } = await uploadAvatar(userId, avatarUri);
        if (uploadError) {
          console.warn('Gagal upload avatar:', uploadError.message);
        } else {
          avatarUrl = url;
        }
      }

      // Ambil email dari sesi yang login
      const email = currentSession?.user?.email ?? null;

      // Update profil dasar
      const { data: updatedProfile, error } = await updateUserProfile(userId, {
        role: userRole || 'tenant', // Default ke tenant jika null
        email: email,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl,
        is_profile_complete: true,
      });

      if (error) {
        Alert.alert('Gagal Menyimpan', error.message);
        return;
      }

      // Update zustand store — AppNavigator akan otomatis redirect
      setAuthenticatedUser(currentSession, updatedProfile);
    } catch (err) {
      Alert.alert('Error', 'Terjadi kesalahan, coba lagi.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const AvatarSection = () => (
    <View style={styles.avatarSection}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={handlePickAvatar}
        disabled={isPickingImage}
        activeOpacity={0.8}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {fullName?.[0]?.toUpperCase() ?? (isOwner ? 'O' : 'T')}
            </Text>
          </View>
        )}
        <View style={styles.avatarEditBadge}>
          {isPickingImage ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.avatarEditText}>📷</Text>
          )}
        </View>
      </TouchableOpacity>
      <Text style={styles.avatarHint}>{t('auth.profileSetup.changeAvatar')}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.roleTag, isOwner ? styles.roleTagOwner : styles.roleTagTenant]}>
            <Text style={styles.roleTagText}>
              {isOwner ? '🏠 Pemilik Kosan' : '🔍 Pencari Kosan'}
            </Text>
          </View>
          <Text style={styles.title}>{t('auth.profileSetup.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.profileSetup.subtitle')}</Text>
        </View>

        {/* Avatar */}
        <AvatarSection />

        {/* Form */}
        <View style={styles.form}>
          {/* Nama */}
          <Text style={styles.label}>{t('auth.register.fullNameLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.register.fullNamePlaceholder')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholderTextColor={COLORS.textTertiary}
          />

          {/* Nomor Telepon */}
          <Text style={styles.label}>{t('auth.register.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="+628123456789"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textTertiary}
          />
          <Text style={styles.fieldHint}>
            Format internasional dengan kode negara (+62 untuk Indonesia)
          </Text>

          {/* Info khusus owner */}
          {isOwner && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>💡 Selanjutnya</Text>
              <Text style={styles.infoBoxText}>
                Setelah profil tersimpan, Anda bisa langsung menambahkan properti kos pertama Anda dari Dashboard.
              </Text>
            </View>
          )}

          {/* Info khusus tenant */}
          {!isOwner && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>💡 Selanjutnya</Text>
              <Text style={styles.infoBoxText}>
                Profil lengkap memudahkan pemilik kos untuk mempertimbangkan pengajuan sewa Anda.
              </Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('auth.profileSetup.saveButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: SPACING[5],
    paddingBottom: SPACING[12],
  },
  header: {
    marginTop: SPACING[10],
    marginBottom: SPACING[6],
    alignItems: 'center',
  },
  roleTag: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING[4],
  },
  roleTagOwner: {
    backgroundColor: COLORS.primarySurface,
  },
  roleTagTenant: {
    backgroundColor: COLORS.secondarySurface,
  },
  roleTagText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primary,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING[1],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING[2],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.md,
  },
  avatarInitial: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarEditText: {
    fontSize: 14,
  },
  avatarHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    ...SHADOW.sm,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING[1],
    marginTop: SPACING[4],
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.grey50,
  },
  fieldHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    marginTop: SPACING[5],
  },
  infoBoxTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primaryDark,
    marginBottom: SPACING[1],
  },
  infoBoxText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    lineHeight: 20,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[6],
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default ProfileSetupScreen;
