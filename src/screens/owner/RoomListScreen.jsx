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
import { getLocalizedField } from '../../utils/useLocalizedField';
import { Ionicons } from '@expo/vector-icons';
import { Menu, Button } from 'react-native-paper';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { getPropertyRooms, deleteRoom } from '../../services/propertyService';
import { OWNER_SCREENS } from '../../constants/screenNames';

const getStatusConfig = (t) => ({
  available: { color: COLORS.success, bg: COLORS.successLight, label: t('ownerRoomList.status.available', 'Tersedia'), icon: 'checkmark-circle' },
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: t('ownerRoomList.status.pending', 'Diproses'), icon: 'time' },
  occupied: { color: COLORS.error, bg: COLORS.errorLight, label: t('ownerRoomList.status.occupied', 'Terisi'), icon: 'close-circle' },
  maintenance: { color: COLORS.grey500, bg: COLORS.grey100, label: t('ownerRoomList.status.maintenance', 'Perawatan'), icon: 'build' },
});

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const RoomCard = ({ room, onEdit, onDelete, onViewRequest, t }) => {
  const STATUS_CONFIG = getStatusConfig(t);
  const statusCfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
  const facilities = room.room_facilities
    ?.filter((rf) => rf.facility_master)
    ?.map((rf) => getLocalizedField(rf.facility_master, 'name'))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <View style={styles.roomCard}>
      {/* Header */}
      <View style={styles.roomCardHeader}>
        <View>
          <Text style={styles.roomNumber}>{t('ownerRoomList.roomNumber', 'Kamar {{number}}', { number: room.room_number })}</Text>
          <Text style={styles.roomType}>{t('ownerRoomList.floorNumber', 'Lantai {{number}}', { number: room.floor_number ?? '-' })}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Price & Size */}
      <View style={styles.roomMeta}>
        <Text style={styles.roomPrice}>{formatCurrency(room.base_price)}{t('common.perMonth')}</Text>
        {!!room.size_sqm && (
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
            <Text style={styles.actionBtnText}>{t('ownerRoomList.edit', 'Edit')}</Text>
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
              <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>{t('ownerRoomList.review', 'Tinjau')}</Text>
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



const RoomListScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const property = route.params?.property;
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState('nameAsc');
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
      t('ownerRoomList.deleteTitle', 'Hapus Kamar'),
      t('ownerRoomList.deleteMessage', 'Yakin ingin menghapus kamar {{number}}?', { number: room.room_number }),
      [
        { text: t('ownerRoomList.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('ownerPropertyList.delete', 'Hapus'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteRoom(room.id);
            if (error) {
              Alert.alert(t('ownerRoomList.failed', 'Gagal'), error.message);
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
    { key: 'pending', label: t('ownerRoomList.status.pending', 'Diproses') },
    { key: 'maintenance', label: t('ownerRoomList.status.maintenance', 'Perawatan') },
  ];

  let result = activeFilter === 'all' ? rooms : rooms.filter((r) => r.status === activeFilter);
  result = result.sort((a, b) => {
    if (sortBy.startsWith('name')) {
      const nameA = a.room_number?.toLowerCase() || '';
      const nameB = b.room_number?.toLowerCase() || '';
      return sortBy === 'nameAsc' ? nameA.localeCompare(nameB, undefined, { numeric: true }) : nameB.localeCompare(nameA, undefined, { numeric: true });
    } else {
      const priceA = a.base_price || 0;
      const priceB = b.base_price || 0;
      return sortBy === 'priceAsc' ? priceA - priceB : priceB - priceA;
    }
  });
  const filteredRooms = result;

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primaryLight} style={{ marginRight: 12 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{property?.name ?? t('ownerRoomList.room', 'Kamar')}</Text>
        </View>
        <Text style={[styles.headerSubtitle, { marginLeft: 36 }]}>{t('ownerRoomList.headerSubtitle', '{{count}} kamar', { count: rooms.length })} · {t('room.list.title')}</Text>
      </View>

        {/* Menus */}
        <View style={{ flexDirection: 'row', paddingHorizontal: SPACING[4], paddingVertical: SPACING[3], gap: SPACING[2], backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, zIndex: 10 }}>
          <Menu
            visible={filterVisible}
            onDismiss={() => setFilterVisible(false)}
            anchor={
              <TouchableOpacity 
                onPress={() => setFilterVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.primarySurface,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: COLORS.primaryLight + '50',
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="filter" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>
                  {t('room.list.filterBtn', 'Filter')}: {filters.find(f => f.key === activeFilter)?.label}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.primary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            }
          >
            {filters.map(f => (
              <Menu.Item key={f.key} onPress={() => { setActiveFilter(f.key); setFilterVisible(false); }} title={f.label} />
            ))}
          </Menu>
  
          <Menu
            visible={sortVisible}
            onDismiss={() => setSortVisible(false)}
            anchor={
              <TouchableOpacity 
                onPress={() => setSortVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.primarySurface,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: COLORS.primaryLight + '50',
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-vertical" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>
                  {sortBy === 'nameAsc' ? t('common.sort.asc', 'A-Z') :
                   sortBy === 'nameDesc' ? t('common.sort.desc', 'Z-A') :
                   sortBy === 'priceAsc' ? t('common.sort.priceAsc', 'Termurah') :
                   sortBy === 'priceDesc' ? t('common.sort.priceDesc', 'Termahal') : 
                   t('common.sort.title', 'Urutkan')}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.primary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={() => { setSortBy('nameAsc'); setSortVisible(false); }} title={t('common.sort.asc', 'A-Z')} />
            <Menu.Item onPress={() => { setSortBy('nameDesc'); setSortVisible(false); }} title={t('common.sort.desc', 'Z-A')} />
            <Menu.Item onPress={() => { setSortBy('priceAsc'); setSortVisible(false); }} title={t('common.sort.priceAsc', 'Termurah')} />
            <Menu.Item onPress={() => { setSortBy('priceDesc'); setSortVisible(false); }} title={t('common.sort.priceDesc', 'Termahal')} />
          </Menu>
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
            <Text style={styles.emptyTitle}>{t('ownerRoomList.emptyTitle', 'Tidak Ada Kamar')}</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all'
                ? t('ownerRoomList.emptyAll', 'Tambahkan kamar pertama untuk properti ini')
                : t('ownerRoomList.emptyFilter', 'Tidak ada kamar dengan status "{{status}}"', { status: filters.find(f => f.key === activeFilter)?.label })}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            t={t}
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
        style={[styles.fab, { bottom: (insets?.bottom || 0) + 32 }]}
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
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: {},
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
