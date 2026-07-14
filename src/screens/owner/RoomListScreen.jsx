/**
 * screens/owner/RoomListScreen.jsx
 * Daftar kamar dalam satu properti milik owner
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { getPropertyRooms, deleteRoom } from '../../services/propertyService';
import { OWNER_SCREENS } from '../../constants/screenNames';

const STATUS_CONFIG = {
  available: { color: COLORS.success, bg: COLORS.successLight, label: 'Tersedia', icon: 'checkmark-circle' },
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Diproses', icon: 'time' },
  occupied: { color: COLORS.error, bg: COLORS.errorLight, label: 'Terisi', icon: 'close-circle' },
  maintenance: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Perawatan', icon: 'build' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const RoomCard = ({ room, onEdit, onDelete, onViewRequest }) => {
  const statusCfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
  const facilities = room.room_facilities
    ?.map((rf) => rf.facility_master?.name)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <View style={styles.roomCard}>
      {/* Header */}
      <View style={styles.roomCardHeader}>
        <View>
          <Text style={styles.roomNumber}>Kamar {room.room_number}</Text>
          <Text style={styles.roomType}>{room.room_type} · Lantai {room.floor_number ?? '-'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Price & Size */}
      <View style={styles.roomMeta}>
        <Text style={styles.roomPrice}>{formatCurrency(room.base_price)}/bln</Text>
        {room.size_sqm && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="expand" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.roomSize}>{room.size_sqm} m²</Text>
          </View>
        )}
      </View>

      {/* Facilities */}
      {facilities && facilities.length > 0 && (
        <View style={styles.facilitiesRow}>
          {facilities.map((f, i) => (
            <View key={i} style={styles.facilityTag}>
              <Text style={styles.facilityTagText}>{f}</Text>
            </View>
          ))}
          {(room.room_facilities?.length ?? 0) > 4 && (
            <View style={styles.facilityTag}>
              <Text style={styles.facilityTagText}>+{room.room_facilities.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.roomActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pencil" size={14} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </View>
        </TouchableOpacity>
        {room.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnWarning]}
            onPress={onViewRequest}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="clipboard" size={14} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>Tinjau</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FilterTab = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const RoomListScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const property = route.params?.property;
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const insets = useSafeAreaInsets();

  const loadRooms = useCallback(async (silent = false) => {
    if (!property?.id) return;
    if (!silent) setIsLoading(true);
    const { data, error } = await getPropertyRooms(property.id);
    if (!error && data) setRooms(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [property?.id]);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const handleDelete = (room) => {
    Alert.alert(
      'Hapus Kamar',
      `Yakin ingin menghapus kamar ${room.room_number}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteRoom(room.id);
            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              setRooms((prev) => prev.filter((r) => r.id !== room.id));
            }
          },
        },
      ]
    );
  };

  const filters = [
    { key: 'all', label: t('room.list.filterAll') },
    { key: 'available', label: t('room.list.filterAvailable') },
    { key: 'occupied', label: t('room.list.filterOccupied') },
    { key: 'pending', label: 'Diproses' },
    { key: 'maintenance', label: 'Perawatan' },
  ];

  const filteredRooms =
    activeFilter === 'all' ? rooms : rooms.filter((r) => r.status === activeFilter);

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
            
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{property?.name ?? 'Kamar'}</Text>
        <Text style={styles.headerSubtitle}>{rooms.length} kamar · {t('room.list.title')}</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <FilterTab
              label={item.label}
              isActive={activeFilter === item.key}
              onPress={() => setActiveFilter(item.key)}
            />
          )}
        />
      </View>

      {/* Room List */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadRooms(true); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="bed-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Tidak Ada Kamar</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all'
                ? 'Tambahkan kamar pertama untuk properti ini'
                : `Tidak ada kamar dengan status "${filters.find(f => f.key === activeFilter)?.label}"`}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onEdit={() =>
              navigation.navigate(OWNER_SCREENS.ROOM_FORM, {
                room: item,
                propertyId: property?.id,
              })
            }
            onDelete={() => handleDelete(item)}
            onViewRequest={() =>
              navigation.navigate(OWNER_SCREENS.RENTAL_REQUEST, { roomId: item.id })
            }
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 110 }]}
        onPress={() =>
          navigation.navigate(OWNER_SCREENS.ROOM_FORM, {
            room: null,
            propertyId: property?.id,
          })
        }
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  backBtn: { marginBottom: SPACING[3] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: { paddingHorizontal: SPACING[4], paddingVertical: SPACING[3], gap: SPACING[2] },
  filterTab: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.grey100,
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  filterTabTextActive: { color: COLORS.white },
  listContent: { padding: SPACING[4], gap: SPACING[3], paddingBottom: SPACING[20] },
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
    marginBottom: SPACING[2],
  },
  roomNumber: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomType: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold },
  roomMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  roomPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  roomSize: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  facilitiesRow: {
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
  roomActions: { flexDirection: 'row', gap: SPACING[2] },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnWarning: { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning + '40' },
  actionBtnDanger: { flex: 0, paddingHorizontal: SPACING[4] },
  actionBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[12],
  },
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
  },
  fab: {
    position: 'absolute',
    bottom: 100,
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

export default RoomListScreen;
