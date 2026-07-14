/**
 * screens/tenant/SearchScreen.jsx
 * Pencarian dan filter kosan tersedia untuk tenant (Map-First UI)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { DrawerActions } from '@react-navigation/native';
import DrawerButton from '../../components/navigation/DrawerButton';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { searchProperties, getAvailableCities } from '../../services/searchService';
import { TENANT_SCREENS } from '../../constants/screenNames';
// import * as Location from 'expo-location';
// import { WebView } from 'react-native-webview';


// Setup Mapbox Token
console.log('Mapbox Token Configured:', process.env.EXPO_PUBLIC_MAPBOX_KEY ? 'Yes (starts with ' + process.env.EXPO_PUBLIC_MAPBOX_KEY.substring(0, 5) + ')' : 'No Token Found!');
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY);
MapboxGL.setTelemetryEnabled(false);

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in kilometers
};

const formatDistance = (distKm) => {
  if (distKm == null) return null;
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
};

const GENDER_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'male', label: 'Putra' },
  { value: 'female', label: 'Putri' },
  { value: 'mixed', label: 'Campur' },
];

const ROOM_TYPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
  { value: 'studio', label: 'Studio' },
];

const PropertyCard = ({ property, onPress }) => {
  const availableRooms = property.rooms?.filter((r) => r.status === 'available') ?? [];
  const minPrice = availableRooms.length > 0
    ? Math.min(...availableRooms.map((r) => parseFloat(r.base_price ?? 0)))
    : null;
  const availableCount = availableRooms.length;
  const facilities = property.general_facilities ?? [];

  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardPhoto}>
        {property.cover_photo_url ? (
          <Image source={{ uri: property.cover_photo_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="home-outline" size={48} color={COLORS.textTertiary} />
          </View>
        )}
        <View style={styles.availableTag}>
          <Text style={styles.availableTagText}>{availableCount} tersedia</Text>
        </View>
        <View style={styles.genderTag}>
          <Ionicons
            name={
              property.gender_policy === 'male' ? 'man'
                : property.gender_policy === 'female' ? 'woman'
                  : 'male-female'
            }
            size={12}
            color={COLORS.white}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.genderTagText}>
            {property.gender_policy === 'male' ? 'Putra'
              : property.gender_policy === 'female' ? 'Putri'
                : 'Campur'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: property.distanceKm != null ? SPACING[1] : SPACING[3] }}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.propertyAddress} numberOfLines={1}>
            {property.address_line}, {property.city}
          </Text>
        </View>

        {property.distanceKm != null && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.distanceBadgeText}>
              {formatDistance(property.distanceKm)} dari lokasi Anda
            </Text>
          </View>
        )}

        {facilities.length > 0 && (
          <View style={styles.facilitiesRow}>
            {facilities.slice(0, 3).map((f, i) => (
              <View key={i} style={styles.facilityTag}>
                <Text style={styles.facilityTagText}>{f.replace('_', ' ')}</Text>
              </View>
            ))}
            {facilities.length > 3 && (
              <View style={styles.facilityTag}>
                <Text style={styles.facilityTagText}>+{facilities.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {minPrice != null ? (
          <Text style={styles.priceText}>
            Mulai <Text style={styles.priceValue}>{formatCurrency(minPrice)}</Text>/bln
          </Text>
        ) : (
          <Text style={[styles.priceText, { color: COLORS.textTertiary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium }]}>
            {property.rooms?.length > 0 ? 'Kamar Penuh / Belum Tersedia' : 'Belum Ada Kamar Ditambahkan'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SearchScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const mapCameraRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View Mode: 'map' (default) | 'list'
  const [viewMode, setViewMode] = useState('map'); 
  const [selectedMapProperty, setSelectedMapProperty] = useState(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatusText, setLocationStatusText] = useState('Mendeteksi lokasi GPS...');

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [filterGender, setFilterGender] = useState('all');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);

  const handleGetLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      setLocationStatusText('Mendeteksi lokasi GPS...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatusText('Izin lokasi ditolak. Urutan standar aktif.');
        setLocationLoading(false);
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({});
      let coords = lastKnown?.coords;

      if (!coords) {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = current?.coords;
      }

      if (coords) {
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationStatusText('Lokasi terdeteksi · Diurutkan terdekat');
        // If map is open, center camera on user
        if (mapCameraRef.current) {
           mapCameraRef.current.setCamera({
             centerCoordinate: [coords.longitude, coords.latitude],
             zoomLevel: 14,
             animationDuration: 1000,
           });
        }
      } else {
        setLocationStatusText('Gagal mendeteksi lokasi saat ini');
      }
      setLocationLoading(false);
    } catch (err) {
      console.warn('Error getting location:', err);
      setLocationStatusText('Gagal mendeteksi lokasi GPS');
      setLocationLoading(false);
    }
  }, []);

  const loadCities = useCallback(async () => {
    const { data } = await getAvailableCities();
    if (data) setAvailableCities(data);
  }, []);

  const loadProperties = useCallback(async (silent = false) => {
    if (!silent && !isRefreshing) setIsLoading(true);
    const { data, error } = await searchProperties({
      searchQuery: searchQuery.trim() || undefined,
      city: filterCity || undefined,
      genderPolicy: filterGender === 'all' ? undefined : filterGender,
      roomType: filterRoomType || undefined,
      minPrice: filterMinPrice ? parseFloat(filterMinPrice) : undefined,
      maxPrice: filterMaxPrice ? parseFloat(filterMaxPrice) : undefined,
    });
    if (!error && data) {
      const withDistance = data.map((prop) => {
        const dist = calculateDistance(
          userLocation?.latitude,
          userLocation?.longitude,
          prop.latitude,
          prop.longitude
        );
        return { ...prop, distanceKm: dist };
      });

      withDistance.sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm != null) return -1;
        if (b.distanceKm != null) return 1;
        return 0;
      });

      setProperties(withDistance);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [searchQuery, filterGender, filterRoomType, filterMinPrice, filterMaxPrice, filterCity, userLocation]);

  useEffect(() => {
    loadCities();
    handleGetLocation();
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProperties();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasActiveFilter =
    filterGender !== 'all' || filterRoomType || filterMinPrice || filterMaxPrice || filterCity;

  const resetFilters = () => {
    setFilterGender('all');
    setFilterRoomType('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCity('');
  };

  const applyFilters = () => {
    setShowFilter(false);
    loadProperties();
  };

  // Titik tengah default Jakarta
  const defaultCenter = [106.8272, -6.1751];

  return (    <View style={styles.container}>
      {/* SOLID HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + SPACING[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING[4] }}>
          <TouchableOpacity 
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginTop: 2, paddingRight: SPACING[3] }}
          >
            <Ionicons name="menu" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Cari Kosan</Text>
            <Text style={styles.headerSubtitle}>Temukan kosan impian terdekat dari Anda</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama kosan atau kota..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="search"
            onSubmitEditing={loadProperties}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons Row: Filter & Map Toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
          <TouchableOpacity
            style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterBtnText}>Filter {hasActiveFilter && 'Aktif'}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.white} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
              size={16}
              color={COLORS.white}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.filterBtnText}>
              {viewMode === 'list' ? 'Lihat Peta' : 'Daftar List Kosan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LOCATION STATUS BAR */}
      <View style={styles.locationStatusBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="navigate-circle" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.locationStatusText} numberOfLines={1}>{locationStatusText}</Text>
        </View>
        <TouchableOpacity onPress={handleGetLocation} style={{ padding: 4 }}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* LIST OR MAP CONTENT */}
      {viewMode === 'map' ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL={MapboxGL.StyleURL.Street}
            zoomEnabled={true}
            scrollEnabled={true}
            logoEnabled={true}
            attributionEnabled={true}
            onPress={() => setSelectedMapProperty(null)}
          >
            <MapboxGL.Camera
              ref={mapCameraRef}
              defaultSettings={{
                centerCoordinate: userLocation ? [userLocation.longitude, userLocation.latitude] : defaultCenter,
                zoomLevel: 15.5,
              }}
            />

            {/* Titik Lokasi Pengguna Saat ini (GPS) */}
            {userLocation && (
              <MapboxGL.UserLocation 
                visible={true}
                showsUserHeadingIndicator={true}
              />
            )}

            {/* Pin Kosan */}
            {properties.map((prop) => {
              if (prop.latitude == null || prop.longitude == null) return null;
              const isSelected = selectedMapProperty?.id === prop.id;
              return (
                <MapboxGL.MarkerView
                  key={`marker-${prop.id}`}
                  id={`marker-${prop.id}`}
                  coordinate={[parseFloat(prop.longitude), parseFloat(prop.latitude)]}
                >
                  <TouchableOpacity 
                    style={[styles.mapMarker, isSelected && styles.mapMarkerSelected]}
                    onPress={() => {
                      setSelectedMapProperty(prop);
                      mapCameraRef.current?.setCamera({
                        centerCoordinate: [parseFloat(prop.longitude), parseFloat(prop.latitude)],
                        zoomLevel: 15,
                        animationDuration: 500,
                      });
                    }}
                  >
                    <Ionicons name="home" size={isSelected ? 20 : 16} color={isSelected ? COLORS.white : COLORS.primary} />
                  </TouchableOpacity>
                </MapboxGL.MarkerView>
              );
            })}
          </MapboxGL.MapView>

          {/* Current Location FAB */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: selectedMapProperty ? 220 : 145, // move up if card is shown, and keep above bottom tab
              right: 20,
              backgroundColor: COLORS.white,
              width: 54,
              height: 54,
              borderRadius: 27,
              justifyContent: 'center',
              alignItems: 'center',
              ...SHADOW,
              elevation: 5,
            }}
            onPress={() => {
              if (userLocation) {
                mapCameraRef.current?.setCamera({
                  centerCoordinate: [userLocation.longitude, userLocation.latitude],
                  zoomLevel: 17.5,
                  animationDuration: 800,
                });
              } else {
                handleGetLocation();
              }
            }}
          >
            <Ionicons name="locate" size={26} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Selected Property Preview Modal (Floating Bottom) */}
          {selectedMapProperty && (
            <View style={[styles.mapPreviewContainer, { paddingBottom: insets.bottom + 100 }]}>
              <View style={styles.mapPreviewCard}>
                <TouchableOpacity
                  style={styles.mapPreviewCloseBtn}
                  onPress={() => setSelectedMapProperty(null)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.textTertiary} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {selectedMapProperty.cover_photo_url ? (
                    <Image source={{ uri: selectedMapProperty.cover_photo_url }} style={styles.mapPreviewImage} />
                  ) : (
                    <View style={[styles.mapPreviewImage, styles.cardImagePlaceholder]}>
                      <Ionicons name="home-outline" size={24} color={COLORS.textTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: SPACING[3], marginRight: SPACING[6] }}>
                    <Text style={styles.mapPreviewTitle} numberOfLines={1}>{selectedMapProperty.name}</Text>
                    <Text style={styles.mapPreviewAddress} numberOfLines={1}>{selectedMapProperty.address_line}, {selectedMapProperty.city}</Text>
                    {selectedMapProperty.distanceKm != null && (
                      <Text style={styles.mapPreviewDistance}>
                        📍 {formatDistance(selectedMapProperty.distanceKm)} dari lokasi Anda
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.mapPreviewAction, { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0, marginTop: SPACING[2], paddingTop: 0 }]}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: COLORS.primarySurface, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginRight: SPACING[2], flexDirection: 'row', justifyContent: 'center' }}
                    onPress={() => {
                       const lat = selectedMapProperty.latitude;
                       const lon = selectedMapProperty.longitude;
                       const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                       Linking.openURL(url).catch(() => Alert.alert('Error', 'Gagal membuka rute di peta.'));
                    }}
                  >
                    <Ionicons name="navigate" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: FONT_SIZE.xs }}>Rute Peta</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1.5, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => {
                      navigation.navigate(TENANT_SCREENS.PROPERTY_DETAIL, {
                        property: selectedMapProperty,
                      });
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: FONT_SIZE.xs }}>Lihat Detail Kosan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: SPACING[5], paddingTop: SPACING[4], paddingBottom: SPACING[2] }}>
            <Text style={{ fontSize: FONT_SIZE.md, color: COLORS.textSecondary }}>
              {properties.length} kosan ditemukan
            </Text>
          </View>
          {isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={properties}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: SPACING[5], paddingBottom: insets.bottom + 100 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadProperties(true); }} colors={[COLORS.primary]} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>Tidak ada kosan ditemukan</Text>
                  <Text style={styles.emptySubtitle}>
                    Coba ubah kata kunci atau filter pencarian Anda
                  </Text>
                  {hasActiveFilter && (
                    <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                      <Text style={styles.resetBtnText}>Reset Filter</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              renderItem={({ item }) => (
                <PropertyCard
                  property={item}
                  onPress={() =>
                    navigation.navigate(TENANT_SCREENS.PROPERTY_DETAIL, { property: item })
                  }
                />
              )}
            />
          )}
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Pencarian</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Kota */}
              <Text style={styles.filterLabel}>Kota</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !filterCity && styles.chipActive]}
                    onPress={() => setFilterCity('')}
                  >
                    <Text style={[styles.chipText, !filterCity && styles.chipTextActive]}>
                      Semua Kota
                    </Text>
                  </TouchableOpacity>
                  {availableCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.chip, filterCity === city && styles.chipActive]}
                      onPress={() => setFilterCity(city)}
                    >
                      <Text style={[styles.chipText, filterCity === city && styles.chipTextActive]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Gender */}
              <Text style={styles.filterLabel}>Kebijakan Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, filterGender === opt.value && styles.chipActive]}
                    onPress={() => setFilterGender(opt.value)}
                  >
                    <Text style={[styles.chipText, filterGender === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Room Type */}
              <Text style={styles.filterLabel}>Tipe Kamar</Text>
              <View style={styles.chipRow}>
                {ROOM_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, filterRoomType === opt.value && styles.chipActive]}
                    onPress={() => setFilterRoomType(opt.value)}
                  >
                    <Text style={[styles.chipText, filterRoomType === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Harga */}
              <Text style={styles.filterLabel}>Kisaran Harga (Rp/bulan)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.priceInput, { flex: 1 }]}
                  placeholder="Min"
                  value={filterMinPrice}
                  onChangeText={setFilterMinPrice}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textTertiary}
                />
                <Text style={styles.priceSeparator}>—</Text>
                <TextInput
                  style={[styles.priceInput, { flex: 1 }]}
                  placeholder="Max"
                  value={filterMaxPrice}
                  onChangeText={setFilterMaxPrice}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetFilterBtn} onPress={resetFilters}>
                <Text style={styles.resetFilterBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterBtn} onPress={applyFilters}>
                <Text style={styles.applyFilterBtnText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[4],
  },
  headerTitle: {
    fontSize: FONT_SIZE['xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING[3],
    marginBottom: SPACING[3],
  },
  searchIcon: { marginRight: SPACING[2] },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING[2],
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  filterBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Semi-transparent white
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
  },
  filterBtnActive: { backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  filterBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.white, fontWeight: FONT_WEIGHT.medium },
  
  locationStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationStatusText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  
  // Map Elements
  mapMarker: {
    backgroundColor: COLORS.white,
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOW.sm,
  },
  mapMarkerSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.white,
    transform: [{ scale: 1.2 }],
  },
  // mapStatusFloating removed since it's now in the header bar
  mapPreviewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING[4],
    backgroundColor: 'transparent',
  },
  mapPreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[3],
    ...SHADOW.lg,
  },
  mapPreviewCloseBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    padding: 4,
  },
  mapPreviewImage: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.xl,
  },
  mapPreviewTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  mapPreviewAddress: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  mapPreviewDistance: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  mapPreviewAction: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  mapPreviewActionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  
  // List Elements
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  resultsCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsCountText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  resetFilterText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[3],
  },
  loadingText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  listContent: { padding: SPACING[4], gap: SPACING[4], paddingBottom: SPACING[10] },
  propertyCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  cardPhoto: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableTag: {
    position: 'absolute',
    bottom: SPACING[3],
    left: SPACING[3],
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  availableTagText: { color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.bold },
  genderTag: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderTagText: { color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.medium },
  cardBody: { padding: SPACING[4] },
  propertyName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[1] },
  propertyAddress: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, flex: 1 },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING[3],
  },
  distanceBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  facilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], marginBottom: SPACING[4] },
  facilityTag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  facilityTagText: { fontSize: 10, color: COLORS.textSecondary },
  priceText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING[10] },
  emptyIcon: { marginBottom: SPACING[4] },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[2] },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING[10], marginBottom: SPACING[6] },
  resetBtn: { backgroundColor: COLORS.primarySurface, paddingHorizontal: SPACING[6], paddingVertical: SPACING[3], borderRadius: BORDER_RADIUS.xl },
  resetBtnText: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm },

  // Modal Filters
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['3xl'],
    borderTopRightRadius: BORDER_RADIUS['3xl'],
    padding: SPACING[5],
    maxHeight: '85%',
  },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[6] },
  filterModalTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  filterLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[3], marginTop: SPACING[4] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  chip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: FONT_WEIGHT.medium },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  priceInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  priceSeparator: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  filterActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[8],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetFilterBtn: {
    flex: 1,
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  resetFilterBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  applyFilterBtn: {
    flex: 2,
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOW.md,
  },
  applyFilterBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
});

export default SearchScreen;
