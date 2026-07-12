/**
 * screens/owner/DashboardScreen.jsx
 * Dashboard ringkasan Owner: statistik properti, pendapatan, pengajuan terbaru
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getOwnerDashboardStats } from '../../services/propertyService';
import { OWNER_SCREENS } from '../../navigation/OwnerNavigator';

const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const StatCard = ({ label, value, icon, color, onPress, isGradient }) => {
  const CardContent = (
    <>
      <View style={[styles.statIconBg, { backgroundColor: isGradient ? 'rgba(255,255,255,0.2)' : color + '20' }]}>
        <Ionicons name={icon} size={22} color={isGradient ? COLORS.white : color} />
      </View>
      <Text style={[styles.statValue, { color: isGradient ? COLORS.white : color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: isGradient ? 'rgba(255,255,255,0.8)' : COLORS.textSecondary }]}>{label}</Text>
    </>
  );

  if (isGradient) {
    return (
      <TouchableOpacity style={[styles.statCardContainer, onPress && styles.statCardPressable]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
        <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.statCard}>
          {CardContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.statCardContainer, styles.statCard, onPress && styles.statCardPressable]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      {CardContent}
    </TouchableOpacity>
  );
};

const RequestCard = ({ request, onPress }) => {
  const tenantName = request.users?.full_name ?? 'Tenant';
  const roomName = request.rooms?.room_number ?? '—';
  const propertyName = request.rooms?.properties?.name ?? '—';

  return (
    <TouchableOpacity style={styles.requestCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.requestAvatar}>
        <Text style={styles.requestAvatarText}>{tenantName[0]?.toUpperCase() ?? 'T'}</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{tenantName}</Text>
        <Text style={styles.requestDetail}>
          Kamar {roomName} · {propertyName}
        </Text>
      </View>
      <View style={styles.requestBadge}>
        <Text style={styles.requestBadgeText}>Pending</Text>
      </View>
    </TouchableOpacity>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const { data, error } = await getOwnerDashboardStats(currentUser.id);
    if (!error && data) {
      setStats(data);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats(true);
  };

  const occupancyRate = stats
    ? stats.totalRooms > 0
      ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
      : 0
    : 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.ownerName}>{currentUser?.full_name ?? 'Owner'} 👋</Text>
          </View>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {currentUser?.full_name?.[0]?.toUpperCase() ?? 'O'}
            </Text>
          </View>
        </View>

        {/* Occupancy Banner */}
        <View style={styles.occupancyBanner}>
          <View>
            <Text style={styles.occupancyLabel}>Tingkat Hunian</Text>
            <Text style={styles.occupancyValue}>{occupancyRate}%</Text>
          </View>
          <View style={styles.occupancyBarContainer}>
            <View style={[styles.occupancyBar, { width: `${occupancyRate}%` }]} />
          </View>
          <Text style={styles.occupancyDetail}>
            {stats?.occupiedRooms ?? 0}/{stats?.totalRooms ?? 0} kamar terisi
          </Text>
        </View>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Properti"
          value={stats?.totalProperties ?? 0}
          icon="business-outline"
          color={COLORS.primary}
          onPress={() => navigation.navigate(OWNER_SCREENS.PROPERTY_STACK)}
        />
        <StatCard
          label="Kamar Tersedia"
          value={stats?.availableRooms ?? 0}
          icon="bed-outline"
          color={COLORS.success}
          onPress={() => navigation.navigate(OWNER_SCREENS.PROPERTY_STACK)}
        />
        <StatCard
          label="Tagihan Tertunda"
          value={stats?.unpaidInvoicesCount ?? 0}
          icon="document-text-outline"
          color={COLORS.warning}
          onPress={() => navigation.navigate(OWNER_SCREENS.INVOICE_LIST)}
        />
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatCurrency(stats?.monthlyRevenue ?? 0)}
          icon="wallet-outline"
          color={COLORS.primary}
          isGradient={true}
        />
      </View>

      {/* Pengajuan Sewa Terbaru */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pengajuan Masuk</Text>
          {(stats?.pendingRequests?.length ?? 0) > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate(OWNER_SCREENS.RENTAL_REQUEST)}
            >
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {(stats?.pendingRequests?.length ?? 0) === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="mail-open-outline" size={40} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Tidak Ada Pengajuan</Text>
            <Text style={styles.emptySubtitle}>Pengajuan sewa masuk akan muncul di sini</Text>
          </View>
        ) : (
          stats.pendingRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onPress={() => navigation.navigate(OWNER_SCREENS.RENTAL_REQUEST)}
            />
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() =>
              navigation.navigate(OWNER_SCREENS.PROPERTY_STACK, {
                screen: OWNER_SCREENS.PROPERTY_FORM,
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} style={styles.quickActionIcon} />
            <Text style={styles.quickActionLabel}>Tambah Properti</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate(OWNER_SCREENS.TENANT_LIST)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={28} color={COLORS.primary} style={styles.quickActionIcon} />
            <Text style={styles.quickActionLabel}>Daftar Penghuni</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate(OWNER_SCREENS.REPORT)}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart-outline" size={28} color={COLORS.primary} style={styles.quickActionIcon} />
            <Text style={styles.quickActionLabel}>Laporan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate(OWNER_SCREENS.INVOICE_LIST)}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={28} color={COLORS.primary} style={styles.quickActionIcon} />
            <Text style={styles.quickActionLabel}>Tagihan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING[10],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[10],
    paddingBottom: SPACING[6],
    paddingHorizontal: SPACING[5],
    borderBottomLeftRadius: BORDER_RADIUS['3xl'],
    borderBottomRightRadius: BORDER_RADIUS['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  headerLogo: {
    width: 60,
    height: 60,
    tintColor: COLORS.white,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[5],
  },
  greeting: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primaryLight,
  },
  ownerName: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginTop: 2,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  occupancyBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
  },
  occupancyLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primaryLight,
    marginBottom: 2,
  },
  occupancyValue: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[2],
  },
  occupancyBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: SPACING[2],
    overflow: 'hidden',
  },
  occupancyBar: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
    minWidth: 4,
  },
  occupancyDetail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primaryLight,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[5],
    gap: SPACING[3],
  },
  statCardContainer: {
    width: '47%',
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOW.sm,
  },
  statCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
  },
  statCardPressable: {
    ...SHADOW.md,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING[5],
    marginTop: SPACING[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOW.sm,
  },
  emptyIcon: {
    marginBottom: SPACING[3],
  },
  emptyTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[1],
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[2],
    ...SHADOW.sm,
  },
  requestAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  requestAvatarText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  requestDetail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  requestBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  requestBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.warning,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING[2],
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[3],
    alignItems: 'center',
    ...SHADOW.sm,
  },
  quickActionIcon: {
    marginBottom: SPACING[2],
  },
  quickActionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default DashboardScreen;
