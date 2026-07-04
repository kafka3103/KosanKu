/**
 * screens/owner/PropertyFormScreen.jsx
 * Form tambah / edit properti kosan
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import {
  createProperty,
  updateProperty,
  uploadPropertyPhoto,
} from '../../services/propertyService';

const GENERAL_FACILITIES = [
  { key: 'parking', label: 'Parkir', emoji: '🅿️' },
  { key: 'cctv', label: 'CCTV', emoji: '📹' },
  { key: 'security_24h', label: 'Security 24 Jam', emoji: '💂' },
  { key: 'wifi_area', label: 'WiFi Area', emoji: '📶' },
  { key: 'laundry', label: 'Laundry', emoji: '👕' },
  { key: 'canteen', label: 'Kantin', emoji: '🍽️' },
  { key: 'garden', label: 'Taman', emoji: '🌿' },
  { key: 'gym', label: 'Gym', emoji: '💪' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Putra', emoji: '👨' },
  { value: 'female', label: 'Putri', emoji: '👩' },
  { value: 'mixed', label: 'Campur', emoji: '👫' },
];

const PropertyFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const existingProperty = route.params?.property ?? null;
  const isEdit = !!existingProperty;

  // Form state
  const [name, setName] = useState(existingProperty?.name ?? '');
  const [description, setDescription] = useState(existingProperty?.description ?? '');
  const [addressLine, setAddressLine] = useState(existingProperty?.address_line ?? '');
  const [city, setCity] = useState(existingProperty?.city ?? '');
  const [district, setDistrict] = useState(existingProperty?.district ?? '');
  const [postalCode, setPostalCode] = useState(existingProperty?.postal_code ?? '');
  const [genderPolicy, setGenderPolicy] = useState(existingProperty?.gender_policy ?? 'mixed');
  const [rules, setRules] = useState(existingProperty?.rules ?? '');
  const [billingGenerateDay, setBillingGenerateDay] = useState(
    String(existingProperty?.billing_generate_day ?? '1')
  );
  const [billingDueDays, setBillingDueDays] = useState(
    String(existingProperty?.billing_due_days ?? '10')
  );
  const [selectedFacilities, setSelectedFacilities] = useState(
    existingProperty?.general_facilities ?? []
  );
  const [coverPhotoUri, setCoverPhotoUri] = useState(existingProperty?.cover_photo_url ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFacility = (key) => {
    setSelectedFacilities((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const handlePickCoverPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Akses galeri foto diperlukan.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCoverPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama properti wajib diisi');
      return;
    }
    if (!addressLine.trim()) {
      Alert.alert('Error', 'Alamat wajib diisi');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Kota wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      let coverPhotoUrl = existingProperty?.cover_photo_url ?? null;

      // Upload cover photo jika ada baru
      if (coverPhotoUri && !coverPhotoUri.startsWith('http')) {
        const propertyId = existingProperty?.id ?? `temp_${Date.now()}`;
        const { url, error: uploadError } = await uploadPropertyPhoto(
          propertyId,
          coverPhotoUri,
          'cover'
        );
        if (!uploadError && url) {
          coverPhotoUrl = url;
        }
      }

      const propertyData = {
        name: name.trim(),
        description: description.trim() || null,
        address_line: addressLine.trim(),
        city: city.trim(),
        district: district.trim() || null,
        postal_code: postalCode.trim() || null,
        gender_policy: genderPolicy,
        rules: rules.trim() || null,
        billing_generate_day: parseInt(billingGenerateDay, 10) || 1,
        billing_due_days: parseInt(billingDueDays, 10) || 10,
        general_facilities: selectedFacilities,
        cover_photo_url: coverPhotoUrl,
      };

      let result;
      if (isEdit) {
        result = await updateProperty(existingProperty.id, propertyData);
      } else {
        result = await createProperty(currentUser.id, propertyData);
      }

      if (result.error) {
        Alert.alert('Gagal Menyimpan', result.error.message);
        return;
      }

      Alert.alert(
        'Berhasil!',
        isEdit ? 'Properti berhasil diperbarui' : 'Properti berhasil ditambahkan',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Terjadi kesalahan, coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? t('property.form.editTitle') : t('property.form.addTitle')}
          </Text>
        </View>

        {/* Cover Photo */}
        <TouchableOpacity
          style={styles.coverPhotoContainer}
          onPress={handlePickCoverPhoto}
          activeOpacity={0.8}
        >
          {coverPhotoUri ? (
            <Image source={{ uri: coverPhotoUri }} style={styles.coverPhoto} />
          ) : (
            <View style={styles.coverPhotoPlaceholder}>
              <Text style={styles.coverPhotoEmoji}>📸</Text>
              <Text style={styles.coverPhotoHint}>{t('property.form.addPhotoButton')}</Text>
            </View>
          )}
          <View style={styles.coverPhotoOverlay}>
            <Text style={styles.coverPhotoOverlayText}>Ganti Foto Utama</Text>
          </View>
        </TouchableOpacity>

        {/* Informasi Dasar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Informasi Dasar</Text>

          <Text style={styles.label}>{t('property.form.nameLabel')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('property.form.namePlaceholder')}
            value={name}
            onChangeText={setName}
            placeholderTextColor={COLORS.textTertiary}
          />

          <Text style={styles.label}>{t('property.form.descriptionLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('property.form.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Lokasi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Lokasi</Text>

          <Text style={styles.label}>{t('property.form.addressLabel')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('property.form.addressPlaceholder')}
            value={addressLine}
            onChangeText={setAddressLine}
            placeholderTextColor={COLORS.textTertiary}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('property.form.cityLabel')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="Bandung"
                value={city}
                onChangeText={setCity}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('property.form.districtLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Coblong"
                value={district}
                onChangeText={setDistrict}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>

          <Text style={styles.label}>Kode Pos</Text>
          <TextInput
            style={styles.input}
            placeholder="40135"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Gender Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Kebijakan Penghuni</Text>
          <Text style={styles.label}>{t('property.form.genderPolicyLabel')}</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.genderOption,
                  genderPolicy === opt.value && styles.genderOptionSelected,
                ]}
                onPress={() => setGenderPolicy(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.genderEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.genderLabel,
                    genderPolicy === opt.value && styles.genderLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fasilitas Umum */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Fasilitas Umum</Text>
          <Text style={styles.sectionSubtitle}>Fasilitas area bersama (bukan per kamar)</Text>
          <View style={styles.facilitiesGrid}>
            {GENERAL_FACILITIES.map((fac) => {
              const isSelected = selectedFacilities.includes(fac.key);
              return (
                <TouchableOpacity
                  key={fac.key}
                  style={[styles.facilityChip, isSelected && styles.facilityChipSelected]}
                  onPress={() => toggleFacility(fac.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.facilityEmoji}>{fac.emoji}</Text>
                  <Text
                    style={[
                      styles.facilityLabel,
                      isSelected && styles.facilityLabelSelected,
                    ]}
                  >
                    {fac.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Peraturan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Peraturan Kosan</Text>
          <TextInput
            style={[styles.input, styles.textArea, { minHeight: 100 }]}
            placeholder={t('property.form.rulesPlaceholder')}
            value={rules}
            onChangeText={setRules}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Billing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Pengaturan Tagihan</Text>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('property.form.billingDayLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={billingGenerateDay}
                onChangeText={setBillingGenerateDay}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
              <Text style={styles.fieldHint}>Tanggal 1-28</Text>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('property.form.billingDueDaysLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={billingDueDays}
                onChangeText={setBillingDueDays}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
              <Text style={styles.fieldHint}>Hari setelah generate</Text>
            </View>
          </View>
        </View>

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
            <Text style={styles.saveBtnText}>
              {isEdit ? t('property.form.updateButton') : t('property.form.saveButton')}
            </Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: SPACING[12],
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[14],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: {
    marginBottom: SPACING[3],
  },
  backBtnText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.base,
  },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  coverPhotoContainer: {
    height: 200,
    backgroundColor: COLORS.grey100,
    position: 'relative',
    overflow: 'hidden',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
  },
  coverPhotoEmoji: {
    fontSize: 48,
  },
  coverPhotoHint: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  coverPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: SPACING[2],
    alignItems: 'center',
  },
  coverPhotoOverlayText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[4],
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[3],
    marginTop: -SPACING[3],
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING[1],
    marginTop: SPACING[3],
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: 3,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[1],
  },
  rowItem: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[1],
  },
  genderOption: {
    flex: 1,
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  genderOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  genderEmoji: {
    fontSize: 24,
  },
  genderLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  genderLabelSelected: {
    color: COLORS.primary,
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginTop: SPACING[1],
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  facilityChipSelected: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  facilityEmoji: {
    fontSize: 14,
  },
  facilityLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  facilityLabelSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[6],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
    ...SHADOW.md,
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

export default PropertyFormScreen;
