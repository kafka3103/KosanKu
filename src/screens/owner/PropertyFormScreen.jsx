/**
 * screens/owner/PropertyFormScreen.jsx
 * Form tambah / edit properti kosan
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY);

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import {
  createProperty,
  updateProperty,
  uploadPropertyPhoto,
  uploadMultiplePropertyPhotos,
} from '../../services/propertyService';

const GENERAL_FACILITIES = (t) => [
  { key: 'parking', label: t('property.form.facParking', 'Parkir'), icon: 'car-outline' },
  { key: 'cctv', label: t('property.form.facCctv', 'CCTV'), icon: 'videocam-outline' },
  { key: 'security_24h', label: t('property.form.facSecurity', 'Security 24 Jam'), icon: 'shield-checkmark-outline' },
  { key: 'wifi_area', label: t('property.form.facWifi', 'WiFi Area'), icon: 'wifi-outline' },
  { key: 'laundry', label: t('property.form.facLaundry', 'Laundry'), icon: 'shirt-outline' },
  { key: 'canteen', label: t('property.form.facCanteen', 'Kantin'), icon: 'restaurant-outline' },
  { key: 'garden', label: t('property.form.facGarden', 'Taman'), icon: 'leaf-outline' },
  { key: 'gym', label: t('property.form.facGym', 'Gym'), icon: 'barbell-outline' },
];

const GENDER_OPTIONS = (t) => [
  { value: 'male', label: t('property.form.genderMale', 'Putra'), icon: 'man-outline' },
  { value: 'female', label: t('property.form.genderFemale', 'Putri'), icon: 'woman-outline' },
  { value: 'mixed', label: t('property.form.genderMixed', 'Campur'), icon: 'people-outline' },
];

const PropertyFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const existingProperty = route.params?.property ?? null;
  const isEdit = !!existingProperty;
  const insets = useSafeAreaInsets();

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
  const [additionalPhotos, setAdditionalPhotos] = useState(existingProperty?.photo_urls ?? []);
  const [isLoading, setIsLoading] = useState(false);

  // GPS Koordinat Lokasi
  const [latitude, setLatitude] = useState(existingProperty?.latitude != null ? parseFloat(existingProperty.latitude) : null);
  const [longitude, setLongitude] = useState(existingProperty?.longitude != null ? parseFloat(existingProperty.longitude) : null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLatitude, setTempLatitude] = useState(-6.2641);
  const [tempLongitude, setTempLongitude] = useState(106.7944);
  const [locationLoading, setLocationLoading] = useState(false);
  const mapCameraRef = useRef(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);

  const handleSearchMapbox = async () => {
    if (!mapSearchQuery.trim()) return;
    setMapSearchLoading(true);
    setMapSearchResults([]);
    try {
      const token = process.env.EXPO_PUBLIC_MAPBOX_KEY;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(mapSearchQuery.trim())}.json?access_token=${token}&country=id&limit=5`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        if (data.features.length === 1) {
          const newLat = parseFloat(data.features[0].center[1]);
          const newLon = parseFloat(data.features[0].center[0]);
          setTempLatitude(newLat);
          setTempLongitude(newLon);
          mapCameraRef.current?.setCamera({
            centerCoordinate: [newLon, newLat],
            zoomLevel: 15,
            animationDuration: 800,
          });
        } else {
          setMapSearchResults(data.features);
        }
      } else {
        Alert.alert(t('property.form.mapSearchTitle', 'Pencarian Peta'), t('property.form.mapSearchErrorNotFound', 'Lokasi tidak ditemukan. Coba masukkan nama jalan atau kota yang lebih spesifik.'));
      }
    } catch (err) {
      Alert.alert('Error', t('property.form.mapSearchErrorNetwork', 'Gagal mencari lokasi di peta. Periksa koneksi internet Anda.'));
    } finally {
      setMapSearchLoading(false);
    }
  };

  const handleAutoDetectGPS = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('property.form.permRequired', 'Izin Ditolak'), t('property.form.permLocationDenied', 'Akses lokasi diperlukan untuk mendeteksi koordinat GPS otomatis kosan Anda.'));
        setLocationLoading(false);
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (current?.coords) {
        setLatitude(current.coords.latitude);
        setLongitude(current.coords.longitude);
        setTempLatitude(current.coords.latitude);
        setTempLongitude(current.coords.longitude);
        mapCameraRef.current?.setCamera({
          centerCoordinate: [current.coords.longitude, current.coords.latitude],
          zoomLevel: 15,
          animationDuration: 800,
        });
        Alert.alert(
          t('property.form.gpsDetectedTitle', '📍 Lokasi GPS Terdeteksi!'),
          t('property.form.gpsDetectedMsg', 'Koordinat berhasil disimpan dari posisi Anda:\nLat: {{lat}}\nLong: {{lon}}', { lat: current.coords.latitude.toFixed(5), lon: current.coords.longitude.toFixed(5) })
        );
      } else {
        Alert.alert(t('property.form.gpsErrorTitle', 'Gagal'), t('property.form.gpsErrorMsg', 'Tidak dapat mengambil lokasi GPS saat ini.'));
      }
      setLocationLoading(false);
    } catch (err) {
      console.warn('GPS Error:', err);
      Alert.alert('Error', t('property.form.gpsDetectFailMsg', 'Gagal mendeteksi lokasi GPS. Pastikan GPS di perangkat aktif.'));
      setLocationLoading(false);
    }
  };

  const toggleFacility = (key) => {
    setSelectedFacilities((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const pickCoverFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('property.form.permRequired', 'Izin Diperlukan'), t('property.form.permCamDenied', 'Akses kamera diperlukan untuk mengambil foto.'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCoverPhotoUri(result.assets[0].uri);
    }
  };

  const pickCoverFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('property.form.permRequired', 'Izin Diperlukan'), t('property.form.permGalleryDenied', 'Akses galeri foto diperlukan.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCoverPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickCoverPhoto = () => {
    Alert.alert(
      t('property.form.coverPhotoTitle', 'Foto Cover Properti'),
      t('property.form.coverPhotoMsg', 'Pilih sumber foto cover properti'),
      [
        { text: t('property.form.cameraBtn', 'Kamera'), onPress: pickCoverFromCamera },
        { text: t('property.form.galleryBtn', 'Galeri'), onPress: pickCoverFromGallery },
        { text: t('property.form.cancelBtn', 'Batal'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const pickAdditionalFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('property.form.permRequired', 'Izin Diperlukan'), t('property.form.permCamDenied', 'Akses kamera diperlukan.'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAdditionalPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const pickAdditionalFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('property.form.permRequired', 'Izin Diperlukan'), t('property.form.permGalleryDenied', 'Akses galeri diperlukan.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const uris = result.assets.map(a => a.uri);
      setAdditionalPhotos(prev => [...prev, ...uris].slice(0, 5)); // Limit 5
    }
  };

  const handlePickAdditionalPhotos = () => {
    if (additionalPhotos.length >= 5) {
      Alert.alert(t('property.form.limitReachedTitle', 'Batas Tercapai'), t('property.form.limitReachedMsg', 'Maksimal 5 foto tambahan.'));
      return;
    }
    Alert.alert(
      t('property.form.additionalPhotoTitle', 'Foto Tambahan'),
      t('property.form.additionalPhotoMsg', 'Pilih sumber foto tambahan'),
      [
        { text: t('property.form.cameraBtn', 'Kamera'), onPress: pickAdditionalFromCamera },
        { text: t('property.form.galleryBtn', 'Galeri'), onPress: pickAdditionalFromGallery },
        { text: t('property.form.cancelBtn', 'Batal'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeAdditionalPhoto = (indexToRemove) => {
    setAdditionalPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', t('property.form.reqNameError', 'Nama properti wajib diisi'));
      return;
    }
    if (!addressLine.trim()) {
      Alert.alert('Error', t('property.form.reqAddressError', 'Alamat wajib diisi'));
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', t('property.form.reqCityError', 'Kota wajib diisi'));
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

      // Pisahkan foto lama (http) dan baru (file uri)
      const existingAdditional = additionalPhotos.filter(p => p.startsWith('http'));
      const newAdditional = additionalPhotos.filter(p => !p.startsWith('http'));

      let uploadedAdditional = [];
      if (newAdditional.length > 0) {
        const propertyId = existingProperty?.id ?? `temp_${Date.now()}`;
        const { urls } = await uploadMultiplePropertyPhotos(propertyId, newAdditional);
        uploadedAdditional = urls;
      }
      const finalPhotoUrls = [...existingAdditional, ...uploadedAdditional];

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
        photo_urls: finalPhotoUrls,
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
      };

      let result;
      if (isEdit) {
        result = await updateProperty(existingProperty.id, propertyData);
      } else {
        result = await createProperty(currentUser.id, propertyData);
      }

      if (result.error) {
        Alert.alert(t('property.form.failSaveTitle', 'Gagal Menyimpan'), result.error.message);
        return;
      }

      Alert.alert(
        t('property.form.successTitle', 'Berhasil!'),
        isEdit ? t('property.form.successUpdateMsg', 'Properti berhasil diperbarui') : t('property.form.successAddMsg', 'Properti berhasil ditambahkan'),
        [{ text: t('property.form.okBtn', 'OK'), onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', t('property.form.failSaveMsg', 'Terjadi kesalahan, coba lagi.'));
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
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
              
            </View>
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
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} style={styles.coverPhotoIcon} />
              <Text style={styles.coverPhotoHint}>{t('property.form.addPhotoButton')}</Text>
            </View>
          )}
          <View style={styles.coverPhotoOverlay}>
            <Text style={styles.coverPhotoOverlayText}>{t('property.form.changeCoverOverlay', 'Ganti Foto Utama')}</Text>
          </View>
        </TouchableOpacity>

        {/* Additional Photos */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[2] }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('property.form.additionalPhotoHeader', '📸 Foto Tambahan ({{count}}/5)', { count: additionalPhotos.length })}</Text>
            {additionalPhotos.length < 5 && (
              <TouchableOpacity onPress={handlePickAdditionalPhotos}>
                <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.medium }}>{t('property.form.addAdditionalPhotoBtn', '+ Tambah')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING[5], paddingHorizontal: SPACING[5] }}>
            {additionalPhotos.map((photoUri, index) => (
              <View key={index.toString()} style={{ marginRight: SPACING[3], position: 'relative' }}>
                <Image source={{ uri: photoUri }} style={{ width: 100, height: 100, borderRadius: BORDER_RADIUS.md }} />
                <TouchableOpacity
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}
                  onPress={() => removeAdditionalPhoto(index)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            {additionalPhotos.length === 0 && (
              <Text style={{ color: COLORS.textTertiary, fontSize: FONT_SIZE.sm, marginVertical: SPACING[2] }}>{t('property.form.noAdditionalPhoto', 'Belum ada foto tambahan. Ketuk "+ Tambah" untuk menambahkan.')}</Text>
            )}
          </ScrollView>
        </View>

        {/* Informasi Dasar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('property.form.basicInfoTitle', '📋 Informasi Dasar')}</Text>

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
          <Text style={styles.sectionTitle}>{t('property.form.locationTitle', '📍 Lokasi')}</Text>

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

          <Text style={styles.label}>{t('property.form.postalCodeLabel', 'Kode Pos')}</Text>
          <TextInput
            style={styles.input}
            placeholder="40135"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Koordinat GPS / Peta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('property.form.gpsTitle', '📍 Titik Koordinat GPS Peta')}</Text>
          <Text style={styles.sectionSubtitle}>{t('property.form.gpsSubtitle', 'Atur titik peta agar calon penghuni bisa menemukan kosan Anda melalui fitur pencarian GPS terdekat')}</Text>

          {latitude != null && longitude != null ? (
            <View style={{ backgroundColor: COLORS.primarySurface, borderRadius: BORDER_RADIUS.xl, padding: SPACING[4], borderWidth: 1, borderColor: COLORS.primary, marginBottom: SPACING[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
                <Ionicons name="navigate-circle" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary }}>
                  {t('property.form.gpsSavedLabel', 'Titik GPS Tersimpan')}
                </Text>
              </View>
              <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold }}>
                Lat (ltd): {parseFloat(latitude).toFixed(5)}, Long (lnt): {parseFloat(longitude).toFixed(5)}
              </Text>
              <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 }}>
                {t('property.form.gpsSavedHint', 'Titik lokasi ini akan tampil akurat di peta pencarian tenant.')}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: `${COLORS.warning}15`, borderRadius: BORDER_RADIUS.xl, padding: SPACING[4], borderWidth: 1, borderColor: COLORS.warning, marginBottom: SPACING[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
                <Ionicons name="alert-circle" size={22} color={COLORS.warning} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.warning }}>
                  {t('property.form.gpsNotSetLabel', 'Titik Peta Belum Diatur')}
                </Text>
              </View>
              <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary }}>
                {t('property.form.gpsNotSetHint', 'Kosan tanpa titik GPS tidak akan muncul di peta & pencarian urutan terdekat tenant.')}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: SPACING[3] }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[3], borderRadius: BORDER_RADIUS.md }}
              onPress={() => {
                setTempLatitude(latitude ?? -6.2641);
                setTempLongitude(longitude ?? 106.7944);
                setShowLocationModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.white }}>
                {latitude != null ? t('property.form.gpsChangeBtn', 'Ubah Titik Peta') : t('property.form.gpsSetBtn', 'Pilih Titik di Peta')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: COLORS.primarySurface, borderWidth: 1, borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[3], borderRadius: BORDER_RADIUS.md }}
              onPress={handleAutoDetectGPS}
              disabled={locationLoading}
              activeOpacity={0.8}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="locate" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              )}
              <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary }}>
                {locationLoading ? t('property.form.gpsDetectingBtn', 'Mendeteksi...') : t('property.form.gpsDetectBtn', 'Deteksi GPS Saya')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gender Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('property.form.genderTitle', '👤 Kebijakan Penghuni')}</Text>
          <Text style={styles.label}>{t('property.form.genderPolicyLabel')}</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS(t).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.genderOption,
                  genderPolicy === opt.value && styles.genderOptionSelected,
                ]}
                onPress={() => setGenderPolicy(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons name={opt.icon} size={24} color={genderPolicy === opt.value ? COLORS.primary : COLORS.textTertiary} style={styles.genderIcon} />
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
          <Text style={styles.sectionTitle}>{t('property.form.genFacTitle', '🏢 Fasilitas Umum')}</Text>
          <Text style={styles.sectionSubtitle}>{t('property.form.genFacSubtitle', 'Fasilitas area bersama (bukan per kamar)')}</Text>
          <View style={styles.facilitiesGrid}>
            {GENERAL_FACILITIES(t).map((fac) => {
              const isSelected = selectedFacilities.includes(fac.key);
              return (
                <TouchableOpacity
                  key={fac.key}
                  style={[styles.facilityChip, isSelected && styles.facilityChipSelected]}
                  onPress={() => toggleFacility(fac.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={fac.icon} size={20} color={isSelected ? COLORS.primary : COLORS.textTertiary} style={styles.facilityIcon} />
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
          <Text style={styles.sectionTitle}>{t('property.form.rulesTitle', '📜 Peraturan Kosan')}</Text>
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
          <Text style={styles.sectionTitle}>{t('property.form.billingTitle', '💳 Pengaturan Tagihan')}</Text>

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
              <Text style={styles.fieldHint}>{t('property.form.billingDayHint', 'Tanggal 1-28')}</Text>
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
              <Text style={styles.fieldHint}>{t('property.form.billingDueHint', 'Hari setelah generate')}</Text>
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

      {/* Modal Pemilih Titik GPS Peta */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS['3xl'], borderTopRightRadius: BORDER_RADIUS['3xl'], padding: SPACING[5], paddingBottom: Math.max(insets.bottom, SPACING[5]), maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[4] }}>
              <View>
                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary }}>
                  {t('property.form.mapPickerTitle', 'Pilih Titik Lokasi Peta')}
                </Text>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 }}>
                  {t('property.form.mapPickerSubtitle', 'Tentukan posisi koordinat kosan agar akurat di peta')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mapbox Native Map Picker */}
            <View style={{ marginBottom: SPACING[3] }}>
            {/* Search Bar Mapbox (Cari Jalan / Lokasi) */}
            <View style={{ marginBottom: SPACING[3] }}>
              <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grey100, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING[3], borderWidth: 1, borderColor: COLORS.border }}>
                  <Ionicons name="search" size={18} color={COLORS.textTertiary} style={{ marginRight: 6 }} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 10, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary }}
                    placeholder={t('property.form.mapSearchPlaceholder', 'Cari jalan, area, atau kota...')}
                    placeholderTextColor={COLORS.textTertiary}
                    value={mapSearchQuery}
                    onChangeText={setMapSearchQuery}
                    returnKeyType="search"
                    onSubmitEditing={handleSearchMapbox}
                  />
                  {mapSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setMapSearchQuery(''); setMapSearchResults([]); }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary, paddingHorizontal: SPACING[4], justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.lg }}
                  onPress={handleSearchMapbox}
                    disabled={mapSearchLoading}
                  >
                    {mapSearchLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm }}>{t('property.form.mapSearchBtn', 'Cari')}</Text>
                    )}
                  </TouchableOpacity>
                </View>

              {/* Dropdown Hasil Pencarian Mapbox */}
              {mapSearchResults.length > 0 && (
                <View style={{ marginTop: 6, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, maxHeight: 150, overflow: 'hidden' }}>
                  <ScrollView nestedScrollEnabled={true}>
                    {mapSearchResults.map((item, idx) => (
                      <TouchableOpacity
                        key={idx.toString()}
                        style={{ padding: SPACING[3], borderBottomWidth: idx < mapSearchResults.length - 1 ? 1 : 0, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => {
                          const newLat = parseFloat(item.center[1]);
                          const newLon = parseFloat(item.center[0]);
                          setTempLatitude(newLat);
                          setTempLongitude(newLon);
                          setMapSearchResults([]);
                          mapCameraRef.current?.setCamera({
                            centerCoordinate: [newLon, newLat],
                            zoomLevel: 15,
                            animationDuration: 800,
                          });
                        }}
                      >
                        <Ionicons name="location-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textPrimary, flex: 1 }} numberOfLines={2}>
                          {item.place_name}
                        </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={{ backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING[3], borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING[3] }}
                onPress={async () => {
                  await handleAutoDetectGPS();
                }}
              >
                <Ionicons name="locate" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm }}>
                  {t('property.form.mapUseCurrentPosBtn', 'Gunakan Posisi Saya Saat ini')}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 300, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, position: 'relative' }}>
                <MapboxGL.MapView
                  style={{ flex: 1 }}
                  logoEnabled={false}
                  attributionEnabled={false}
                  styleURL={MapboxGL.StyleURL.Street}
                  onPress={(feature) => {
                    const coords = feature.geometry.coordinates;
                    setTempLatitude(coords[1]);
                    setTempLongitude(coords[0]);
                  }}
                >
                  <MapboxGL.Camera
                    ref={mapCameraRef}
                    defaultSettings={{
                      centerCoordinate: [tempLongitude, tempLatitude],
                      zoomLevel: 15,
                    }}
                  />
                  <MapboxGL.MarkerView
                    id="location-picker-marker"
                    coordinate={[tempLongitude, tempLatitude]}
                  >
                    <View style={{ backgroundColor: COLORS.accent, padding: 8, borderRadius: 24, borderWidth: 3, borderColor: COLORS.white }}>
                      <Ionicons name="location" size={22} color={COLORS.white} />
                    </View>
                  </MapboxGL.MarkerView>
                </MapboxGL.MapView>
                <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: COLORS.white, fontSize: 11, textAlign: 'center' }}>
                    {t('property.form.mapHint', '💡 Ketuk di atas peta untuk memindahkan pin ke lokasi kosan Anda')}
                  </Text>
                </View>
              </View>

              {/* Tombol Nudge / Geser Manual Cepat jika butuh presisi mikro */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING[2], paddingHorizontal: SPACING[1] }}>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium }}>
                  {t('property.form.mapPrecisionLabel', 'Presisi Koordinat:')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity onPress={() => {
                    const newLat = parseFloat((tempLatitude + 0.0005).toFixed(5));
                    setTempLatitude(newLat);
                    mapCameraRef.current?.setCamera({ centerCoordinate: [tempLongitude, newLat], animationDuration: 300 });
                  }} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.grey200, borderRadius: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{t('property.form.mapDirNorth', '▲ Utara')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    const newLat = parseFloat((tempLatitude - 0.0005).toFixed(5));
                    setTempLatitude(newLat);
                    mapCameraRef.current?.setCamera({ centerCoordinate: [tempLongitude, newLat], animationDuration: 300 });
                  }} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.grey200, borderRadius: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{t('property.form.mapDirSouth', '▼ Selatan')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    const newLon = parseFloat((tempLongitude - 0.0005).toFixed(5));
                    setTempLongitude(newLon);
                    mapCameraRef.current?.setCamera({ centerCoordinate: [newLon, tempLatitude], animationDuration: 300 });
                  }} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.grey200, borderRadius: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{t('property.form.mapDirWest', '◀ Barat')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    const newLon = parseFloat((tempLongitude + 0.0005).toFixed(5));
                    setTempLongitude(newLon);
                    mapCameraRef.current?.setCamera({ centerCoordinate: [newLon, tempLatitude], animationDuration: 300 });
                  }} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.grey200, borderRadius: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{t('property.form.mapDirEast', 'Timur ▶')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: COLORS.grey50, padding: SPACING[3], borderRadius: BORDER_RADIUS.md, marginBottom: SPACING[4] }}>
              <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center' }}>
                {t('property.form.mapSavePreviewLabel', '📌 Koordinat yang akan disimpan:')} <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{parseFloat(tempLatitude).toFixed(5)}, {parseFloat(tempLongitude).toFixed(5)}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: SPACING[3] }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: SPACING[3], backgroundColor: COLORS.grey200, borderRadius: BORDER_RADIUS.md, alignItems: 'center' }}
                onPress={() => setShowLocationModal(false)}
              >
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.bold }}>{t('property.form.cancelBtn', 'Batal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, paddingVertical: SPACING[3], backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md, alignItems: 'center' }}
                onPress={() => {
                  setLatitude(tempLatitude);
                  setLongitude(tempLongitude);
                  setShowLocationModal(false);
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{t('property.form.mapSavePointBtn', '✅ Simpan Titik Ini')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: COLORS.primary,
    
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
  coverPhotoIcon: { marginBottom: SPACING[2] },
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
  genderIcon: { marginBottom: SPACING[2] },
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
  facilityIcon: { marginRight: SPACING[2] },
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
