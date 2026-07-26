/**
 * screens/tenant/MyRentScreen.jsx
 * Halaman kontrak & hunian aktif tenant
 * Menampilkan info kamar, tagihan terbaru, dan pengajuan sewa
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
  Linking,
  Alert,
  Modal,
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
import { getTenantActiveContract } from '../../services/invoiceService';
import { getTenantInvoices } from '../../services/invoiceService';
import { getTenantRentalRequests } from '../../services/searchService';
import { subscribeToUserInvoicesRealtime } from '../../services/xenditService';
import { getFacilityMaster, requestOptionalFacility } from '../../services/propertyService';
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

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: idLocale });
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

const getInvoiceStatusConfig = (t) => ({
  unpaid: { color: COLORS.warning, label: t('myRent.status.unpaid', 'Belum Bayar'), icon: 'time' },
  paid: { color: COLORS.success, label: t('myRent.status.paid', 'Lunas'), icon: 'checkmark-circle' },
  overdue: { color: COLORS.error, label: t('myRent.status.overdue', 'Terlambat'), icon: 'close-circle' },
  partial: { color: COLORS.info, label: t('myRent.status.partial', 'Sebagian'), icon: 'pie-chart' },
});

const getRequestStatusConfig = (t) => ({
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: t('myRent.status.pending', 'Menunggu Konfirmasi'), icon: 'time' },
  approved: { color: COLORS.success, bg: COLORS.successLight, label: t('myRent.status.approved', 'Disetujui'), icon: 'checkmark-circle' },
  rejected: { color: COLORS.error, bg: COLORS.errorLight, label: t('myRent.status.rejected', 'Ditolak'), icon: 'close-circle' },
  expired: { color: COLORS.grey500, bg: COLORS.grey100, label: t('myRent.status.expired', 'Kedaluwarsa'), icon: 'hourglass-outline' },
  cancelled: { color: COLORS.grey500, bg: COLORS.grey100, label: t('myRent.status.cancelled', 'Dibatalkan'), icon: 'ban' },
});

const MyRentScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();

  const [contracts, setContracts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State for rendering error on screen
  const [contractFetchError, setContractFetchError] = useState(null);

  // States for Requesting Facility
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [masterFacilities, setMasterFacilities] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const [contractResult, invoicesResult, requestsResult] = await Promise.all([
      getTenantActiveContract(currentUser.id),
      getTenantInvoices(currentUser.id, 'all'),
      getTenantRentalRequests(currentUser.id),
    ]);

    if (contractResult.error) {
      console.warn('ERROR FETCHING CONTRACT:', contractResult.error);
      setContractFetchError(contractResult.error);
    } else {
      setContractFetchError(null);
      setContracts(contractResult.data || []);
    }

    if (!invoicesResult.error && invoicesResult.data) {
      setRecentInvoices(invoicesResult.data);
    }
    if (!requestsResult.error && requestsResult.data) {
      setRentalRequests(requestsResult.data.filter((r) => ['pending', 'approved'].includes(r.status)));
    }

    // Load master facilities if modal is to be opened or pre-fetch
    const facilityRes = await getFacilityMaster();
    if (!facilityRes.error && facilityRes.data) {
      setMasterFacilities(facilityRes.data.filter((f) => f.category !== 'room')); // Tampilkan umum & opsional
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

  // Belum punya hunian aktif
  if (contracts.length === 0 && rentalRequests.length === 0) {
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
              {contracts.length > 0 ? t('myRent.activeContract', 'Kontrak aktif') : t('myRent.yourRequest', 'Pengajuan sewa Anda')}
            </Text>
          </View>
        </View>
      </View>

      {/* Error State if contract failed */}
      {contractFetchError && (
        <View style={{ padding: 20, backgroundColor: '#ffebee', margin: 16, borderRadius: 8 }}>
          <Text style={{ color: '#c62828', fontWeight: 'bold' }}>ERROR FETCHING CONTRACT:</Text>
          <Text style={{ color: '#c62828' }}>{JSON.stringify(contractFetchError, null, 2)}</Text>
        </View>
      )}


      {/* Pengajuan Pending (jika belum punya kontrak) */}
      {(contracts.length === 0) && rentalRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myRent.rentRequest', 'Pengajuan Sewa')}</Text>
          {rentalRequests.map((req) => {
            const statusConfig = getRequestStatusConfig(t);
            const status = statusConfig[req.status] ?? statusConfig.pending;
            const room = req.rooms;
            const property = room?.properties;
            return (
              <View key={req.id} style={[styles.requestCard, { borderLeftColor: status.color }]}>
                <View style={[styles.requestStatusBadge, { backgroundColor: status.bg }]}>
                  <Ionicons name={status.icon} size={14} color={status.color} />
                  <Text style={[styles.requestStatusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
                <Text style={styles.requestProperty}>{property?.name}</Text>
                <Text style={styles.requestRoom}>{t('roomDetail.roomNumber', 'Kamar {{number}}', { number: room?.room_number })}</Text>
                <Text style={styles.requestDate}>
                  {t('myRent.submittedOn', 'Diajukan: {{date}}', { date: formatDate(req.created_at) })}
                </Text>
                {req.status === 'pending' && req.expires_at ? (
                  <View style={styles.expiryWarning}>
                    <Ionicons name="time" size={14} color={COLORS.error} style={{ marginRight: 6 }} />
                    <Text style={styles.expiryText}>
                      {t('myRent.expiryWarning', 'Batal otomatis pada {{time}}', { time: formatDateTime(req.expires_at) })}
                    </Text>
                  </View>
                ) : null}
                {req.status === 'rejected' && req.owner_rejection_reason ? (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionText}>
                      {t('myRent.reason', 'Alasan: {{reason}}', { reason: req.owner_rejection_reason })}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Kontrak Aktif */}
      {contracts.map((contract, index) => {
        const room = contract?.rooms;
        const property = room?.properties;
        const contractInvoices = recentInvoices.filter(inv => inv.contract_id === contract.id);
        
        return (
          <View key={contract.id} style={{ marginBottom: 32 }}>
            {/* Room Card */}
            <View style={styles.section}>
              {index === 0 && <Text style={styles.sectionTitle}>{t('myRent.myRoom', 'Kamar Saya')}</Text>}
              
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate(TENANT_SCREENS.CONTRACT_DETAIL, {
                    contract,
                    invoices: contractInvoices,
                  })
                }
              >
                <View style={styles.roomCard}>
                  {room?.photo_urls?.[0] || property?.cover_photo_url ? (
                    <Image
                      source={{ uri: room?.photo_urls?.[0] ?? property?.cover_photo_url }}
                      style={styles.roomPhoto}
                    />
                  ) : (
                    <View style={styles.roomPhotoPlaceholder}>
                      <Ionicons name="bed-outline" size={48} color={COLORS.textTertiary} />
                    </View>
                  )}
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomPropertyName}>{property?.name}</Text>
                    <Text style={styles.roomNumber}>{t('roomDetail.roomNumber', 'Kamar {{number}}', { number: room?.room_number })}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="location" size={12} color={COLORS.textTertiary} style={{ marginRight: 4 }} />
                      <Text style={[styles.roomAddress, { marginTop: 0 }]} numberOfLines={1}>
                        {property?.address_line}, {property?.city}
                      </Text>
                    </View>
                    <Text style={styles.roomPrice}>
                      {formatCurrency(contract.monthly_rate)}{t('roomDetail.perMonth', '/bulan')}
                    </Text>
                  </View>
                  
                  {/* Chevron to indicate navigation */}
                  <View style={{ position: 'absolute', right: 16, top: '50%', marginTop: -12 }}>
                    <Ionicons name="chevron-forward" size={24} color={COLORS.textTertiary} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
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
    marginHorizontal: SPACING[4],
    marginTop: SPACING[5],
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
    marginBottom: SPACING[3],
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
  // Request Card
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderLeftWidth: 4,
    ...SHADOW.sm,
  },
  requestStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[3],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING[2],
  },
  requestStatusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  requestProperty: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  requestRoom: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  requestDate: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 4 },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    padding: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING[2],
  },
  expiryText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
  },
  rejectionBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING[2],
    marginTop: SPACING[2],
  },
  rejectionText: { fontSize: FONT_SIZE.xs, color: COLORS.error },
  // Room Card
  roomCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  roomPhoto: { width: '100%', height: 160, resizeMode: 'cover' },
  roomPhotoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: { padding: SPACING[4] },
  roomPropertyName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomNumber: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  roomAddress: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, marginTop: 4 },
  roomPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginTop: SPACING[2],
  },
  contractDates: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  dateValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  dateSeparator: { width: 1, backgroundColor: COLORS.border },
  facilitiesContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  facilitiesLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING[2],
  },
  facilitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[1] },
  facilityTag: {
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  facilityTagText: { fontSize: FONT_SIZE.xs, color: COLORS.primary },
  // Owner Card
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  ownerAvatarText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  ownerInfo: { flex: 1 },
  ownerName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  ownerPhone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
  },
  callBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  // Invoice
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[2],
    ...SHADOW.sm,
  },
  invoiceLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  invoicePeriod: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  invoiceStatus: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  invoiceAmount: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  emptyInvoice: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    alignItems: 'center',
    ...SHADOW.sm,
  },
  emptyInvoiceText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  // Optional Facilities
  optionalFacilitiesBox: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    marginTop: SPACING[3],
  },
  optionalFacilitiesTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  optionalFacilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionalFacilityName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  optionalFacilityPrice: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  requestBadgeInline: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  requestBadgeTextInline: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.bold,
  },
  addFacilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING[3],
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
  },
  addFacilityBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  modalCloseBtn: { padding: 4 },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[4],
  },
  facilityList: {
    paddingBottom: SPACING[5],
  },
  facilityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  facilityOptionDisabled: {
    opacity: 0.6,
  },
  facilityOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityOptionName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  facilityOptionStatus: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.warning,
    marginTop: 2,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default MyRentScreen;
