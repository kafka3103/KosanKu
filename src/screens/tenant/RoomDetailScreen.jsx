/**
 * screens/tenant/RoomDetailScreen.jsx
 * Detail kamar: fasilitas, harga, foto, tombol Ajukan Sewa
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getTenantActiveContract } from '../../services/invoiceService';
import { TENANT_SCREENS } from '../../navigation/TenantNavigator';

const FACILITY_ICON_MAP = {
  'air-conditioner': 'snow',
  wifi: 'wifi',
  shower: 'water',
  'water-heater': 'flame',
  bed: 'bed',
  wardrobe: 'file-tray',
  desk: 'desktop',
  chair: 'chair', // doesn't exist, will fallback
  refrigerator: 'snow-outline',
  television: 'tv',
  'washing-machine': 'shirt',
  kitchen: 'restaurant',
  balcony: 'partly-sunny',
  window: 'scan-outline',
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const RoomDetailScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const room = route.params?.room;
  const property = route.params?.property;
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const photos = room?.photo_urls ?? [];
  const facilities = room?.room_facilities ?? [];

  // Group fasilitas per kategori
  const groupedFacilities = facilities.reduce((acc, rf) => {
    const fac = rf.facility_master;
    if (!fac) return acc;
    const cat = fac.category ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...fac, additional_cost: rf.additional_cost });
    return acc;
  }, {});

  const categoryLabels = {
    electronics: { text: 'Elektronik', icon: 'hardware-chip-outline' },
    furniture: { text: 'Furnitur', icon: 'bed-outline' },
    bathroom: { text: 'Kamar Mandi', icon: 'water-outline' },
    connectivity: { text: 'Konektivitas', icon: 'wifi-outline' },
    shared: { text: 'Bersama', icon: 'people-outline' },
    space: { text: 'Ruang', icon: 'expand-outline' },
    other: { text: 'Lainnya', icon: 'cube-outline' },
  };

  const handleRequestRent = async () => {
    // Cek apakah tenant sudah punya kontrak aktif
    const { data: activeContract } = await getTenantActiveContract(currentUser?.id);
    if (activeContract) {
      Alert.alert(
        'Sudah Memiliki Hunian',
        'Anda sudah memiliki kontrak hunian aktif. Selesaikan terlebih dahulu sebelum menyewa yang baru.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate(TENANT_SCREENS.RENTAL_REQUEST_FORM, { room, property });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        <View style={styles.gallery}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
                );
                setActivePhotoIndex(idx);
              }}
              scrollEventThrottle={16}
            >
              {photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="bed-outline" size={64} color={COLORS.textTertiary} />
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* Status Badge */}
          <View style={styles.statusOverlay}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={room?.status === 'available' ? 'checkmark-circle' : 'close-circle'} size={14} color={COLORS.white} style={{ marginRight: 4 }} />
              <Text style={styles.statusText}>
                {room?.status === 'available' ? 'Tersedia' : 'Tidak Tersedia'}
              </Text>
            </View>
          </View>

          {/* Indicators */}
          {photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.indicator, i === activePhotoIndex && styles.indicatorActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Room Info */}
        <View style={styles.infoSection}>
          <View style={styles.roomHeader}>
            <View>
              <Text style={styles.roomNumber}>Kamar {room?.room_number}</Text>
              <Text style={styles.roomType}>
                {room?.room_type} · Lantai {room?.floor_number ?? '-'}
              </Text>
            </View>
            <View>
              <Text style={styles.price}>{formatCurrency(room?.base_price)}</Text>
              <Text style={styles.priceUnit}>per bulan</Text>
            </View>
          </View>

          {room?.size_sqm && (
            <View style={styles.metaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="expand" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.metaItem}>{room.size_sqm} m²</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="business" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.metaItem}>{property?.name}</Text>
              </View>
            </View>
          )}

          {room?.description && (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{room.description}</Text>
            </View>
          )}
        </View>

        {/* Facilities */}
        {Object.keys(groupedFacilities).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fasilitas Kamar</Text>
            {Object.entries(groupedFacilities).map(([cat, facs]) => (
              <View key={cat} style={styles.facilityGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
                  <Ionicons name={categoryLabels[cat]?.icon ?? 'cube-outline'} size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.facilityGroupLabel, { marginBottom: 0 }]}>
                    {categoryLabels[cat]?.text ?? cat}
                  </Text>
                </View>
                <View style={styles.facilitiesGrid}>
                  {facs.map((fac) => (
                    <View key={fac.id} style={styles.facilityItem}>
                      <Ionicons
                        name={FACILITY_ICON_MAP[fac.icon_name] ?? 'cube'}
                        size={20}
                        color={COLORS.primary}
                        style={{ marginRight: 4 }}
                      />
                      <View>
                        <Text style={styles.facilityName}>{fac.name}</Text>
                        {fac.additional_cost && (
                          <Text style={styles.additionalCost}>
                            +{formatCurrency(fac.additional_cost)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Property Rules */}
        {property?.rules && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[4] }}>
              <Ionicons name="document-text" size={20} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Peraturan Kosan</Text>
            </View>
            <View style={styles.rulesCard}>
              <Text style={styles.rulesText}>{property.rules}</Text>
            </View>
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {room?.status === 'available' && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomPrice}>
            <Text style={styles.bottomPriceLabel}>Harga/bulan</Text>
            <Text style={styles.bottomPriceValue}>{formatCurrency(room?.base_price)}</Text>
          </View>
          <TouchableOpacity
            style={styles.rentBtn}
            onPress={handleRequestRent}
            activeOpacity={0.8}
          >
            <Text style={styles.rentBtnText}>Ajukan Sewa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gallery: { height: 280, position: 'relative', backgroundColor: COLORS.grey100 },
  galleryImage: { width: 400, height: 280, resizeMode: 'cover' },
  galleryPlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: SPACING[12],
    left: SPACING[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { color: COLORS.white, fontSize: 20, lineHeight: 24, paddingBottom: 2 },
  statusOverlay: {
    position: 'absolute',
    bottom: SPACING[3],
    right: SPACING[4],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },
  photoIndicators: {
    position: 'absolute',
    bottom: SPACING[3],
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: { backgroundColor: COLORS.white, width: 16 },
  infoSection: {
    backgroundColor: COLORS.white,
    padding: SPACING[5],
    paddingBottom: SPACING[4],
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  roomNumber: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomType: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  price: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    textAlign: 'right',
  },
  priceUnit: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'right' },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginBottom: SPACING[3],
  },
  metaItem: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  descriptionCard: {
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
  },
  descriptionText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING[2],
    padding: SPACING[5],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[4],
  },
  facilityGroup: { marginBottom: SPACING[4] },
  facilityGroupLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING[2],
  },
  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[3] },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    width: '45%',
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[2],
  },
  facilityName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  additionalCost: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.warning,
  },
  rulesCard: {
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
  },
  rulesText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  bottomBar: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    paddingBottom: SPACING[8],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.xl,
  },
  bottomPrice: { flex: 1 },
  bottomPriceLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  bottomPriceValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  rentBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING[8],
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.md,
    ...SHADOW.md,
  },
  rentBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default RoomDetailScreen;
