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
            <Text style={styles.cardImagePlaceholderText}>🏘️</Text>
          </View>
        )}
        <View style={styles.availableTag}>
          <Text style={styles.availableTagText}>{availableCount} tersedia</Text>
        </View>
        <View style={styles.genderTag}>
          <Text style={styles.genderTagText}>
            {property.gender_policy === 'male' ? '👨 Putra'
              : property.gender_policy === 'female' ? '👩 Putri'
              : '👫 Campur'}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
        <Text style={styles.propertyAddress} numberOfLines={1}>
          📍 {property.address_line}, {property.city}
        </Text>

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
        {minPrice != null && (
          <Text style={styles.priceText}>
            Mulai <Text style={styles.priceValue}>{formatCurrency(minPrice)}</Text>/bln
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SearchScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [filterGender, setFilterGender] = useState('all');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);

  const loadCities = useCallback(async () => {
    const { data } = await getAvailableCities();
    if (data) setAvailableCities(data);
  }, []);

  const loadProperties = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const { data, error } = await searchProperties({
      searchQuery: searchQuery.trim() || undefined,
      city: filterCity || undefined,
      genderPolicy: filterGender === 'all' ? undefined : filterGender,
      roomType: filterRoomType || undefined,
      minPrice: filterMinPrice ? parseFloat(filterMinPrice) : undefined,
      maxPrice: filterMaxPrice ? parseFloat(filterMaxPrice) : undefined,
    });
    if (!error && data) setProperties(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [searchQuery, filterGender, filterRoomType, filterMinPrice, filterMaxPrice, filterCity]);

  useEffect(() => {
    loadCities();
    loadProperties();
  }, []);

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
        <Text style={styles.headerSubtitle}>Temukan kosan impian Anda</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
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
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
          onPress={() => setShowFilter(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterBtnText}>
            {hasActiveFilter ? '🔽 Filter Aktif' : '🔽 Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      {!isLoading && (
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

      {/* Property List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Mencari kosan...</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.emptyEmoji}>🏘️</Text>
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
                <Text style={styles.filterModalClose}>✕</Text>
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
  searchIcon: { fontSize: 18, marginRight: SPACING[2] },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  clearIcon: { fontSize: 16, color: COLORS.textTertiary, padding: SPACING[2] },
  filterBtn: {
    alignSelf: 'flex-start',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  propertyAddress: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING[3] },
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
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[12] },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING[3] },
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
  filterModalClose: { fontSize: 20, color: COLORS.textSecondary },
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
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
  },
  applyFilterBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
});

export default SearchScreen;
