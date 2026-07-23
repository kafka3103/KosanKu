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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { getPropertyRatingSummary, getPropertyReviews } from '../../services/reviewService';
import { TENANT_SCREENS } from '../../constants/screenNames';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const getStatusConfig = (t) => ({
  available: { color: COLORS.success, bg: COLORS.successLight, label: t('propertyDetail.status.available', 'Tersedia') },
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: t('propertyDetail.status.pending', 'Diproses') },
  occupied: { color: COLORS.error, bg: COLORS.errorLight, label: t('propertyDetail.status.occupied', 'Terisi') },
  maintenance: { color: COLORS.grey500, bg: COLORS.grey100, label: t('propertyDetail.status.maintenance', 'Perawatan') },
});

const TAB_KEYS = ['room', 'info', 'facility', 'review'];

const getTabLabel = (t, key) => {
  const labels = {
    room: t('propertyDetail.tabs.room', 'Kamar'),
    info: t('propertyDetail.tabs.info', 'Informasi'),
    facility: t('propertyDetail.tabs.facility', 'Fasilitas'),
    review: t('propertyDetail.tabs.review', 'Ulasan'),
  };
  return labels[key] ?? key;
};

const PropertyDetailScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  const propertyParam = route.params?.property;
  const [property, setProperty] = useState(propertyParam);
  const [isLoading, setIsLoading] = useState(!propertyParam);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('room');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState([]);



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
      loadReviews();
    }
  }, [propertyParam?.id]);

  const loadReviews = async () => {
    const summary = await getPropertyRatingSummary(propertyParam.id);
    setRatingSummary(summary);
    const { data } = await getPropertyReviews(propertyParam.id);
    if (data) setReviews(data);
  };

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
          <Text style={styles.noRoomsText}>{t('propertyDetail.noRooms', 'Tidak ada kamar tersedia saat ini')}</Text>
        </View>
      ) : (
        availableRooms.map((room, index) => {
          const facilities = room.room_facilities
            ?.map((rf) => rf.facility_master?.name)
            .filter(Boolean)
            .slice(0, 5);
          return (
            <TouchableOpacity
              key={room.id || index}
              style={styles.roomCard}
              onPress={() =>
                navigation.navigate(TENANT_SCREENS.ROOM_DETAIL, { room, property })
              }
              activeOpacity={0.8}
            >
              <View style={styles.roomCardHeader}>
                <View>
                  <Text style={styles.roomNumber}>{t('propertyDetail.roomNumber', 'Kamar {{number}}', { number: room.room_number })}</Text>
                  <Text style={styles.roomType}>{room.room_type} · {room.size_sqm ? `${room.size_sqm} m²` : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(t)[room.status]?.bg }]}>
                  <Text style={[styles.statusText, { color: getStatusConfig(t)[room.status]?.color }]}>
                    {getStatusConfig(t)[room.status]?.label}
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
                <Text style={styles.roomPrice}>{formatCurrency(room.base_price)}{t('propertyDetail.perMonth', '/bln')}</Text>
                <View style={[styles.detailBtn, { backgroundColor: COLORS.accent }]}>
                  <Text style={styles.detailBtnText}>{t('propertyDetail.btnDetail', 'Detail')}</Text>
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
          <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>{t('propertyDetail.locationTitle', 'Lokasi')}</Text>
        </View>
        <Text style={styles.infoText}>{property?.address_line}</Text>
        <Text style={styles.infoText}>{property?.district ? `${property.district}, ` : ''}{property?.city}</Text>
        {property?.postal_code && <Text style={styles.infoText}>{t('propertyDetail.postalCode', 'Kode Pos: ')}{property.postal_code}</Text>}

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
                Alert.alert(t('common.error', 'Error'), t('propertyDetail.openMapError', 'Tidak dapat membuka aplikasi Google Maps.'));
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="map" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.white }}>
              {t('propertyDetail.openMap', '🗺️ Buka Rute di Google Maps (Peta Bawaan HP)')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
          <Ionicons name="people" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>{t('propertyDetail.policyTitle', 'Kebijakan Penghuni')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons 
            name={property?.gender_policy === 'male' ? 'man' : property?.gender_policy === 'female' ? 'woman' : 'male-female'} 
            size={16} 
            color={COLORS.textSecondary} 
            style={{ marginRight: 6 }} 
          />
          <Text style={styles.infoText}>
            {property?.gender_policy === 'male' ? t('propertyDetail.policyMale', 'Khusus Putra')
              : property?.gender_policy === 'female' ? t('propertyDetail.policyFemale', 'Khusus Putri')
              : t('propertyDetail.policyMixed', 'Campur (Putra & Putri)')}
          </Text>
        </View>
      </View>
      {property?.description && (
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>{t('propertyDetail.aboutTitle', 'Tentang Kosan')}</Text>
          </View>
          <Text style={styles.infoText}>{property.description}</Text>
        </View>
      )}
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
          <Ionicons name="person" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.infoCardTitle, { marginBottom: 0 }]}>{t('propertyDetail.ownerTitle', 'Pemilik')}</Text>
        </View>
        <View style={styles.ownerRow}>
          <View style={styles.ownerAvatar}>
            <Text style={styles.ownerAvatarText}>
              {property?.users?.full_name?.[0]?.toUpperCase() ?? 'O'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ownerName}>{property?.users?.full_name ?? '—'}</Text>
            <Text style={styles.ownerPhone}>{property?.users?.phone_number ?? '—'}</Text>
          </View>
          {property?.users?.phone_number && (
            <TouchableOpacity 
              style={{ backgroundColor: '#25D366', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                let phone = property.users.phone_number.replace(/\D/g, '');
                if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                Linking.openURL(`whatsapp://send?phone=${phone}&text=Halo, saya tertarik dengan kosan ${property.name} yang ada di aplikasi KosanKu.`);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{t('propertyDetail.chatWA', 'Chat WA')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderFacilities = () => (
    <View style={styles.tabContent}>
      {(property?.general_facilities?.length ?? 0) === 0 ? (
        <Text style={styles.noDataText}>{t('propertyDetail.noFacilities', 'Tidak ada fasilitas umum yang tersedia')}</Text>
      ) : (
        <View style={styles.facilitiesGrid}>
          {(property?.general_facilities ?? []).map((fac, i) => (
            <View key={i} style={styles.facilityGridItem}>
              <Text style={styles.facilityGridText}>{t('facilities.' + fac.replace(/_/g, ' '), fac.replace(/_/g, ' '))}</Text>
            </View>
          ))}
        </View>
      )}
      {property?.rules && (
        <View style={styles.rulesCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.rulesTitle, { marginBottom: 0 }]}>{t('propertyDetail.rulesTitle', 'Peraturan Kosan')}</Text>
          </View>
          {property.rules.split('\n').map((rule, idx) => (
            <Text key={idx} style={styles.rulesText}>{t('rules.' + rule.replace(/^\d+\.\s*/, '').trim(), rule)}</Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderReviews = () => (
    <View style={styles.tabContent}>
      <View style={styles.ratingSummaryCard}>
        <View style={styles.ratingHeaderRow}>
          <Text style={styles.ratingBigNumber}>{ratingSummary.average}</Text>
          <View style={styles.ratingStars}>
            <Ionicons name="star" size={24} color={COLORS.warning} />
            <Text style={styles.ratingTotalText}>{t('propertyDetail.fromReviews', 'dari {{count}} Ulasan', { count: ratingSummary.count })}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.addReviewBtn}
        onPress={() => navigation.navigate('AddReviewScreen', { propertyId: property.id })}
      >
        <Ionicons name="pencil" size={20} color={COLORS.white} />
        <Text style={styles.addReviewBtnText}>{t('propertyDetail.writeReview', 'Tulis Ulasan')}</Text>
      </TouchableOpacity>
      {reviews.length === 0 ? (
        <Text style={styles.noDataText}>{t('propertyDetail.noReviews', 'Belum ada ulasan untuk kosan ini.')}</Text>
      ) : (
        reviews.map((rev, index) => (
          <View key={rev.id || `review-${index}`} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.ownerAvatarText}>{rev.users?.full_name?.[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewName}>{rev.users?.full_name ?? t('common.anonymous', 'Anonim')}</Text>
                <Text style={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID')}</Text>
              </View>
              <View style={styles.reviewStarBadge}>
                <Ionicons name="star" size={14} color={COLORS.warning} style={{ marginRight: 4 }} />
                <Text style={styles.reviewStarText}>{Number(rev.average_rating).toFixed(1)}</Text>
              </View>
            </View>
            {rev.comment && <Text style={styles.reviewComment}>{rev.comment}</Text>}
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top, backgroundColor: COLORS.primary }} />
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
          <TouchableOpacity style={[styles.backBtn, { top: SPACING[4] }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.favoriteBtn, { top: SPACING[4] }]} onPress={handleToggleFavorite}>
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
            <Text style={styles.availableBadgeText}>{t('propertyDetail.roomsAvailable', '{{count}} kamar tersedia', { count: availableRooms.length })}</Text>
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
          {TAB_KEYS.map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tab, activeTab === tabKey && styles.tabActive]}
              onPress={() => setActiveTab(tabKey)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tabKey && styles.tabTextActive]}>
                {getTabLabel(t, tabKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'room' && renderRooms()}
        {activeTab === 'info' && renderInfo()}
        {activeTab === 'facility' && renderFacilities()}
        {activeTab === 'review' && renderReviews()}
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
  
  // Reviews Tab
  ratingSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  ratingBigNumber: {
    fontSize: 48,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  ratingStars: {
    justifyContent: 'center',
  },
  ratingTotalText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[4],
  },
  addReviewBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    marginLeft: SPACING[2],
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  reviewName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  reviewStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewStarText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
  },
  reviewComment: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING[1],
  },
});

export default PropertyDetailScreen;
