/**
 * screens/owner/ContractScreen.jsx
 * Daftar dan detail kontrak owner
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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { id as idLocale } from 'date-fns/locale';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getOwnerContracts, endContract } from '../../services/invoiceService';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const STATUS_CONFIG = {
  active: { color: COLORS.success, bg: COLORS.successLight, label: 'Aktif', icon: 'checkmark-circle' },
  completed: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Selesai', icon: 'flag' },
  terminated: { color: COLORS.error, bg: COLORS.errorLight, label: 'Dihentikan', icon: 'stop-circle' },
  early_exit: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Keluar Lebih Awal', icon: 'flash' },
};

const ContractCard = ({ contract, onTerminate }) => {
  const status = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.completed;
  const tenant = contract.users;
  const room = contract.rooms;
  const property = room?.properties;

  return (
    <View style={[styles.card, contract.status === 'active' && styles.cardActive]}>
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Ionicons name={status.icon} size={12} color={status.color} style={{ marginRight: 4 }} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
      <View style={styles.infoRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{tenant?.full_name?.[0]?.toUpperCase() ?? 'T'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.tenantName}>{tenant?.full_name}</Text>
          <Text style={styles.roomInfo}>{property?.name} · Kamar {room?.room_number}</Text>
        </View>
      </View>
      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Mulai</Text>
          <Text style={styles.dateValue}>{formatDate(contract.start_date)}</Text>
        </View>
        <View style={styles.dateSep} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Selesai</Text>
          <Text style={styles.dateValue}>{formatDate(contract.end_date)}</Text>
        </View>
        <View style={styles.dateSep} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Sewa/Bulan</Text>
          <Text style={styles.dateValue}>{formatCurrency(contract.monthly_rate)}</Text>
        </View>
      </View>
      {contract.status === 'active' && (
        <TouchableOpacity style={styles.terminateBtn} onPress={() => onTerminate(contract)} activeOpacity={0.7}>
          <Text style={styles.terminateBtnText}>Hentikan Kontrak</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const ContractScreen = ({ navigation }) => {
  const { currentUser } = useAuthStore();
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active');

  const loadContracts = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const { data, error } = await getOwnerContracts(currentUser.id);
    if (!error && data) setContracts(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(useCallback(() => { loadContracts(); }, [loadContracts]));

  const handleTerminate = (contract) => {
    Alert.alert(
      'Hentikan Kontrak',
      `Yakin ingin menghentikan kontrak untuk ${contract.users?.full_name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hentikan',
          style: 'destructive',
          onPress: async () => {
            const { error } = await endContract(contract.id, 'terminated', 'Dihentikan oleh pemilik');
            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              setContracts((prev) => prev.map((c) => c.id === contract.id ? { ...c, status: 'terminated' } : c));
            }
          },
        },
      ]
    );
  };

  const filters = [
    { key: 'active', label: 'Aktif' },
    { key: 'completed', label: 'Selesai' },
    { key: 'terminated', label: 'Dihentikan' },
    { key: 'all', label: 'Semua' },
  ];

  const filteredContracts = activeFilter === 'all' ? contracts : contracts.filter((c) => c.status === activeFilter);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kontrak Sewa</Text>
        <Text style={styles.headerSubtitle}>{contracts.length} kontrak total</Text>
      </View>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredContracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadContracts(true); }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Tidak Ada Kontrak</Text>
          </View>
        )}
        renderItem={({ item }) => <ContractCard contract={item} onTerminate={handleTerminate} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: SPACING[14], paddingBottom: SPACING[5], paddingHorizontal: SPACING[5] },
  backBtn: { marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
  filterRow: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], gap: SPACING[2], borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterTab: { paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.grey100 },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
  list: { padding: SPACING[4], gap: SPACING[3], paddingBottom: 100 },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING[4], ...SHADOW.sm },
  cardActive: { borderLeftWidth: 3, borderLeftColor: COLORS.success },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: SPACING[3], paddingVertical: 4, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING[3] },
  
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3], gap: SPACING[3] },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primarySurface, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  info: { flex: 1 },
  tenantName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  roomInfo: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  datesRow: { flexDirection: 'row', backgroundColor: COLORS.grey50, borderRadius: BORDER_RADIUS.md, padding: SPACING[3], marginBottom: SPACING[3] },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginBottom: 2 },
  dateValue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, textAlign: 'center' },
  dateSep: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING[2] },
  terminateBtn: { backgroundColor: COLORS.errorLight, borderRadius: BORDER_RADIUS.md, padding: SPACING[2], alignItems: 'center' },
  terminateBtnText: { color: COLORS.error, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[12] },
  emptyIcon: { marginBottom: SPACING[3] },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
});

export default ContractScreen;
