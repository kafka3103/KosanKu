/**
 * screens/tenant/InvoiceDetailScreen.jsx
 * Detail tagihan tenant dengan opsi bayar
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { getInvoiceDetail } from '../../services/invoiceService';
import { TENANT_SCREENS } from '../../navigation/TenantNavigator';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const STATUS_CONFIG = {
  unpaid: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Belum Dibayar', emoji: '⏳' },
  paid: { color: COLORS.success, bg: COLORS.successLight, label: 'Lunas', emoji: '✅' },
  overdue: { color: COLORS.error, bg: COLORS.errorLight, label: 'Terlambat', emoji: '🔴' },
  partial: { color: COLORS.info, bg: COLORS.infoLight, label: 'Sebagian', emoji: '🔵' },
};

const InvoiceDetailScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const invoiceParam = route.params?.invoice;
  const [invoice, setInvoice] = useState(invoiceParam);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (invoiceParam?.id) {
      loadDetail();
    }
  }, [invoiceParam?.id]);

  const loadDetail = async () => {
    setIsLoading(true);
    const { data, error } = await getInvoiceDetail(invoiceParam.id);
    if (!error && data) setInvoice(data);
    setIsLoading(false);
  };

  if (isLoading || !invoice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.unpaid;
  const room = invoice.rooms;
  const items = invoice.invoice_items ?? [];
  const unpaidAmount = parseFloat(invoice.total_amount ?? 0) - parseFloat(invoice.paid_amount ?? 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Tagihan</Text>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
          <Text style={styles.statusEmoji}>{status.emoji}</Text>
          <View>
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            <Text style={styles.statusSubtitle}>
              {invoice.status === 'paid'
                ? `Dibayar: ${formatDate(invoice.paid_at)}`
                : `Jatuh tempo: ${formatDate(invoice.due_date)}`}
            </Text>
          </View>
        </View>

        {/* Room Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏠 Informasi Kamar</Text>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Properti: </Text>
            <Text style={styles.infoValue}>{room?.properties?.name}</Text>
          </Text>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kamar: </Text>
            <Text style={styles.infoValue}>{room?.room_number}</Text>
          </Text>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Periode: </Text>
            <Text style={styles.infoValue}>
              {invoice.billing_period
                ? format(new Date(invoice.billing_period), 'MMMM yyyy', { locale: idLocale })
                : '—'}
            </Text>
          </Text>
        </View>

        {/* Invoice Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Rincian Tagihan</Text>
          {items.length === 0 ? (
            <Text style={styles.noItemsText}>Tidak ada rincian item</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.description}</Text>
                  {item.quantity > 1 && (
                    <Text style={styles.itemQty}>
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(invoice.total_amount)}</Text>
          </View>

          {invoice.status === 'partial' && (
            <>
              <View style={styles.paidRow}>
                <Text style={styles.paidLabel}>Sudah Dibayar</Text>
                <Text style={styles.paidAmount}>{formatCurrency(invoice.paid_amount)}</Text>
              </View>
              <View style={styles.remainRow}>
                <Text style={styles.remainLabel}>Sisa</Text>
                <Text style={styles.remainAmount}>{formatCurrency(unpaidAmount)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Payment CTA */}
      {['unpaid', 'partial', 'overdue'].includes(invoice.status) && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>
              {invoice.status === 'partial' ? 'Sisa Tagihan' : 'Total Tagihan'}
            </Text>
            <Text style={styles.bottomAmount}>
              {formatCurrency(invoice.status === 'partial' ? unpaidAmount : invoice.total_amount)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => navigation.navigate(TENANT_SCREENS.PAYMENT, { invoice })}
            activeOpacity={0.8}
          >
            <Text style={styles.payBtnText}>{t('invoice.detail.payButton')}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  backBtn: { marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  invoiceNumber: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    marginTop: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[4],
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[2],
  },
  statusEmoji: { fontSize: 32 },
  statusLabel: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  statusSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[3],
  },
  infoRow: { fontSize: FONT_SIZE.sm, marginBottom: SPACING[1] },
  infoLabel: { color: COLORS.textSecondary },
  infoValue: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  noItemsText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  itemQty: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  itemAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING[4],
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING[3] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  totalAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[2],
  },
  paidLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  paidAmount: {
    fontSize: FONT_SIZE.base,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  remainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[1],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  remainLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  remainAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    paddingBottom: SPACING[8],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.xl,
  },
  bottomLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  bottomAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.md,
    ...SHADOW.md,
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default InvoiceDetailScreen;
