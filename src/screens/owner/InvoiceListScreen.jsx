/**
 * screens/owner/InvoiceListScreen.jsx
 * Daftar tagihan semua tenant di properti owner
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DrawerButton from '../../components/navigation/DrawerButton';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getOwnerInvoices } from '../../services/invoiceService';

const STATUS_CONFIG = {
  unpaid: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Belum Dibayar' },
  paid: { color: COLORS.success, bg: COLORS.successLight, label: 'Lunas' },
  overdue: { color: COLORS.error, bg: COLORS.errorLight, label: 'Terlambat' },
  partial: { color: COLORS.info, bg: COLORS.infoLight, label: 'Sebagian' },
  cancelled: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Dibatalkan' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const formatPeriod = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const InvoiceCard = ({ invoice }) => {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.unpaid;
  const tenant = invoice.users;
  const room = invoice.rooms;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <Text style={styles.invoicePeriod}>{formatPeriod(invoice.billing_period)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Tenant & Room */}
      <View style={styles.infoSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>{tenant?.full_name ?? '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>{room?.properties?.name} · Kamar {room?.room_number}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>Jatuh tempo: {formatDate(invoice.due_date)}</Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Total Tagihan</Text>
        <Text style={styles.amountValue}>{formatCurrency(invoice.total_amount)}</Text>
      </View>

      {invoice.status === 'partial' && (
        <View style={styles.paidRow}>
          <Text style={styles.paidLabel}>Sudah Dibayar</Text>
          <Text style={styles.paidValue}>{formatCurrency(invoice.paid_amount)}</Text>
        </View>
      )}
    </View>
  );
};

const FilterTab = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const InvoiceListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadInvoices = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const { data, error } = await getOwnerInvoices(currentUser.id, 'all');
    if (!error && data) setInvoices(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'unpaid', label: 'Belum Bayar' },
    { key: 'overdue', label: 'Terlambat' },
    { key: 'paid', label: 'Lunas' },
  ];

  const filteredInvoices =
    activeFilter === 'all' ? invoices : invoices.filter((inv) => inv.status === activeFilter);

  // Summary
  const totalUnpaid = invoices
    .filter((inv) => ['unpaid', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount ?? 0), 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DrawerButton />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar Tagihan</Text>
        {totalUnpaid > 0 && (
          <View style={styles.summaryBanner}>
            <Text style={styles.summaryLabel}>Total Belum Terbayar</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalUnpaid)}</Text>
          </View>
        )}
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

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadInvoices(true); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Tidak Ada Tagihan</Text>
            <Text style={styles.emptySubtitle}>
              Tagihan akan dibuat otomatis setiap bulan untuk penghuni aktif
            </Text>
          </View>
        )}
        renderItem={({ item }) => <InvoiceCard invoice={item} />}
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
    marginBottom: SPACING[3],
    marginLeft: 48, // Added for DrawerButton
  },
  summaryBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
  },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.primaryLight },
  summaryAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginTop: 2,
  },
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
  listContent: { padding: SPACING[4], gap: SPACING[3], paddingBottom: SPACING[10] },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  invoiceNumber: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  invoicePeriod: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: SPACING[3],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold },
  infoSection: {
    gap: SPACING[1],
    marginBottom: SPACING[3],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoRow: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  amountValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING[1],
  },
  paidLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  paidValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.success,
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
    paddingHorizontal: SPACING[6],
  },
});

export default InvoiceListScreen;
