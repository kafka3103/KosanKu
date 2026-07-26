/**
 * screens/tenant/MyRentScreen.jsx
 * Halaman kontrak & hunian aktif tenant
 * Menampilkan info kamar, tagihan terbaru, dan pengajuan sewa dalam satu list
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { id as idLocale } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import DrawerButton from '../../components/navigation/DrawerButton';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getTenantRentalRequests } from '../../services/searchService';
import { subscribeToUserInvoicesRealtime } from '../../services/xenditService';
import { TENANT_SCREENS } from '../../constants/screenNames';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const getStatusConfig = (status, t) => {
  const config = {
    pending: { color: COLORS.warning, bg: COLORS.warningLight, label: t('myRent.status.pending', 'Menunggu Konfirmasi'), icon: 'time' },
    approved: { color: COLORS.success, bg: COLORS.successLight, label: t('myRent.status.approved', 'Disetujui'), icon: 'checkmark-circle' },
    rejected: { color: COLORS.error, bg: COLORS.errorLight, label: t('myRent.status.rejected', 'Ditolak'), icon: 'close-circle' },
    expired: { color: COLORS.grey500, bg: COLORS.grey100, label: t('myRent.status.expired', 'Kedaluwarsa'), icon: 'hourglass-outline' },
    cancelled: { color: COLORS.grey500, bg: COLORS.grey100, label: t('myRent.status.cancelled', 'Dibatalkan'), icon: 'ban' },
    active: { color: COLORS.success, bg: COLORS.successLight, label: t('myRent.status.active', 'Aktif'), icon: 'home' },
    ended: { color: COLORS.grey500, bg: COLORS.grey100, label: t('myRent.status.ended', 'Selesai'), icon: 'flag' },
  };
  return config[status] || config.pending;
};

const MyRentScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();

  const [rentalRequests, setRentalRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const requestsResult = await getTenantRentalRequests(currentUser.id);

    if (!requestsResult.error && requestsResult.data) {
      // Sort logic: active/approved first, pending next, then others
      const sortedData = requestsResult.data.sort((a, b) => {
        const aContract = a.contracts && a.contracts.length > 0 ? a.contracts[0] : null;
        const bContract = b.contracts && b.contracts.length > 0 ? b.contracts[0] : null;
        
        const aStatus = aContract ? aContract.status : a.status;
        const bStatus = bContract ? bContract.status : b.status;
        
        const priority = { active: 1, approved: 2, pending: 3, ended: 4, rejected: 5, expired: 6, cancelled: 7 };
        const aPrio = priority[aStatus] || 99;
        const bPrio = priority[bStatus] || 99;
        
        if (aPrio !== bPrio) return aPrio - bPrio;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setRentalRequests(sortedData);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!currentUser?.id) return;
    const sub = subscribeToUserInvoicesRealtime(currentUser.id, 'tenant', () => {
      loadData(true);
    });
    return () => {
      if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
    };
  }, [currentUser?.id, loadData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Belum punya hunian
  if (rentalRequests.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.emptyContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadData(true); }}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <DrawerButton />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('myRent.myRent', 'Hunian Saya')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>{t('myRent.noActiveRent', 'Belum Ada Hunian Aktif')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('myRent.noActiveRentSubtitle', 'Cari dan ajukan sewa kosan sekarang')}
          </Text>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => navigation.navigate(TENANT_SCREENS.SEARCH_STACK)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="search" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.searchBtnText}>{t('myRent.search', 'Cari Kosan')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
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
        <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <DrawerButton />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('myRent.myRent', 'Hunian Saya')}</Text>
              <Text style={styles.headerSubtitle}>
                {t('myRent.yourRequest', 'Pengajuan sewa & kontrak Anda')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          {rentalRequests.map((req) => {
            const room = req.rooms;
            const property = room?.properties;
            const contract = req.contracts && req.contracts.length > 0 ? req.contracts[0] : null;
            
            // Status Priority: If contract is active/ended, show that. Else show request status.
            let displayStatus = req.status;
            if (contract && contract.status === 'active') displayStatus = 'active';
            if (contract && contract.status === 'ended') displayStatus = 'ended';

            const status = getStatusConfig(displayStatus, t);

            // Invoice check for urgent payment
            let activeInvoice = null;
            let needsPayment = false;
            if (contract && contract.invoices && contract.invoices.length > 0) {
              activeInvoice = contract.invoices.find(inv => inv.status !== 'paid') || contract.invoices[0];
              needsPayment = activeInvoice.status !== 'paid';
            }

            return (
              <TouchableOpacity
                key={req.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ContractDetailScreen', { request: req })}
                style={[
                  styles.card,
                  needsPayment && styles.cardUrgent
                ]}
              >
                {needsPayment && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>{t('myRent.urgentPayment', 'Segera Bayar')}</Text>
                  </View>
                )}
                
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                </View>

                <View style={styles.cardBody}>
                  {room?.photo_urls?.[0] || property?.cover_photo_url ? (
                    <Image
                      source={{ uri: room?.photo_urls?.[0] ?? property?.cover_photo_url }}
                      style={styles.cardPhoto}
                    />
                  ) : (
                    <View style={styles.cardPhotoPlaceholder}>
                      <Ionicons name="bed-outline" size={32} color={COLORS.textTertiary} />
                    </View>
                  )}
                  
                  <View style={styles.cardInfo}>
                    <Text style={styles.propertyName}>{property?.name}</Text>
                    <Text style={styles.roomNumber}>{t('roomDetail.roomNumber', 'Kamar {{number}}', { number: room?.room_number })}</Text>
                    
                    {contract ? (
                      <View style={styles.datesContainer}>
                        <Text style={styles.dateText}>{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.dateText}>{t('myRent.submittedOn', 'Diajukan: {{date}}', { date: formatDate(req.created_at) })}</Text>
                    )}
                  </View>
                </View>

                {contract && activeInvoice && (
                  <View style={styles.billingSummary}>
                    <Text style={styles.billingLabel}>{t('myRent.remainingAmount', 'Sisa Hutang')}</Text>
                    <Text style={styles.billingValue}>
                      {formatCurrency((activeInvoice.total_amount || 0) - (activeInvoice.paid_amount || 0))}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING[10] },
  emptyContent: { flexGrow: 1 },
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
  section: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[5],
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[8],
  },
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
  searchBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
  },
  searchBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  cardUrgent: {
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  urgentBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    zIndex: 2,
  },
  urgentBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardBody: {
    flexDirection: 'row',
  },
  cardPhoto: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING[3],
  },
  cardPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  propertyName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomNumber: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  datesContainer: {
    marginTop: 4,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
  billingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  billingLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  billingValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },
});

export default MyRentScreen;
