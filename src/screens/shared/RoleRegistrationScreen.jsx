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
import * as ImagePicker from 'expo-image-picker';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { uploadKtpPhoto, upsertOwnerProfile, upsertTenantProfile, updateUserProfile } from '../../services/userService';
import USER_ROLE from '../../constants/userRole';

const RoleRegistrationScreen = ({ navigation, route }) => {
  const { targetRole } = route.params || {};
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { currentUser, setAuthenticatedUser, currentSession } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  
  // Owner States
  const [identityPhoto, setIdentityPhoto] = useState(null);
  
  // Tenant States
  const [occupation, setOccupation] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const pickIdentityPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Dibutuhkan izin akses galeri untuk mengunggah foto identitas.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIdentityPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih foto.');
    }
  };

  const handleRegisterOwner = async () => {
    if (!identityPhoto) {
      Alert.alert('Gagal', 'Silakan unggah foto kartu identitas (KTP/SIM/Paspor/KTM).');
      return;
    }
    
    setIsLoading(true);
    const { path, error: uploadError } = await uploadKtpPhoto(currentUser.id, identityPhoto);
    if (uploadError) {
      setIsLoading(false);
      Alert.alert('Gagal', 'Gagal mengunggah foto identitas.');
      return;
    }
    
    const { data: ownerData, error: ownerError } = await upsertOwnerProfile(currentUser.id, {
      ktp_photo_url: path
    });
    
    if (ownerError) {
      setIsLoading(false);
      Alert.alert('Gagal', 'Gagal menyimpan profil pemilik.');
      return;
    }
    
    const { data: userData, error: userError } = await updateUserProfile(currentUser.id, { role: USER_ROLE.OWNER });
    
    setIsLoading(false);
    if (userError) {
      Alert.alert('Gagal', 'Gagal mengubah mode akun.');
      return;
    }
    
    Alert.alert('Berhasil', 'Anda berhasil terdaftar sebagai Pemilik Kosan!');
    setAuthenticatedUser(currentSession, userData);
  };

  const handleRegisterTenant = async () => {
    if (!occupation || !emergencyName || !emergencyPhone) {
      Alert.alert('Gagal', 'Harap lengkapi semua data.');
      return;
    }
    
    setIsLoading(true);
    const { data: tenantData, error: tenantError } = await upsertTenantProfile(currentUser.id, {
      occupation,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone
    });
    
    if (tenantError) {
      setIsLoading(false);
      Alert.alert('Gagal', 'Gagal menyimpan profil pencari kos.');
      return;
    }
    
    const { data: userData, error: userError } = await updateUserProfile(currentUser.id, { role: USER_ROLE.TENANT });
    
    setIsLoading(false);
    if (userError) {
      Alert.alert('Gagal', 'Gagal mengubah mode akun.');
      return;
    }
    
    Alert.alert('Berhasil', 'Anda berhasil terdaftar sebagai Pencari Kosan!');
    setAuthenticatedUser(currentSession, userData);
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Daftar sebagai {targetRole === USER_ROLE.OWNER ? 'Pemilik' : 'Pencari Kos'}
          </Text>
        </View>

        <View style={styles.content}>
          {targetRole === USER_ROLE.OWNER ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verifikasi Identitas</Text>
              <Text style={styles.sectionSubtitle}>
                Untuk menjaga keamanan platform, mohon unggah foto kartu identitas Anda (KTP, Paspor, SIM, atau KTM).
              </Text>
              <TouchableOpacity style={styles.imageUploadBtn} onPress={pickIdentityPhoto}>
                {identityPhoto ? (
                  <Image source={{ uri: identityPhoto }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={40} color={COLORS.textTertiary} />
                    <Text style={styles.imagePlaceholderText}>Ketuk untuk unggah foto identitas</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lengkapi Profil Pencari Kos</Text>
              
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
