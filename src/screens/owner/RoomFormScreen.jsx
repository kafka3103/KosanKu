/**
 * screens/owner/RoomFormScreen.jsx
 * Form tambah / edit kamar dalam properti
 * Termasuk multi-select fasilitas dari facility_master
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import {
  createRoom,
  updateRoom,
  getFacilityMaster,
  setRoomFacilities,
  createBulkRooms,
  setBulkRoomFacilities,
  uploadMultipleRoomPhotos,
} from '../../services/propertyService';

const ROOM_TYPES = (t) => [
  { value: 'standard', label: t('room.form.typeStandard', 'Standard'), icon: 'bed-outline' },
  { value: 'deluxe', label: t('room.form.typeDeluxe', 'Deluxe'), icon: 'sparkles-outline' },
  { value: 'suite', label: t('room.form.typeSuite', 'Suite'), icon: 'diamond-outline' },
  { value: 'studio', label: t('room.form.typeStudio', 'Studio'), icon: 'home-outline' },
];

const FACILITY_ICON_MAP = {
  'air-conditioner': '❄️',
  wifi: '📶',
  shower: '🚿',
  'water-heater': '🔥',
  bed: '🛏️',
  wardrobe: '🚪',
  desk: '📚',
  chair: '🪑',
  refrigerator: '🧊',
  television: '📺',
  'washing-machine': '👕',
  kitchen: '🍳',
  balcony: '🌅',
  window: '🪟',
};

const RoomFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const existingRoom = route.params?.room ?? null;
  const propertyId = route.params?.propertyId;
  const isEdit = !!existingRoom;

  const [roomNumber, setRoomNumber] = useState(existingRoom?.room_number ?? '');
  const [roomType, setRoomType] = useState(existingRoom?.room_type ?? 'standard');
  const [floorNumber, setFloorNumber] = useState(String(existingRoom?.floor_number ?? ''));
  const [sizeSqm, setSizeSqm] = useState(String(existingRoom?.size_sqm ?? ''));
  const [basePrice, setBasePrice] = useState(String(existingRoom?.base_price ?? ''));
  const [description, setDescription] = useState(existingRoom?.description ?? '');

  const [allFacilities, setAllFacilities] = useState([]);
  const [selectedFacilities, setSelectedFacilities] = useState([]); // [{facility_id, additional_cost}]
  const [roomPhotos, setRoomPhotos] = useState(existingRoom?.photo_urls ?? []);
  
  // Bulk generation state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkCount, setBulkCount] = useState('1');

  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    const { data, error } = await getFacilityMaster();
    if (!error && data) {
      setAllFacilities(data);

      // Pre-select fasilitas yang sudah ada (mode edit)
      if (existingRoom?.room_facilities) {
        const existing = existingRoom.room_facilities.map((rf) => ({
          facility_id: rf.facility_id,
          additional_cost: rf.additional_cost ?? null,
        }));
        setSelectedFacilities(existing);
      }
    }
    setIsLoadingFacilities(false);
  };

  const toggleFacility = (facilityId) => {
    setSelectedFacilities((prev) => {
      const exists = prev.find((f) => f.facility_id === facilityId);
      if (exists) {
        return prev.filter((f) => f.facility_id !== facilityId);
      }
      return [...prev, { facility_id: facilityId, additional_cost: null }];
    });
  };

  const isFacilitySelected = (facilityId) =>
    selectedFacilities.some((f) => f.facility_id === facilityId);

  const pickPhotosFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('room.form.permissionRequired', 'Izin Diperlukan'), t('room.form.cameraDenied', 'Akses kamera diperlukan.'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setRoomPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const pickPhotosFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('room.form.permissionRequired', 'Izin Diperlukan'), t('room.form.galleryDenied', 'Akses galeri diperlukan.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const uris = result.assets.map(a => a.uri);
      setRoomPhotos(prev => [...prev, ...uris].slice(0, 5)); // Limit 5
    }
  };

  const handlePickPhotos = () => {
    if (roomPhotos.length >= 5) {
      Alert.alert(t('room.form.limitReachedTitle', 'Batas Tercapai'), t('room.form.limitReachedMsg', 'Maksimal 5 foto kamar.'));
      return;
    }
    Alert.alert(
      t('room.form.photoSourceTitle', 'Foto Kamar'),
      t('room.form.photoSourceMsg', 'Pilih sumber foto kamar'),
      [
        { text: t('room.form.cameraBtn', 'Kamera'), onPress: pickPhotosFromCamera },
        { text: t('room.form.galleryBtn', 'Galeri'), onPress: pickPhotosFromGallery },
        { text: t('room.form.cancelBtn', 'Batal'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removePhoto = (indexToRemove) => {
    setRoomPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    if (!isBulkMode && !roomNumber.trim()) {
      Alert.alert('Error', t('room.form.reqRoomNumError', 'Nomor kamar wajib diisi'));
      return;
    }
    if (isBulkMode && (!bulkPrefix.trim() || !bulkCount || parseInt(bulkCount, 10) < 1)) {
      Alert.alert('Error', t('room.form.reqBulkError', 'Awalan dan jumlah kamar wajib diisi'));
      return;
    }
    if (!basePrice) {
      Alert.alert('Error', t('room.form.reqPriceError', 'Harga sewa wajib diisi'));
      return;
    }

    setIsLoading(true);

    try {
      // Upload photos first
      const existingPhotos = roomPhotos.filter(p => p.startsWith('http'));
      const newPhotos = roomPhotos.filter(p => !p.startsWith('http'));
      let uploadedPhotos = [];
      if (newPhotos.length > 0) {
        // Use a temporary folder if creating new room(s)
        const tempRoomId = isEdit ? existingRoom.id : `temp_${Date.now()}`;
        const { urls } = await uploadMultipleRoomPhotos(tempRoomId, newPhotos);
        uploadedPhotos = urls;
      }
      const finalPhotoUrls = [...existingPhotos, ...uploadedPhotos];

      const roomDataTemplate = {
        room_type: roomType,
        floor_number: floorNumber ? parseInt(floorNumber, 10) : null,
        size_sqm: sizeSqm ? parseFloat(sizeSqm) : null,
        base_price: parseFloat(basePrice),
        description: description.trim() || null,
        photo_urls: finalPhotoUrls,
      };

      if (isBulkMode && !isEdit) {
        // Bulk Create
        const count = parseInt(bulkCount, 10);
        const roomsToCreate = Array.from({ length: count }).map((_, i) => ({
          ...roomDataTemplate,
          room_number: `${bulkPrefix.trim()}${i + 1}`,
        }));

        const { data, error } = await createBulkRooms(propertyId, roomsToCreate);
        if (error) throw error;
        
        // Set facilities for all created rooms
        const roomIds = data.map(r => r.id);
        const { error: facError } = await setBulkRoomFacilities(roomIds, selectedFacilities);
        if (facError) console.warn('Gagal update fasilitas bulk:', facError.message);
        
        Alert.alert(t('room.form.successTitle', 'Berhasil!'), t('room.form.successAddBulkMsg', '{{count}} Kamar berhasil dibuat', { count }), [{ text: t('room.form.okBtn', 'OK'), onPress: () => navigation.goBack() }]);
      } else {
        // Single Create/Edit
        const roomData = {
          ...roomDataTemplate,
          room_number: roomNumber.trim(),
        };

        let roomId;
        if (isEdit) {
          const { error } = await updateRoom(existingRoom.id, roomData);
          if (error) throw error;
          roomId = existingRoom.id;
        } else {
          const { data, error } = await createRoom(propertyId, roomData);
          if (error) throw error;
          roomId = data.id;
        }

        // Update fasilitas
        const { error: facError } = await setRoomFacilities(roomId, selectedFacilities);
        if (facError) {
          console.warn('Gagal update fasilitas:', facError.message);
        }

        Alert.alert(
          t('room.form.successTitle', 'Berhasil!'),
          isEdit ? t('room.form.successUpdateMsg', 'Kamar berhasil diperbarui') : t('room.form.successAddMsg', 'Kamar berhasil ditambahkan'),
          [{ text: t('room.form.okBtn', 'OK'), onPress: () => navigation.goBack() }]
        );
      }

      Alert.alert(
        t('room.form.successTitle', 'Berhasil!'),
        isEdit ? t('room.form.successUpdateMsg', 'Kamar berhasil diperbarui') : t('room.form.successAddMsg', 'Kamar berhasil ditambahkan'),
        [{ text: t('room.form.okBtn', 'OK'), onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(t('room.form.failSaveTitle', 'Gagal Menyimpan'), err.message ?? 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Group fasilitas berdasarkan kategori
  const groupedFacilities = allFacilities.reduce((acc, fac) => {
    const cat = fac.category ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(fac);
    return acc;
  }, {});

  const categoryLabels = {
    electronics: t('room.form.catElectronics', '🔌 Elektronik'),
    furniture: t('room.form.catFurniture', '🪑 Furnitur'),
    bathroom: t('room.form.catBathroom', '🚿 Kamar Mandi'),
    connectivity: t('room.form.catConnectivity', '📶 Konektivitas'),
    shared: t('room.form.catShared', '🤝 Bersama'),
    space: t('room.form.catSpace', '🌅 Ruang'),
    other: t('room.form.catOther', '📦 Lainnya'),
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
            {isEdit ? t('room.form.editTitle') : t('room.form.addTitle')}
          </Text>
        </View>

        {/* Toggle Bulk Mode (Hanya untuk Tambah Baru) */}
        {!isEdit && (
          <View style={[styles.section, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View>
              <Text style={styles.sectionTitle}>{t('room.form.bulkTitle', '⚡ Generate Banyak Kamar')}</Text>
              <Text style={[styles.label, { marginTop: 0 }]}>{t('room.form.bulkSubtitle', 'Buat otomatis sekaligus')}</Text>
            </View>
            <Switch
              value={isBulkMode}
              onValueChange={setIsBulkMode}
              trackColor={{ false: COLORS.grey300, true: COLORS.primaryLight }}
              thumbColor={isBulkMode ? COLORS.primary : COLORS.white}
            />
          </View>
        )}

        {/* Informasi Kamar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('room.form.infoTitle', '📋 Informasi Kamar')}</Text>

          {isBulkMode ? (
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>{t('room.form.bulkPrefix', 'Awalan Nomor *')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('room.form.bulkPrefixPlaceholder', 'Mis: A, B, Lt1-')}
                  value={bulkPrefix}
                  onChangeText={setBulkPrefix}
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>{t('room.form.bulkCount', 'Jumlah *')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  value={bulkCount}
                  onChangeText={setBulkCount}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.label}>{t('room.form.roomNumberLabel')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('room.form.roomNumberPlaceholder')}
                value={roomNumber}
                onChangeText={setRoomNumber}
                autoCapitalize="characters"
                placeholderTextColor={COLORS.textTertiary}
              />
            </>
          )}

          {/* Room Type */}
          <Text style={styles.label}>{t('room.form.roomTypeLabel')}</Text>
          <View style={styles.typeGrid}>
            {ROOM_TYPES(t).map((type) => {
              const isSelected = roomType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  onPress={() => setRoomType(type.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={24} 
                    color={isSelected ? COLORS.primary : COLORS.textTertiary} 
                    style={styles.typeIcon} 
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      isSelected && styles.typeLabelSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Floor & Size */}
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('room.form.floorNumberLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={floorNumber}
                onChangeText={setFloorNumber}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('room.form.sizeLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('room.form.sizePlaceholder')}
                value={sizeSqm}
                onChangeText={setSizeSqm}
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>

          {/* Price */}
          <Text style={styles.label}>{t('room.form.priceLabel')} *</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.priceCurrency}>Rp</Text>
            <TextInput
              style={styles.priceInput}
              placeholder={t('room.form.pricePlaceholder')}
              value={basePrice}
              onChangeText={setBasePrice}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Description */}
          <Text style={styles.label}>{t('room.form.descriptionLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('room.form.descriptionPlaceholder', 'Deskripsi singkat kamar...')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Room Photos */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[2] }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('room.form.photoTitle', '📸 Foto Kamar ({{count}}/5)', { count: roomPhotos.length })}</Text>
            {roomPhotos.length < 5 && (
              <TouchableOpacity onPress={handlePickPhotos}>
                <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.medium }}>{t('room.form.addPhotoBtn', '+ Tambah')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING[5], paddingHorizontal: SPACING[5] }}>
            {roomPhotos.map((photoUri, index) => (
              <View key={index.toString()} style={{ marginRight: SPACING[3], position: 'relative' }}>
                <Image source={{ uri: photoUri }} style={{ width: 100, height: 100, borderRadius: BORDER_RADIUS.md }} />
                <TouchableOpacity 
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            {roomPhotos.length === 0 && (
              <Text style={{ color: COLORS.textTertiary, fontSize: FONT_SIZE.sm, marginVertical: SPACING[2] }}>{t('room.form.noPhoto', 'Belum ada foto kamar. Ketuk "+ Tambah" untuk menambahkan.')}</Text>
            )}
          </ScrollView>
        </View>

        {/* Fasilitas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('room.form.facilitiesLabel')}</Text>
          <Text style={styles.sectionSubtitle}>{t('room.form.facilitiesHint')}</Text>

          {isLoadingFacilities ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            Object.entries(groupedFacilities).map(([category, facilities]) => (
              <View key={category} style={styles.facilityGroup}>
                <Text style={styles.facilityGroupLabel}>
                  {categoryLabels[category] ?? category}
                </Text>
                <View style={styles.facilityGrid}>
                  {facilities.map((fac) => {
                    const isSelected = isFacilitySelected(fac.id);
                    const icon = FACILITY_ICON_MAP[fac.icon_name] ?? '🔷';
                    return (
                      <TouchableOpacity
                        key={fac.id}
                        style={[
                          styles.facilityChip,
                          isSelected && styles.facilityChipSelected,
                        ]}
                        onPress={() => toggleFacility(fac.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.facilityIcon}>{icon}</Text>
                        <Text
                          style={[
                            styles.facilityName,
                            isSelected && styles.facilityNameSelected,
                          ]}
                        >
                          {fac.name}
                        </Text>
                        {isSelected && (
                          <Text style={styles.facilityCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
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
            <Text style={styles.saveBtnText}>{t('room.form.saveButton')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingBottom: 100 },
  header: {
    backgroundColor: COLORS.primary,
    
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: { marginBottom: SPACING[3] },
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
    padding: SPACING[5],
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[3],
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[3],
    marginTop: -SPACING[2],
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: SPACING[3] },
  rowItem: { flex: 1 },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.grey50,
  },
  priceCurrency: {
    paddingHorizontal: SPACING[3],
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
  priceInput: {
    flex: 1,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginTop: SPACING[1],
  },
  typeCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  typeIcon: { marginBottom: SPACING[2] },
  typeLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  typeLabelSelected: { color: COLORS.primary },
  facilityGroup: { marginBottom: SPACING[4] },
  facilityGroupLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING[2],
  },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
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
  facilityIcon: { fontSize: 14 },
  facilityName: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  facilityNameSelected: { color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  facilityCheck: { fontSize: 12, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  saveBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[6],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
    ...SHADOW.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default RoomFormScreen;
