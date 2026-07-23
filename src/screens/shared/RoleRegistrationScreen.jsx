import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { upsertOwnerProfile, upsertTenantProfile, updateUserProfile, getOwnerProfile, getTenantProfile, checkNikUnique } from '../../services/userService';
import USER_ROLE from '../../constants/userRole';

const RoleRegistrationScreen = ({ navigation, route }) => {
  const { targetRole, isCompletingProfile } = route.params || {};
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { currentUser, setAuthenticatedUser, currentSession, switchRole } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  
  // States
  const [ktpNumber, setKtpNumber] = useState('');
  
  // Tenant States
  const [occupation, setOccupation] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  const [isNiksLocked, setIsNiksLocked] = useState(false);

  React.useEffect(() => {
    const fetchExistingNIK = async () => {
      let existingNIK = null;
      if (targetRole === USER_ROLE.OWNER) {
        const { data } = await getTenantProfile(currentUser.id);
        if (data?.ktp_number) existingNIK = data.ktp_number;
      } else {
        const { data } = await getOwnerProfile(currentUser.id);
        if (data?.ktp_number) existingNIK = data.ktp_number;
      }
      
      if (existingNIK) {
        setKtpNumber(existingNIK);
        setIsNiksLocked(true);
      }
    };
    
    if (currentUser?.id) {
      fetchExistingNIK();
    }
  }, [targetRole, currentUser]);

  const handleRegisterOwner = async () => {
    if (!ktpNumber || ktpNumber.length !== 16 || !/^\d+$/.test(ktpNumber)) {
      Alert.alert('Gagal', 'NIK harus terdiri dari 16 digit angka.');
      return;
    }
    
    setIsLoading(true);

    // Cek keunikan NIK
    const isUnique = await checkNikUnique(ktpNumber, currentUser.id);
    if (!isUnique) {
      setIsLoading(false);
      Alert.alert('Gagal', 'NIK sudah terdaftar pada akun lain. Gunakan NIK Anda sendiri.');
      return;
    }

    // Insert ke owner_profiles dengan is_verified = true (hardcoded verifikasi instan)
    const { error: ownerError } = await upsertOwnerProfile(currentUser.id, {
      ktp_number: ktpNumber,
      is_verified: true
    });
    
    if (ownerError) {
      setIsLoading(false);
      Alert.alert('Gagal', 'Gagal menyimpan profil pemilik.');
      return;
    }

    // Sinkronisasi NIK ke tenant_profiles (agar bisa dipakai ulang jika jadi tenant)
    const existingTenant = await getTenantProfile(currentUser.id);
    // Hapus id dan created_at/updated_at dari data existing sebelum upsert
    const existingData = existingTenant.data || {};
    delete existingData.id;
    delete existingData.created_at;
    delete existingData.updated_at;
    
    await upsertTenantProfile(currentUser.id, {
      ...existingData,
      ktp_number: ktpNumber
    });
    
    if (isCompletingProfile) {
      setIsLoading(false);
      Alert.alert('Berhasil', 'Profil Pemilik berhasil dilengkapi! Identitas Anda sedang diverifikasi oleh admin.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    const { data: userData, error: userError } = await updateUserProfile(currentUser.id, { role: USER_ROLE.BOTH });
    
    setIsLoading(false);
    if (userError) {
      Alert.alert('Gagal', 'Gagal mengubah mode akun.');
      return;
    }
    
    Alert.alert('Berhasil', 'Anda berhasil terdaftar sebagai Pemilik Kosan! Identitas Anda sedang diverifikasi oleh admin.', [
      {
        text: 'OK',
        onPress: () => {
          setAuthenticatedUser(currentSession, userData);
        }
      }
    ]);
  };

  const handleRegisterTenant = async () => {
    if (!ktpNumber || ktpNumber.length !== 16 || !/^\d+$/.test(ktpNumber)) {
      Alert.alert('Gagal', 'NIK harus terdiri dari 16 digit angka.');
      return;
    }
    if (!occupation || !emergencyName || !emergencyPhone) {
      Alert.alert('Gagal', 'Harap lengkapi semua data.');
      return;
    }
    
    setIsLoading(true);

    // Cek keunikan NIK
    const isUnique = await checkNikUnique(ktpNumber, currentUser.id);
    if (!isUnique) {
      setIsLoading(false);
      Alert.alert('Gagal', 'NIK sudah terdaftar pada akun lain. Gunakan NIK Anda sendiri.');
      return;
    }

    const { data: tenantData, error: tenantError } = await upsertTenantProfile(currentUser.id, {
      ktp_number: ktpNumber,
      occupation,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone
    });
    
    if (tenantError) {
      setIsLoading(false);
      Alert.alert('Gagal', 'Gagal menyimpan profil pencari kos.');
      return;
    }

    // Sinkronisasi NIK ke owner_profiles (jika belum ada)
    const existingOwner = await getOwnerProfile(currentUser.id);
    const existingOwnerData = existingOwner.data || {};
    delete existingOwnerData.id;
    delete existingOwnerData.created_at;
    delete existingOwnerData.updated_at;
    
    await upsertOwnerProfile(currentUser.id, {
      ...existingOwnerData,
      ktp_number: ktpNumber
    });
    
    if (isCompletingProfile) {
      setIsLoading(false);
      Alert.alert('Berhasil', 'Profil Pencari Kos berhasil dilengkapi! Identitas Anda sedang diverifikasi oleh admin.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    const { data: userData, error: userError } = await updateUserProfile(currentUser.id, { role: USER_ROLE.BOTH });
    
    setIsLoading(false);
    if (userError) {
      Alert.alert('Gagal', 'Gagal mengubah mode akun.');
      return;
    }
    
    Alert.alert('Berhasil', 'Anda berhasil terdaftar sebagai Pencari Kosan! Identitas Anda sedang diverifikasi oleh admin.', [
      {
        text: 'OK',
        onPress: () => {
          setAuthenticatedUser(currentSession, userData);
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: Math.max((insets?.top || 0) + 16, 48), paddingBottom: Math.max((insets?.bottom || 0) + 16, 48) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(targetRole === USER_ROLE.OWNER ? 'TenantMain' : 'OwnerMain');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCompletingProfile
              ? `Lengkapi Profil ${targetRole === USER_ROLE.OWNER ? 'Pemilik' : 'Pencari Kos'}`
              : `Daftar sebagai ${targetRole === USER_ROLE.OWNER ? 'Pemilik' : 'Pencari Kos'}`}
          </Text>
        </View>

        <View style={styles.content}>
          {targetRole === USER_ROLE.OWNER ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verifikasi Identitas</Text>
              <Text style={styles.sectionSubtitle}>
                Untuk keamanan, mohon masukkan Nomor Induk Kependudukan (NIK) Anda.
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIK (16 digit angka)</Text>
                <TextInput
                  style={[styles.textInput, isNiksLocked && { backgroundColor: COLORS.grey200, color: COLORS.textSecondary }]}
                  placeholder="Contoh: 3201234567890123"
                  keyboardType="numeric"
                  maxLength={16}
                  value={ktpNumber}
                  onChangeText={setKtpNumber}
                  editable={!isNiksLocked}
                />
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lengkapi Profil Pencari Kos</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIK (16 digit angka)</Text>
                <TextInput
                  style={[styles.textInput, isNiksLocked && { backgroundColor: COLORS.grey200, color: COLORS.textSecondary }]}
                  placeholder="Contoh: 3201234567890123"
                  keyboardType="numeric"
                  maxLength={16}
                  value={ktpNumber}
                  onChangeText={setKtpNumber}
                  editable={!isNiksLocked}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pekerjaan / Status</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Cth: Mahasiswa, Karyawan"
                  value={occupation}
                  onChangeText={setOccupation}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Kontak Darurat</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nama kerabat/keluarga terdekat"
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>No. Telp Kontak Darurat</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Cth: 08123456789"
                  keyboardType="phone-pad"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            onPress={targetRole === USER_ROLE.OWNER ? handleRegisterOwner : handleRegisterTenant}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Daftar & Beralih Mode</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: SPACING[4] },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[6] },
  backBtn: { marginRight: SPACING[4] },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  content: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING[5], ...SHADOW.sm },
  section: { marginBottom: SPACING[6] },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[2] },
  sectionSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING[4], lineHeight: 20 },
  imageUploadBtn: { width: '100%', height: 200, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING[4] },
  imagePlaceholderText: { marginTop: SPACING[3], color: COLORS.textTertiary, textAlign: 'center', fontSize: FONT_SIZE.sm },
  inputGroup: { marginBottom: SPACING[4] },
  inputLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginBottom: SPACING[2] },
  textInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING[3], paddingVertical: SPACING[3], fontSize: FONT_SIZE.base, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: SPACING[4], borderRadius: BORDER_RADIUS.md, alignItems: 'center', ...SHADOW.sm },
  submitBtnText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
});

export default RoleRegistrationScreen;
