/**
 * screens/tenant/FavoriteScreen.jsx
 * Daftar kosan yang di-favorit oleh tenant
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DrawerButton from '../../components/navigation/DrawerButton';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getTenantFavorites, toggleFavorite } from '../../services/searchService';
import { TENANT_SCREENS } from '../../navigation/TenantNavigator';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const FavoriteCard = ({ favorite, onPress, onRemove }) => {
  const property = favorite.properties;
  const rooms = property?.rooms ?? [];
  const availableRooms = rooms.filter((r) => r.status === 'available');
  const minPrice = availableRooms.length > 0
    ? Math.min(...availableRooms.map((r) => parseFloat(r.base_price ?? 0)))
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {property?.cover_photo_url ? (
          <Image source={{ uri: property.cover_photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>🏘️</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn} onPress={onRemove} activeOpacity={0.7}>
          <Text style={styles.heartText}>❤️</Text>
        </TouchableOpacity>
        {availableRooms.length > 0 && (
          <View style={styles.availableBadge}>
            <Text style={styles.availableBadgeText}>{availableRooms.length} tersedia</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.propertyName} numberOfLines={1}>{property?.name}</Text>
        <Text style={styles.propertyAddress} numberOfLines={1}>
          📍 {property?.address_line}, {property?.city}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.genderBadge}>
            {property?.gender_policy === 'male' ? '👨 Putra'
              : property?.gender_policy === 'female' ? '👩 Putri'
              : '👫 Campur'}
          </Text>
          {minPrice != null ? (
            <Text style={styles.price}>
              Mulai <Text style={styles.priceValue}>{formatCurrency(minPrice)}</Text>/bln
            </Text>
          ) : (
            <Text style={styles.noRoomText}>Tidak tersedia</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FavoriteScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFavorites = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const { data, error } = await getTenantFavorites(currentUser.id);
    if (!error && data) setFavorites(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const handleRemoveFavorite = (favorite) => {
    Alert.alert(
      'Hapus Favorit',
      `Hapus "${favorite.properties?.name}" dari daftar favorit?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await toggleFavorite(currentUser.id, favorite.properties?.id);
            setFavorites((prev) => prev.filter((f) => f.id !== favorite.id));
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <DrawerButton style={{ marginRight: SPACING[3] }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Favorit Saya</Text>
          <Text style={styles.headerSubtitle}>{favorites.length} kosan disimpan</Text>
        </View>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadFavorites(true); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{t('favorites.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('favorites.emptySubtitle')}</Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate(TENANT_SCREENS.SEARCH_STACK)}
            >
              <Text style={styles.browseBtnText}>🔍 Jelajahi Kosan</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <FavoriteCard
            favorite={item}
            onPress={() =>
              navigation.navigate(TENANT_SCREENS.SEARCH_STACK, {
                screen: TENANT_SCREENS.PROPERTY_DETAIL,
                params: { property: item.properties },
              })
            }
            onRemove={() => handleRemoveFavorite(item)}
          />
        )}
      />
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
  },
  listContent: { padding: SPACING[4], gap: SPACING[4], paddingBottom: SPACING[10] },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  photoContainer: { height: 180, position: 'relative' },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: { fontSize: 56 },
  heartBtn: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartText: { fontSize: 18 },
  availableBadge: {
    position: 'absolute',
    bottom: SPACING[3],
    left: SPACING[3],
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  availableBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardBody: { padding: SPACING[4] },
  propertyName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  propertyAddress: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING[3] },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genderBadge: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    backgroundColor: COLORS.grey100,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  price: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  noRoomText: { fontSize: FONT_SIZE.xs, color: COLORS.error },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[16] },
  emptyIcon: { marginBottom: SPACING[4] },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING[6],
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
  },
  browseBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
});

export default FavoriteScreen;
