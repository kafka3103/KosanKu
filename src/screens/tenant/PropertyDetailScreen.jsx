/**
 * screens/tenant/PropertyDetailScreen.jsx
 * Detail properti untuk tenant: foto galeri, info, kamar available, fasilitas
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Linking,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY);

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import {
  getPropertyDetailForTenant,
  toggleFavorite,
  checkIsFavorite,
} from '../../services/searchService';
import { TENANT_SCREENS } from '../../constants/screenNames';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const STATUS_CONFIG = {
  available: { color: COLORS.success, bg: COLORS.successLight, label: 'Tersedia' },
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Diproses' },
  occupied: { color: COLORS.error, bg: COLORS.errorLight, label: 'Terisi' },
  maintenance: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Perawatan' },
};

const TABS = ['Kamar', 'Informasi', 'Fasilitas'];

const PropertyDetailScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();

  const propertyParam = route.params?.property;
  const [property, setProperty] = useState(propertyParam);
  const [isLoading, setIsLoading] = useState(!propertyParam);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('Kamar');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const photos = [
    ...(property?.cover_photo_url ? [property.cover_photo_url] : []),
    ...(property?.photo_urls ?? []),
  ];

  const availableRooms = (property?.rooms ?? []).filter((r) => r.status === 'available');

  useEffect(() => {
    if (propertyParam?.id) {
      // Load full detail
      loadDetail();
      checkFavorite();
    }
  }, [propertyParam?.id]);

  const loadDetail = async () => {
    setIsLoading(true);
    const { data, error } = await getPropertyDetailForTenant(propertyParam.id);
    if (!error && data) setProperty(data);
    setIsLoading(false);
  };

  const checkFavorite = async () => {
    const fav = await checkIsFavorite(currentUser?.id, propertyParam?.id);
    setIsFavorite(fav);
  };

  const handleToggleFavorite = async () => {
    const { isFavorite: newState } = await toggleFavorite(currentUser?.id, property?.id);
    setIsFavorite(newState);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderRooms = () => (
    <View style={styles.tabContent}>
      {availableRooms.length === 0 ? (
        <View style={styles.noRoomsContainer}>
          <Ionicons name="sad-outline" size={32} color={COLORS.textTertiary} style={{ marginBottom: 8 }} />
          <Text style={styles.noRoomsText}>Tidak ada kamar tersedia saat ini</Text>
        </View>
      ) : (
        availableRooms.map((room) => {
          const facilities = room.room_facilities
            ?.map((rf) => rf.facility_master?.name)
            .filter(Boolean)
            .slice(0, 5);
          return (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              onPress={() =>
                navigation.navigate(TENANT_SCREENS.ROOM_DETAIL, { room, property })
              }
              activeOpacity={0.8}
            >
              <View style={styles.roomCardHeader}>
                <View>
                  <Text style={styles.roomNumber}>Kamar {room.room_number}</Text>
                  <Text style={styles.roomType}>{room.room_type} · {room.size_sqm ? `${room.size_sqm} m²` : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[room.status]?.bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_CONFIG[room.status]?.color }]}>
                    {STATUS_CONFIG[room.status]?.label}
                  </Text>
                </View>
              </View>
              {facilities?.length > 0 && (
                <View style={styles.roomFacilities}>
                  {facilities.map((f, i) => (
                    <View key={i} style={styles.facilityTag}>
                      <Text style={styles.facilityTagText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.roomPriceRow}>
                <Text style={styles.roomPrice}>{formatCurrency(room.base_price)}/bln</Text>
                <View style={[styles.detailBtn, { backgroundColor: COLORS.accent }]}>
                  <Text style={styles.detailBtnText}>Detail</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.white} style={{ marginLeft: 4 }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
          <Ionicons name="location" size={20} color={COLORS.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>Lokasi</Text>
        </View>
        <Text style={styles.infoText}>{property?.address_line}</Text>
        <Text style={styles.infoText}>{property?.district ? `${property.district}, ` : ''}{property?.city}</Text>
        {property?.postal_code && <Text style={styles.infoText}>Kode Pos: {property.postal_code}</Text>}

        {property?.latitude != null && property?.longitude != null && (
          <View style={{ borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginTop: SPACING[3], borderWidth: 1, borderColor: COLORS.border, height: 200 }}>
            <MapboxGL.MapView
              style={{ flex: 1 }}
              logoEnabled={false}
              attributionEnabled={false}
              styleURL={MapboxGL.StyleURL.Street}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <MapboxGL.Camera
                defaultSettings={{
                  centerCoordinate: [parseFloat(property.longitude), parseFloat(property.latitude)],
                  zoomLevel: 15,
                }}
              />
              <MapboxGL.MarkerView
                id="property-marker"
                coordinate={[parseFloat(property.longitude), parseFloat(property.latitude)]}
              >
                <View style={{ backgroundColor: COLORS.primary, padding: 6, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white }}>
                  <Ionicons name="home" size={18} color={COLORS.white} />
                </View>
              </MapboxGL.MarkerView>
            </MapboxGL.MapView>
            <View style={{ position: 'absolute', bottom: 6, left: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', padding: 6, borderRadius: 6 }}>
              <Text style={{ color: COLORS.white, fontSize: 10, textAlign: 'center' }}>
                📍 Lat: {parseFloat(property.latitude).toFixed(5)}, Long: {parseFloat(property.longitude).toFixed(5)}
              </Text>
            </View>
          </View>
        )}

        {property?.latitude != null && property?.longitude != null && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.primary,
              paddingVertical: SPACING[3],
              borderRadius: BORDER_RADIUS.md,
              marginTop: SPACING[3],
            }}
            onPress={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
              Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Tidak dapat membuka aplikasi Google Maps.');
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="map" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.white }}>
              🗺️ Buka Rute di Google Maps (Peta Bawaan HP)
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
          <Ionicons name="people" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>Kebijakan Penghuni</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons 
            name={property?.gender_policy === 'male' ? 'man' : property?.gender_policy === 'female' ? 'woman' : 'male-female'} 
            size={16} 
            color={COLORS.textSecondary} 
            style={{ marginRight: 6 }} 
          />
          <Text style={styles.infoText}>
            {property?.gender_policy === 'male' ? 'Khusus Putra'
              : property?.gender_policy === 'female' ? 'Khusus Putri'
              : 'Campur (Putra & Putri)'}
          </Text>
        </View>
      </View>
      {property?.description && (
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>Tentang Kosan</Text>
          </View>
          <Text style={styles.infoText}>{property.description}</Text>
        </View>
      )}
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
          <Ionicons name="person" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>Pemilik</Text>
        </View>
        <View style={styles.ownerRow}>
          <View style={styles.ownerAvatar}>
            <Text style={styles.ownerAvatarText}>
              {property?.users?.full_name?.[0]?.toUpperCase() ?? 'O'}
            </Text>
          </View>
          <View>
            <Text style={styles.ownerName}>{property?.users?.full_name ?? '—'}</Text>
            <Text style={styles.ownerPhone}>{property?.users?.phone_number ?? '—'}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFacilities = () => (
    <View style={styles.tabContent}>
      {(property?.general_facilities?.length ?? 0) === 0 ? (
        <Text style={styles.noDataText}>Tidak ada fasilitas umum yang tersedia</Text>
      ) : (
        <View style={styles.facilitiesGrid}>
          {(property?.general_facilities ?? []).map((fac, i) => (
            <View key={i} style={styles.facilityGridItem}>
              <Text style={styles.facilityGridText}>{fac.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      )}
      {property?.rules && (
        <View style={styles.rulesCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.rulesTitle, { marginBottom: 0 }]}>Peraturan Kosan</Text>
          </View>
          <Text style={styles.rulesText}>{property.rules}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Photo Gallery */}
        <View style={styles.gallery}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
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
              <Ionicons name="home-outline" size={64} color={COLORS.textTertiary} />
            </View>
          )}

          {/* Back & Favorite */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteBtn} onPress={handleToggleFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? COLORS.error : COLORS.white} />
          </TouchableOpacity>

          {/* Photo indicators */}
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

          {/* Available Count */}
          <View style={styles.availableBadge}>
            <Text style={styles.availableBadgeText}>{availableRooms.length} kamar tersedia</Text>
          </View>
        </View>

        {/* Property Name & Address */}
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyName}>{property?.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location" size={16} color={COLORS.accent} style={{ marginRight: 4 }} />
            <Text style={styles.propertyAddress}>{property?.address_line}, {property?.city}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'Kamar' && renderRooms()}
        {activeTab === 'Informasi' && renderInfo()}
        {activeTab === 'Fasilitas' && renderFacilities()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  gallery: { height: 280, position: 'relative' },
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
  backBtnText: { color: COLORS.white, fontSize: 20, lineHeight: 24 },
  favoriteBtn: {
    position: 'absolute',
    top: SPACING[12],
    right: SPACING[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndicators: {
    position: 'absolute',
    bottom: SPACING[10],
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
  availableBadge: {
    position: 'absolute',
    bottom: SPACING[3],
    left: SPACING[4],
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  availableBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  propertyHeader: {
    backgroundColor: COLORS.white,
    padding: SPACING[5],
    paddingBottom: SPACING[4],
  },
  propertyName: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  propertyAddress: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  tabTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  tabContent: { padding: SPACING[4], gap: SPACING[3] },
  noRoomsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOW.sm,
  },
  noRoomsText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  roomCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  roomNumber: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomType: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  statusBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold },
  roomFacilities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[1],
    marginBottom: SPACING[3],
  },
  facilityTag: {
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  facilityTagText: { fontSize: FONT_SIZE.xs, color: COLORS.primary },
  roomPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
  },
  detailBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
  // Info Tab
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  infoCardTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  infoText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerAvatarText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  ownerName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  ownerPhone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  // Facilities Tab
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  facilityGridItem: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    ...SHADOW.sm,
  },
  facilityGridText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  noDataText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },
  rulesCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  rulesTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  rulesText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
});

export default PropertyDetailScreen;
