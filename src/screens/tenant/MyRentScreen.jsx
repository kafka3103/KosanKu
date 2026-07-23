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
import { getLocalizedField } from '../../utils/useLocalizedField';
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
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();

  const [contract, setContract] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    if (!contractResult.error) setContract(contractResult.data);
    if (!invoicesResult.error && invoicesResult.data) {
      setRecentInvoices(invoicesResult.data.slice(0, 3));
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

  const handleCallOwner = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() =>
      Alert.alert(t('myRent.callFail', 'Gagal'), t('myRent.callFailMsg', 'Tidak bisa membuka aplikasi telepon'))
    );
  };

  const handleRequestFacility = async (facilityId) => {
    if (!contract?.id) return;
    setIsRequesting(true);
    const { error } = await requestOptionalFacility(contract.id, facilityId);
    setIsRequesting(false);
    
    if (error) {
      Alert.alert(t('myRent.reqFail', 'Gagal'), error.message || t('myRent.reqFailMsg', 'Terjadi kesalahan saat mengajukan fasilitas.'));
    } else {
      setShowFacilityModal(false);
      Alert.alert(t('myRent.reqSuccess', 'Berhasil'), t('myRent.reqSuccessMsg', 'Pengajuan fasilitas terkirim. Menunggu persetujuan pemilik.'));
      loadData(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Belum punya hunian aktif
  if (!contract && rentalRequests.length === 0) {
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

  const room = contract?.rooms;
  const property = room?.properties;
  const owner = property?.users;
  const facilities = room?.room_facilities?.map((rf) => rf.facility_master?.name).filter(Boolean) ?? [];
  const activeContractFacilities = (contract?.contract_facilities || []).filter((f) => f.status === 'active');
  const requestedContractFacilities = (contract?.contract_facilities || []).filter((f) => f.status === 'requested');

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
              {contract ? t('myRent.activeContract', 'Kontrak aktif') : t('myRent.yourRequest', 'Pengajuan sewa Anda')}
            </Text>
          </View>
        </View>
      </View>

      {/* Pengajuan Pending (jika belum punya kontrak) */}
      {!contract && rentalRequests.length > 0 && (
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
                {req.status === 'rejected' && req.owner_rejection_reason && (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionText}>
                      {t('myRent.reason', 'Alasan: {{reason}}', { reason: getLocalizedField(req, 'owner_rejection_reason', i18n.language) })}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Kontrak Aktif */}
      {contract && (
        <>
          {/* Room Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('myRent.myRoom', 'Kamar Saya')}</Text>
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
                  <Text style={[styles.roomAddress, { marginTop: 0 }]}>
                    {property?.address_line}, {property?.city}
                  </Text>
                </View>
                <Text style={styles.roomPrice}>
                  {formatCurrency(contract.monthly_rate)}{t('roomDetail.perMonth', '/bulan')}
                </Text>
              </View>
            </View>

            {/* Contract Dates */}
            <View style={styles.contractDates}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t('myRent.start', 'Mulai')}</Text>
                <Text style={styles.dateValue}>{formatDate(contract.start_date)}</Text>
              </View>
              <View style={styles.dateSeparator} />
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t('myRent.end', 'Selesai')}</Text>
                <Text style={styles.dateValue}>{formatDate(contract.end_date)}</Text>
              </View>
            </View>

            {/* Facilities */}
            {facilities.length > 0 && (
              <View style={styles.facilitiesContainer}>
                <Text style={styles.facilitiesLabel}>{t('myRent.facilities', 'Fasilitas:')}</Text>
                <View style={styles.facilitiesWrap}>
                  {facilities.map((f, i) => (
                    <View key={i} style={styles.facilityTag}>
                      <Text style={styles.facilityTagText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Optional Facilities */}
            {(activeContractFacilities.length > 0 || requestedContractFacilities.length > 0) && (
              <View style={styles.optionalFacilitiesBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="sparkles" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.optionalFacilitiesTitle}>{t('myRent.additionalFacilities', 'Fasilitas Tambahan')}</Text>
                  </View>
                </View>

                {activeContractFacilities.map((cf) => (
                  <View key={cf.id} style={styles.optionalFacilityItem}>
                    <Text style={styles.optionalFacilityName}>
                      {cf.custom_facility_name || cf.facility_master?.name || t('myRent.optionalFacility', 'Fasilitas Opsional')}
                    </Text>
                    <Text style={styles.optionalFacilityPrice}>
                      {formatCurrency(cf.price_per_month)}{t('roomDetail.perMonth', '/bulan')}
                    </Text>
                  </View>
                ))}

                {requestedContractFacilities.map((cf) => (
                  <View key={cf.id} style={styles.optionalFacilityItem}>
                    <Text style={[styles.optionalFacilityName, { color: COLORS.textSecondary }]}>
                      {cf.custom_facility_name || cf.facility_master?.name || t('myRent.optionalFacility', 'Fasilitas Opsional')}
                    </Text>
                    <View style={styles.requestBadgeInline}>
                      <Text style={styles.requestBadgeTextInline}>{t('myRent.waitingConfirm', 'Menunggu Konfirmasi')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.addFacilityBtn}
              onPress={() => setShowFacilityModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.addFacilityBtnText}>{t('myRent.requestAdditional', 'Ajukan Fasilitas Tambahan')}</Text>
            </TouchableOpacity>
          </View>


          {/* Owner Contact */}
          {owner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('myRent.contactOwner', 'Hubungi Pemilik')}</Text>
              <View style={styles.ownerCard}>
                <View style={styles.ownerAvatar}>
                  <Text style={styles.ownerAvatarText}>
                    {owner.full_name?.[0]?.toUpperCase() ?? 'O'}
                  </Text>
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{owner.full_name}</Text>
                  <Text style={styles.ownerPhone}>{owner.phone_number ?? 'Tidak tersedia'}</Text>
                </View>
                {owner.phone_number && (
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={[styles.callBtn, { marginRight: 8 }]}
                      onPress={() => handleCallOwner(owner.phone_number)}
                    >
                      <Ionicons name="call" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.callBtnText}>{t('myRent.call', 'Hubungi')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]}
                      onPress={() => {
                        let phone = owner.phone_number.replace(/\D/g, '');
                        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                        const url = `whatsapp://send?phone=${phone}&text=Halo Bapak/Ibu ${owner.full_name}, saya penyewa kosan Anda di aplikasi KosanKu.`;
                        Linking.openURL(url).catch(() => Alert.alert(t('myRent.callFail', 'Gagal'), 'WhatsApp tidak terinstal'));
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={[styles.callBtnText, { color: '#FFF' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Recent Invoices */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('myRent.recentInvoices', 'Tagihan Terbaru')}</Text>
            </View>

            {recentInvoices.length === 0 ? (
              <View style={styles.emptyInvoice}>
                <Text style={styles.emptyInvoiceText}>{t('myRent.noInvoices', 'Belum ada tagihan')}</Text>
              </View>
            ) : (
              recentInvoices.map((invoice) => {
                const statusConfig = getInvoiceStatusConfig(t);
                const status = statusConfig[invoice.status] ?? statusConfig.unpaid;
                return (
                  <TouchableOpacity
                    key={invoice.id}
                    style={styles.invoiceCard}
                    onPress={() =>
                      navigation.navigate(TENANT_SCREENS.INVOICE_DETAIL, { invoice })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.invoiceLeft}>
                      <Ionicons name={status.icon} size={24} color={status.color} />
                      <View>
                        <Text style={styles.invoicePeriod}>{formatPeriod(invoice.billing_period)}</Text>
                        <Text style={[styles.invoiceStatus, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invoiceAmount}>
                      {formatCurrency(invoice.total_amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>

      {/* Facility Request Modal */}
      <Modal
        visible={showFacilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFacilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('myRent.requestFacility', 'Ajukan Fasilitas')}</Text>
              <TouchableOpacity onPress={() => setShowFacilityModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{t('myRent.chooseFacility', 'Pilih fasilitas tambahan yang ingin Anda pasang di kamar ini.')}</Text>

            <ScrollView style={styles.facilityList}>
              {masterFacilities.map((facility) => {
                const isAlreadyActive = activeContractFacilities.some(cf => cf.facility_id === facility.id);
                const isAlreadyRequested = requestedContractFacilities.some(cf => cf.facility_id === facility.id);
                const disabled = isAlreadyActive || isAlreadyRequested || isRequesting;

                return (
                  <TouchableOpacity
                    key={facility.id}
                    style={[styles.facilityOption, disabled && styles.facilityOptionDisabled]}
                    disabled={disabled}
                    onPress={() => handleRequestFacility(facility.id)}
                  >
                    <View style={styles.facilityOptionLeft}>
                      <Ionicons name={facility.icon_name || 'apps'} size={24} color={disabled ? COLORS.textTertiary : COLORS.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.facilityOptionName, disabled && { color: COLORS.textTertiary }]}>{facility.name}</Text>
                        {isAlreadyActive ? (
                          <Text style={styles.facilityOptionStatus}>{t('myRent.installed', 'Sudah terpasang')}</Text>
                        ) : isAlreadyRequested ? (
                          <Text style={styles.facilityOptionStatus}>{t('myRent.waitingApproval', 'Menunggu persetujuan')}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={disabled ? COLORS.grey200 : COLORS.grey400} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
