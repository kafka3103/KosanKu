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

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getTenantActiveContract } from '../../services/invoiceService';
import { TENANT_SCREENS } from '../../navigation/TenantNavigator';

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
    electronics: '🔌 Elektronik',
    furniture: '🪑 Furnitur',
    bathroom: '🚿 Kamar Mandi',
    connectivity: '📶 Konektivitas',
    shared: '🤝 Bersama',
    space: '🌅 Ruang',
    other: '📦 Lainnya',
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
              <Text style={styles.galleryPlaceholderText}>🛏️</Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          {/* Status Badge */}
          <View style={styles.statusOverlay}>
            <Text style={styles.statusText}>
              {room?.status === 'available' ? '✅ Tersedia' : '🔴 Tidak Tersedia'}
            </Text>
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
              <Text style={styles.metaItem}>📐 {room.size_sqm} m²</Text>
              <Text style={styles.metaItem}>🏠 {property?.name}</Text>
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
                <Text style={styles.facilityGroupLabel}>
                  {categoryLabels[cat] ?? cat}
                </Text>
                <View style={styles.facilitiesGrid}>
                  {facs.map((fac) => (
                    <View key={fac.id} style={styles.facilityItem}>
                      <Text style={styles.facilityEmoji}>
                        {FACILITY_ICON_MAP[fac.icon_name] ?? '🔷'}
                      </Text>
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
            <Text style={styles.sectionTitle}>📜 Peraturan Kosan</Text>
            <View style={styles.rulesCard}>
              <Text style={styles.rulesText}>{property.rules}</Text>
            </View>
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
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
  galleryPlaceholderText: { fontSize: 80 },
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
  backBtnText: { color: COLORS.white, fontSize: 20, lineHeight: 24 },
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
  facilityEmoji: { fontSize: 20 },
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
    bottom: 0,
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
    backgroundColor: COLORS.primary,
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
