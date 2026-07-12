/**
 * screens/owner/ReportScreen.jsx
 * Laporan pendapatan owner (grafik sederhana berbasis data invoices)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getOwnerRevenueReport } from '../../services/invoiceService';
import { getOwnerDashboardStats } from '../../services/propertyService';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const ReportScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [revenueData, setRevenueData] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const [revenueResult, statsResult] = await Promise.all([
      getOwnerRevenueReport(currentUser.id),
      getOwnerDashboardStats(currentUser.id),
    ]);

    if (!revenueResult.error && revenueResult.data) setRevenueData(revenueResult.data);
    if (!statsResult.error && statsResult.data) setStats(statsResult.data);

    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const totalRevenue = revenueData.reduce((sum, m) => sum + m.paid, 0);
  const totalOutstanding = revenueData.reduce((sum, m) => sum + m.unpaid, 0);
  const maxValue = Math.max(...revenueData.map((m) => m.total), 1);

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); loadData(true); }}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('report.title')}</Text>
        <Text style={styles.headerSubtitle}>12 bulan terakhir</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Diterima</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>
            {formatCurrency(totalRevenue)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Belum Terbayar</Text>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
            {formatCurrency(totalOutstanding)}
          </Text>
        </View>
      </View>

      {/* Property Stats */}
      {stats && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[4] }}>
            <Ionicons name="stats-chart" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Statistik Properti</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalProperties}</Text>
              <Text style={styles.statLabel}>Properti</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRooms}</Text>
              <Text style={styles.statLabel}>Total Kamar</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {stats.availableRooms}
              </Text>
              <Text style={styles.statLabel}>Tersedia</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.error }]}>
                {stats.occupiedRooms}
              </Text>
              <Text style={styles.statLabel}>Terisi</Text>
            </View>
          </View>
          <View style={styles.occupancyRow}>
            <Text style={styles.occupancyLabel}>Tingkat Hunian</Text>
            <Text style={styles.occupancyValue}>
              {stats.totalRooms > 0
                ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
                : 0}%
            </Text>
          </View>
          <View style={styles.occupancyBarBg}>
            <View
              style={[
                styles.occupancyBarFill,
                {
                  width: `${stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Revenue Chart */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[4] }}>
          <Ionicons name="cash-outline" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Pendapatan per Bulan</Text>
        </View>
        {revenueData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>Belum ada data pendapatan</Text>
          </View>
        ) : (
          <View style={styles.chart}>
            {revenueData.map((month, i) => {
              const paidHeight = maxValue > 0 ? (month.paid / maxValue) * 120 : 0;
              const unpaidHeight = maxValue > 0 ? (month.unpaid / maxValue) * 120 : 0;
              const monthLabel = month.month
                ? MONTH_LABELS[parseInt(month.month.slice(5, 7), 10) - 1] ?? month.month.slice(5, 7)
                : '?';

              return (
                <View key={i} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    {month.unpaid > 0 && (
                      <View
                        style={[
                          styles.barSegment,
                          { height: unpaidHeight, backgroundColor: COLORS.warningLight },
                        ]}
                      />
                    )}
                    {month.paid > 0 && (
                      <View
                        style={[
                          styles.barSegment,
                          { height: paidHeight, backgroundColor: COLORS.primary },
                        ]}
                      />
                    )}
                    {month.paid === 0 && month.unpaid === 0 && (
                      <View style={[styles.barSegment, { height: 4, backgroundColor: COLORS.grey200 }]} />
                    )}
                  </View>
                  <Text style={styles.barLabel}>{monthLabel}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Diterima</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warningLight }]} />
            <Text style={styles.legendText}>Belum Bayar</Text>
          </View>
        </View>
      </View>

      {/* Monthly Breakdown */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[4] }}>
          <Ionicons name="list" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Rincian Bulanan</Text>
        </View>
        {revenueData.length === 0 ? (
          <Text style={styles.emptyChartText}>Belum ada data</Text>
        ) : (
          [...revenueData].reverse().map((month, i) => (
            <View key={i} style={styles.monthRow}>
              <Text style={styles.monthName}>
                {(() => {
                  const [year, mon] = (month.month ?? '').split('-');
                  return `${MONTH_LABELS[parseInt(mon, 10) - 1] ?? '?'} ${year}`;
                })()}
              </Text>
              <View style={styles.monthAmounts}>
                <Text style={[styles.monthAmount, { color: COLORS.success }]}>
                  {formatCurrency(month.paid)}
                </Text>
                {month.unpaid > 0 && (
                  <Text style={[styles.monthAmount, { color: COLORS.warning }]}>
                    -{formatCurrency(month.unpaid)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: SPACING[10] }} />
    </ScrollView>
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
  backBtn: { marginBottom: SPACING[2], flexDirection: 'row', alignItems: 'center' },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    gap: SPACING[3],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
    ...SHADOW.sm,
  },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING[1] },
  summaryValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[4],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  occupancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  occupancyLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  occupancyValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  occupancyBarBg: {
    height: 8,
    backgroundColor: COLORS.grey100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    minWidth: 4,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING[1],
    height: 150,
    marginBottom: SPACING[3],
  },
  chartBar: { flex: 1, alignItems: 'center' },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    gap: 2,
  },
  barSegment: {
    width: '80%',
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  emptyChart: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: SPACING[5],
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  monthName: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  monthAmounts: { alignItems: 'flex-end', gap: 2 },
  monthAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});

export default ReportScreen;
