/**
 * screens/tenant/SearchScreen.jsx
 * Pencarian dan filter kosan tersedia untuk tenant
 */

import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { WebView } from 'react-native-webview';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { searchProperties, getAvailableCities } from '../../services/searchService';
import { TENANT_SCREENS } from '../../navigation/TenantNavigator';

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
  // Ambil harga kamar termurah yang available
  const availableRooms = property.rooms?.filter((r) => r.status === 'available') ?? [];
  const minPrice = availableRooms.length > 0
    ? Math.min(...availableRooms.map((r) => parseFloat(r.base_price ?? 0)))
    : null;
  const availableCount = availableRooms.length;

  const facilities = property.general_facilities ?? [];

  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress} activeOpacity={0.85}>
      {/* Cover Photo */}
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

      {/* Info */}
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

        {/* Facilities */}
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

        {/* Price */}
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

  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View Mode & Location
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
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

  // Auto-search saat query berubah
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cari Kosan</Text>
        <Text style={styles.headerSubtitle}>Temukan kosan impian terdekat dari Anda</Text>

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
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons Row: Filter & Map Toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
          <TouchableOpacity
            style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterBtnText, hasActiveFilter && { color: COLORS.accent }]}>
              Filter {hasActiveFilter && 'Aktif'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={hasActiveFilter ? COLORS.accent : COLORS.white} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, viewMode === 'map' && styles.filterBtnActive]}
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
              size={16}
              color={viewMode === 'map' ? COLORS.primary : COLORS.white}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.filterBtnText, viewMode === 'map' && { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold }]}>
              {viewMode === 'list' ? 'Lihat Peta' : 'Daftar List'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location GPS Status Bar */}
      <View style={styles.locationBar}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={handleGetLocation} activeOpacity={0.7}>
          <Ionicons
            name={userLocation ? 'navigate-circle' : 'location-outline'}
            size={18}
            color={userLocation ? COLORS.primary : COLORS.textTertiary}
            style={{ marginRight: SPACING[2] }}
          />
          <Text style={styles.locationBarText} numberOfLines={1}>
            {locationStatusText}
          </Text>
          {locationLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleGetLocation} style={styles.refreshLocBtn}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      {viewMode === 'list' && !isLoading && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {properties.length} kosan ditemukan
          </Text>
          {hasActiveFilter && (
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetFilterText}>Reset Filter</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content: List or Map View */}
      {viewMode === 'map' ? (
        <View style={{ flex: 1, backgroundColor: '#0D1B2A' }}>
          {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY &&
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY !== 'your-google-maps-api-key' &&
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.trim() !== '' ? (
            <MapView
              style={{ flex: 1, width: '100%' }}
              initialRegion={{
                latitude: userLocation?.latitude ?? properties.find((p) => p.latitude != null)?.latitude ?? -6.2641,
                longitude: userLocation?.longitude ?? properties.find((p) => p.longitude != null)?.longitude ?? 106.7944,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation={Boolean(userLocation)}
              showsMyLocationButton={true}
            >
              {properties.map((prop) => {
                if (prop.latitude == null || prop.longitude == null) return null;
                return (
                  <Marker
                    key={prop.id}
                    coordinate={{
                      latitude: parseFloat(prop.latitude),
                      longitude: parseFloat(prop.longitude),
                    }}
                    title={prop.name}
                    description={prop.address_line}
                    onPress={() => setSelectedMapProperty(prop)}
                  />
                );
              })}
            </MapView>
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <WebView
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8" />
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        body, html, #map {
                          width: 100%;
                          height: 100%;
                          margin: 0;
                          padding: 0;
                          background-color: #0D1B2A;
                        }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script>
                        var map = L.map('map', { zoomControl: true }).setView([${userLocation?.latitude ?? properties.find((p) => p.latitude != null)?.latitude ?? -6.2641}, ${userLocation?.longitude ?? properties.find((p) => p.longitude != null)?.longitude ?? 106.7944}], 14);
                        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                          maxZoom: 19,
                          attribution: '© OpenStreetMap KosanKu'
                        }).addTo(map);

                        ${userLocation ? `
                          var userIcon = L.divIcon({
                            className: 'custom-user-icon',
                            html: '<div style="background-color:#00B4D8;width:18px;height:18px;border-radius:9px;border:3px solid #fff;box-shadow:0 0 10px #00B4D8;"></div>',
                            iconSize: [24, 24]
                          });
                          L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: userIcon }).addTo(map).bindPopup("📍 Posisi GPS Anda");
                        ` : ''}

                        ${properties.filter(p => p.latitude != null && p.longitude != null).map(p => `
                          var m_${String(p.id).replace(/[^a-zA-Z0-9]/g, '')} = L.marker([${p.latitude}, ${p.longitude}]).addTo(map);
                          m_${String(p.id).replace(/[^a-zA-Z0-9]/g, '')}.bindPopup("<b>${p.name}</b><br/>${p.city || ''}");
                          m_${String(p.id).replace(/[^a-zA-Z0-9]/g, '')}.on('click', function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selectProperty', id: '${p.id}' }));
                          });
                        `).join('\n')}
                      </script>
                    </body>
                    </html>
                  `
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'selectProperty') {
                      const found = properties.find(p => String(p.id) === String(data.id));
                      if (found) setSelectedMapProperty(found);
                    }
                  } catch (err) {
                    console.warn('WebView Message Error:', err);
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={{ flex: 1 }}
              />
              <View style={{ position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: 'rgba(13,27,42,0.85)', padding: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: '#415A77' }}>
                <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.xs, textAlign: 'center', fontWeight: FONT_WEIGHT.semiBold }}>
                  🗺️ Peta Interaktif OpenStreetMap (Gratis & Bebas Kuota): Ketuk pin di peta untuk melihat detail kosan
                </Text>
              </View>
            </View>
          )}

          {/* Floating Property Preview Card when pin is tapped */}
          {selectedMapProperty && (
            <View style={styles.mapPreviewContainer}>
              <TouchableOpacity
                style={styles.mapPreviewCard}
                onPress={() => {
                  navigation.navigate(TENANT_SCREENS.PROPERTY_DETAIL, {
                    property: selectedMapProperty,
                  });
                }}
                activeOpacity={0.9}
              >
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

                <View style={styles.mapPreviewAction}>
                  <Text style={styles.mapPreviewActionText}>Lihat Detail Kosan & Kamar →</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Mencari kosan...</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); loadProperties(true); }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="home-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>Kosan Tidak Ditemukan</Text>
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
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[14],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    marginTop: 2,
    marginBottom: SPACING[4],
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
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  filterBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
  },
  filterBtnActive: { backgroundColor: COLORS.white },
  filterBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.white, fontWeight: FONT_WEIGHT.medium },
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
  cardImagePlaceholderText: { fontSize: 56 },
  availableTag: {
    position: 'absolute',
    bottom: SPACING[3],
    left: SPACING[3],
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  availableTagText: { fontSize: FONT_SIZE.xs, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  genderTag: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  genderTagText: { fontSize: FONT_SIZE.xs, color: COLORS.white },
  cardBody: { padding: SPACING[4] },
  propertyName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  propertyAddress: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[1],
    marginBottom: SPACING[3],
  },
  facilityTag: {
    backgroundColor: COLORS.grey100,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  facilityTagText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  priceText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationBarText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  refreshLocBtn: {
    paddingLeft: SPACING[3],
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING[3],
  },
  distanceBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primary,
  },
  // Map Preview Card
  mapPreviewContainer: {
    position: 'absolute',
    bottom: SPACING[5],
    left: SPACING[4],
    right: SPACING[4],
    ...SHADOW.lg,
  },
  mapPreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapPreviewCloseBtn: {
    position: 'absolute',
    top: SPACING[2],
    right: SPACING[2],
    zIndex: 10,
  },
  mapPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    resizeMode: 'cover',
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
  },
  mapPreviewDistance: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginTop: 4,
  },
  mapPreviewAction: {
    marginTop: SPACING[3],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  mapPreviewActionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.accent,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[12] },
  emptyIcon: { marginBottom: SPACING[3] },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[1],
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },
  resetBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
  },
  resetBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['3xl'],
    borderTopRightRadius: BORDER_RADIUS['3xl'],
    padding: SPACING[6],
    maxHeight: '85%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  filterModalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  filterLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING[2],
    marginTop: SPACING[4],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  chip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.grey100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  priceInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.grey50,
  },
  priceSeparator: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary },
  filterActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[6],
    paddingBottom: SPACING[4],
  },
  resetFilterBtn: {
    flex: 1,
    backgroundColor: COLORS.grey100,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
  },
  resetFilterBtnText: { color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semiBold },
  applyFilterBtn: {
    flex: 2,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
  },
  applyFilterBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
});

export default SearchScreen;
