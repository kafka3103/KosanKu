/**
 * screens/owner/PropertyListScreen.jsx
 * Daftar properti milik owner — entry point ke manajemen kamar
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
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
import { getOwnerProperties, deleteProperty } from '../../services/propertyService';
import { checkOwnerProfileExists } from '../../services/userService';
import { OWNER_SCREENS } from '../../constants/screenNames';
import USER_ROLE from '../../constants/userRole';

const StatusBadge = ({ isActive }) => (
  <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
    <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
      {isActive ? 'Aktif' : 'Tidak Aktif'}
    </Text>
  </View>
);

const PropertyCard = ({ property, onPress, onEdit, onDelete }) => {
  const coverPhoto = property.cover_photo_url;

  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress} activeOpacity={0.85}>
      {/* Cover Photo */}
      <View style={styles.cardPhotoContainer}>
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={styles.cardPhoto} />
        ) : (
          <View style={styles.cardPhotoPlaceholder}>
            <Ionicons name="business-outline" size={48} color={COLORS.textTertiary} />
          </View>
        )}
        <StatusBadge isActive={property.is_active} />
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.propertyName} numberOfLines={1}>
          {property.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3] }}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.propertyAddress, { marginBottom: 0 }]} numberOfLines={1}>
            {property.address_line}, {property.city}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statItemValue}>{property.total_rooms}</Text>
            <Text style={styles.statItemLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statItemValue, { color: COLORS.success }]}>
              {property.available_rooms}
            </Text>
            <Text style={styles.statItemLabel}>Tersedia</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statItemValue, { color: COLORS.statusOccupied }]}>
              {property.occupied_rooms}
            </Text>
            <Text style={styles.statItemLabel}>Terisi</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pencil" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Edit</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onDelete}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="trash" size={14} color={COLORS.error} style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Hapus</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const PropertyListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProperties = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const { data, error } = await getOwnerProperties(currentUser.id);
    if (!error && data) {
      setProperties(data);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [loadProperties])
  );

  const handleDelete = (property) => {
    Alert.alert(
      'Hapus Properti',
      `Yakin ingin menghapus "${property.name}"? Semua kamar dalam properti ini juga akan dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteProperty(property.id);
            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              setProperties((prev) => prev.filter((p) => p.id !== property.id));
            }
          },
        },
      ]
    );
  };

  const handlePressProperty = (property) => {
    navigation.navigate(OWNER_SCREENS.ROOM_LIST, { property });
  };

  const handleAddProperty = async () => {
    const hasProfile = await checkOwnerProfileExists(currentUser?.id);
    if (!hasProfile) {
      Alert.alert(
        'Profil Belum Lengkap',
        'Anda harus mengunggah foto kartu identitas (KTP/SIM) sebelum dapat menambahkan properti baru.',
        [
          { text: 'Batal', style: 'cancel' },
          { 
            text: 'Lengkapi Profil', 
            onPress: () => navigation.navigate('RoleRegistrationScreen', { 
              targetRole: USER_ROLE.OWNER, 
              isCompletingProfile: true 
            }) 
          }
        ]
      );
      return;
    }

    navigation.navigate(OWNER_SCREENS.PROPERTY_FORM, { property: null });
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
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <DrawerButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('property.list.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {properties.length} properti terdaftar
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 180 }]}
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
            <Ionicons name="business-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{t('property.list.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('property.list.emptySubtitle')}</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddProperty}>
              <Text style={styles.emptyAddBtnText}>{t('property.list.addButton')}</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => handlePressProperty(item)}
            onEdit={() => navigation.navigate(OWNER_SCREENS.PROPERTY_FORM, { property: item })}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 110 }]} 
        onPress={handleAddProperty} 
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
    borderBottomLeftRadius: BORDER_RADIUS['2xl'],
    borderBottomRightRadius: BORDER_RADIUS['2xl'],
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
  listContent: {
    padding: SPACING[5],
    paddingBottom: SPACING[20],
    gap: SPACING[4],
  },
  propertyCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  cardPhotoContainer: {
    height: 160,
    position: 'relative',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeActive: {
    backgroundColor: COLORS.successLight,
  },
  badgeInactive: {
    backgroundColor: COLORS.grey100,
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  badgeTextActive: {
    color: COLORS.success,
  },
  badgeTextInactive: {
    color: COLORS.grey500,
  },
  cardBody: {
    padding: SPACING[4],
  },
  propertyName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[3],
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statItemLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING[2],
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.primarySurface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING[2],
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: COLORS.errorLight,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.primary,
  },
  actionBtnTextDanger: {
    color: COLORS.error,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[16],
  },
  emptyIcon: {
    marginBottom: SPACING[4],
  },
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
  emptyAddBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
  },
  emptyAddBtnText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semiBold,
    fontSize: FONT_SIZE.base,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING[8],
    right: SPACING[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.xl,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: 32,
  },
});

export default PropertyListScreen;
