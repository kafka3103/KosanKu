/**
 * screens/owner/RentalRequestScreen.jsx
 * Owner meninjau & memproses pengajuan sewa (approve/reject)
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
  Modal,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import {
  getOwnerRentalRequests,
  approveRentalRequest,
  rejectRentalRequest,
  getPendingFacilityRequests,
  approveFacilityRequest,
  rejectFacilityRequest,
} from '../../services/propertyService';

const STATUS_CONFIG = (t) => ({
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: t('ownerRentalRequest.statusPending', 'Menunggu') },
  approved: { color: COLORS.success, bg: COLORS.successLight, label: t('ownerRentalRequest.statusApproved', 'Disetujui') },
  rejected: { color: COLORS.error, bg: COLORS.errorLight, label: t('ownerRentalRequest.statusRejected', 'Ditolak') },
  expired: { color: COLORS.grey500, bg: COLORS.grey100, label: t('ownerRentalRequest.statusExpired', 'Kedaluwarsa') },
  cancelled: { color: COLORS.grey500, bg: COLORS.grey100, label: t('ownerRentalRequest.statusCancelled', 'Dibatalkan') },
});

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

const RequestCard = ({ request, onApprove, onReject, t }) => {
  const statusConfig = STATUS_CONFIG(t);
  const status = statusConfig[request.status] ?? statusConfig.pending;
  const tenant = request.users;
  const room = request.rooms;
  const property = room?.properties;

  return (
    <View style={styles.card}>
      {/* Status Badge */}
      <View style={[styles.cardStatusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.cardStatusText, { color: status.color }]}>{status.label}</Text>
      </View>

      {/* Tenant Info */}
      <View style={styles.tenantRow}>
        <View style={styles.tenantAvatar}>
          <Text style={styles.tenantAvatarText}>
            {tenant?.full_name?.[0]?.toUpperCase() ?? 'T'}
          </Text>
        </View>
        <View style={styles.tenantInfo}>
          <Text style={styles.tenantName}>{tenant?.full_name ?? 'Tenant'}</Text>
          <Text style={styles.tenantPhone}>{tenant?.phone_number ?? tenant?.email ?? '—'}</Text>
        </View>
        {tenant?.phone_number && (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#E8F9F0', borderRadius: 20, marginLeft: 8 }}
            onPress={() => {
              let phone = tenant.phone_number.replace(/\D/g, '');
              if (phone.startsWith('0')) phone = '62' + phone.substring(1);
              const message = t('ownerRentalRequest.whatsappMsg', 'Halo {{name}}, saya pemilik kosan {{property}}. Saya melihat Anda mengajukan sewa di aplikasi KosanKu.', { name: tenant.full_name, property: property?.name });
              const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
              Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp tidak terinstal'));
            }}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        )}
      </View>

      {/* Room Info */}
      <View style={styles.roomInfoBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="home" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            <Text style={styles.infoBold}>{property?.name}</Text> · {t('ownerRentalRequest.room', 'Kamar')} {room?.room_number}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="calendar" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            {t('ownerRentalRequest.start', 'Mulai')}: <Text style={styles.infoBold}>{formatDate(request.requested_start_date)}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="time" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            {t('ownerRentalRequest.duration', 'Durasi')}: <Text style={styles.infoBold}>{request.duration_months} {t('ownerRentalRequest.months', 'bulan')}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="wallet" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            <Text style={styles.infoBold}>{formatCurrency(request.monthly_rate)}/{t('ownerRentalRequest.monthAbbr', 'bln')}</Text>
          </Text>
        </View>
        {request.tenant_message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>{t('ownerRentalRequest.tenantMsg', 'Pesan Tenant:')}</Text>
            <Text style={styles.messageText}>{request.tenant_message}</Text>
          </View>
        )}
      </View>

      {/* Actions (hanya untuk status pending) */}
      {request.status === 'pending' && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(request)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="close" size={16} color={COLORS.error} style={{ marginRight: 4 }} />
              <Text style={styles.rejectBtnText}>{t('ownerRentalRequest.btnReject', 'Tolak')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => onApprove(request)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark" size={16} color={COLORS.white} style={{ marginRight: 4 }} />
              <Text style={styles.approveBtnText}>{t('ownerRentalRequest.btnApprove', 'Setujui')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Rejection reason (jika ditolak) */}
      {request.status === 'rejected' && request.owner_rejection_reason && (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionLabel}>{t('ownerRentalRequest.rejectReasonLabel', 'Alasan Penolakan:')}</Text>
          <Text style={styles.rejectionText}>{request.owner_rejection_reason}</Text>
        </View>
      )}
    </View>
  );
};

const FilterTab = ({ label, isActive, onPress, count }) => (
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{label}</Text>
    {count != null && count > 0 && (
      <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
        <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const RentalRequestScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();

  const [requests, setRequests] = useState([]);
  const [facilityRequests, setFacilityRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('rental'); // 'rental' | 'facility'
  const [activeFilter, setActiveFilter] = useState('pending'); // Hanya untuk rental
  const insets = useSafeAreaInsets();

  // Reject modal (Rental)
  const [rejectModal, setRejectModal] = useState({ visible: false, request: null });
  const [rejectReason, setRejectReason] = useState('');
  
  // Approve modal (Facility)
  const [approveFacilityModal, setApproveFacilityModal] = useState({ visible: false, request: null });
  const [facilityPrice, setFacilityPrice] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRequests = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const [rentalRes, facilityRes] = await Promise.all([
      getOwnerRentalRequests(currentUser.id, 'all'),
      getPendingFacilityRequests(currentUser.id)
    ]);
    if (!rentalRes.error && rentalRes.data) setRequests(rentalRes.data);
    if (!facilityRes.error && facilityRes.data) setFacilityRequests(facilityRes.data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const handleApprove = (request) => {
    Alert.alert(
      t('ownerRentalRequest.approveConfirmTitle', 'Setujui Pengajuan'),
      t('ownerRentalRequest.approveConfirmMsg', 'Yakin ingin menyetujui pengajuan ini? Kontrak akan otomatis dibuat.'),
      [
        { text: t('ownerRentalRequest.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('ownerRentalRequest.btnApprove', 'Setujui'),
          onPress: async () => {
            setIsProcessing(true);
            const { error } = await approveRentalRequest(request.id);
            setIsProcessing(false);
            if (error) {
              Alert.alert(t('ownerRentalRequest.failTitle', 'Gagal'), error.message);
            } else {
              // Update lokal tanpa reload
              setRequests((prev) =>
                prev.map((r) => (r.id === request.id ? { ...r, status: 'approved' } : r))
              );
              Alert.alert(t('ownerRentalRequest.approveSuccessTitle', 'Berhasil'), t('ownerRentalRequest.approveSuccessMsg', 'Pengajuan disetujui! Kontrak dibuat otomatis.'));
            }
          },
        },
      ]
    );
  };

  const handleReject = (request) => {
    setRejectModal({ visible: true, request });
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', t('ownerRentalRequest.reqReasonError', 'Alasan penolakan wajib diisi'));
      return;
    }
    setIsProcessing(true);
    const { error } = await rejectRentalRequest(rejectModal.request.id, rejectReason.trim());
    setIsProcessing(false);

    if (error) {
      Alert.alert(t('ownerRentalRequest.failTitle', 'Gagal'), error.message);
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === rejectModal.request.id
            ? { ...r, status: 'rejected', owner_rejection_reason: rejectReason.trim() }
            : r
        )
      );
      setRejectModal({ visible: false, request: null });
      Alert.alert(t('ownerRentalRequest.rejectSuccessTitle', 'Selesai'), t('ownerRentalRequest.rejectSuccessMsg', 'Pengajuan berhasil ditolak.'));
    }
  };

  // Facility Actions
  const handleApproveFacility = (request) => {
    setApproveFacilityModal({ visible: true, request });
    setFacilityPrice('');
  };

  const confirmApproveFacility = async () => {
    const price = parseInt(facilityPrice.replace(/\D/g, ''), 10);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', t('ownerRentalRequest.reqPriceError', 'Harga valid wajib diisi'));
      return;
    }
    setIsProcessing(true);
    const { error } = await approveFacilityRequest(approveFacilityModal.request.id, price);
    setIsProcessing(false);
    if (error) {
      Alert.alert(t('ownerRentalRequest.failTitle', 'Gagal'), error.message);
    } else {
      setFacilityRequests(prev => prev.filter(r => r.id !== approveFacilityModal.request.id));
      setApproveFacilityModal({ visible: false, request: null });
      Alert.alert(t('ownerRentalRequest.approveSuccessTitle', 'Berhasil'), t('ownerRentalRequest.facilityApproveSuccessMsg', 'Fasilitas disetujui, tagihan akan bertambah di bulan berikutnya.'));
    }
  };

  const handleRejectFacility = (request) => {
    Alert.alert(t('ownerRentalRequest.rejectTitle', 'Tolak Pengajuan'), t('ownerRentalRequest.facilityRejectConfirmMsg', 'Yakin ingin menolak pengajuan fasilitas ini?'), [
      { text: t('ownerRentalRequest.cancel', 'Batal'), style: 'cancel' },
      { text: t('ownerRentalRequest.btnReject', 'Tolak'), style: 'destructive', onPress: async () => {
        setIsProcessing(true);
        const { error } = await rejectFacilityRequest(request.id);
        setIsProcessing(false);
        if (error) Alert.alert(t('ownerRentalRequest.failTitle', 'Gagal'), error.message);
        else setFacilityRequests(prev => prev.filter(r => r.id !== request.id));
      }}
    ]);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const filters = [
    { key: 'pending', label: t('ownerRentalRequest.filterPending', 'Menunggu'), count: pendingCount },
    { key: 'approved', label: t('ownerRentalRequest.filterApproved', 'Disetujui') },
    { key: 'rejected', label: t('ownerRentalRequest.filterRejected', 'Ditolak') },
    { key: 'all', label: t('ownerRentalRequest.filterAll', 'Semua') },
  ];

  const filteredRequests =
    activeFilter === 'all' ? requests : requests.filter((r) => r.status === activeFilter);

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
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
            
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ownerRentalRequest.headerTitle', 'Pengajuan Sewa')}</Text>
        {pendingCount > 0 && activeTab === 'rental' && (
          <Text style={styles.headerSubtitle}>{t('ownerRentalRequest.pendingSubtitleRental', '{{count}} pengajuan menunggu konfirmasi', { count: pendingCount })}</Text>
        )}
        {facilityRequests.length > 0 && activeTab === 'facility' && (
          <Text style={styles.headerSubtitle}>{t('ownerRentalRequest.pendingSubtitleFacility', '{{count}} fasilitas perlu persetujuan', { count: facilityRequests.length })}</Text>
        )}
      </View>

      {/* Main Tabs (Sewa Kos vs Fasilitas) */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity 
          style={[styles.mainTab, activeTab === 'rental' && styles.mainTabActive]}
          onPress={() => setActiveTab('rental')}
        >
          <Text style={[styles.mainTabText, activeTab === 'rental' && styles.mainTabTextActive]}>{t('ownerRentalRequest.tabRental', 'Sewa Kos')}</Text>
          {pendingCount > 0 && (
            <View style={styles.mainTabBadge}><Text style={styles.mainTabBadgeText}>{pendingCount}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.mainTab, activeTab === 'facility' && styles.mainTabActive]}
          onPress={() => setActiveTab('facility')}
        >
          <Text style={[styles.mainTabText, activeTab === 'facility' && styles.mainTabTextActive]}>{t('ownerRentalRequest.tabFacility', 'Fasilitas Opsional')}</Text>
          {facilityRequests.length > 0 && (
            <View style={styles.mainTabBadge}><Text style={styles.mainTabBadgeText}>{facilityRequests.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs (hanya untuk rental) */}
      {activeTab === 'rental' && (
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
                count={item.count}
                onPress={() => setActiveFilter(item.key)}
              />
            )}
          />
        </View>
      )}

      {/* Requests List */}
      <FlatList
        data={activeTab === 'rental' ? filteredRequests : facilityRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadRequests(true); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name={activeTab === 'rental' ? "mail-open-outline" : "sparkles-outline"} size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{activeTab === 'rental' ? t('ownerRentalRequest.emptyTitleRental', 'Belum Ada Pengajuan') : t('ownerRentalRequest.emptyTitleFacility', 'Tidak Ada Pengajuan')}</Text>
            <Text style={styles.emptySubtitle}>{activeTab === 'rental' ? t('ownerRentalRequest.emptySubtitleRental', 'Pengajuan sewa dari calon penghuni akan muncul di sini') : t('ownerRentalRequest.emptySubtitleFacility', 'Belum ada tenant yang mengajukan fasilitas tambahan.')}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (activeTab === 'rental') {
            return (
              <RequestCard
                request={item}
                onApprove={handleApprove}
                onReject={handleReject}
                t={t}
              />
            );
          } else {
            // Facility Request Card
            const tenant = item.contracts?.users;
            const room = item.contracts?.rooms;
            const property = room?.properties;
            return (
              <View style={styles.card}>
                <View style={[styles.cardStatusBadge, { backgroundColor: COLORS.warningLight }]}>
                  <Text style={[styles.cardStatusText, { color: COLORS.warning }]}>{t('ownerRentalRequest.statusPending', 'Menunggu')}</Text>
                </View>
                <View style={styles.tenantRow}>
                  <View style={styles.tenantAvatar}><Text style={styles.tenantAvatarText}>{tenant?.full_name?.[0]?.toUpperCase() ?? 'T'}</Text></View>
                  <View style={styles.tenantInfo}>
                    <Text style={styles.tenantName}>{tenant?.full_name ?? 'Tenant'}</Text>
                    <Text style={styles.tenantPhone}>{tenant?.phone_number ?? '—'}</Text>
                  </View>
                </View>
                <View style={styles.roomInfoBox}>
                  <Text style={styles.infoRow}><Text style={styles.infoBold}>{property?.name}</Text> · {t('ownerRentalRequest.room', 'Kamar')} {room?.room_number}</Text>
                  <Text style={[styles.infoRow, { marginTop: 4 }]}><Text style={styles.infoBold}>{t('ownerRentalRequest.facilityLabel', 'Fasilitas:')}</Text> {item.facility_master?.name}</Text>
                  <Text style={[styles.infoRow, { marginTop: 4 }]}><Text style={styles.infoBold}>{t('ownerRentalRequest.submittedLabel', 'Diajukan:')}</Text> {formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectFacility(item)}>
                    <Ionicons name="close" size={16} color={COLORS.error} style={{ marginRight: 4 }} /><Text style={styles.rejectBtnText}>{t('ownerRentalRequest.btnReject', 'Tolak')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveFacility(item)}>
                    <Ionicons name="checkmark" size={16} color={COLORS.white} style={{ marginRight: 4 }} /><Text style={styles.approveBtnText}>{t('ownerRentalRequest.btnSetApprove', 'Set Harga & Setujui')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
        }}
      />

      {/* Reject Modal */}
      <Modal
        visible={rejectModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal({ visible: false, request: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('ownerRentalRequest.rejectTitle', 'Tolak Pengajuan')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('ownerRentalRequest.rejectSubtitle', 'Berikan alasan penolakan untuk tenant:')}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('ownerRentalRequest.rejectReasonPlaceholder', 'Misal: Kamar sudah penuh, atau tidak sesuai kriteria...')}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={COLORS.textTertiary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal({ visible: false, request: null })}
              >
                <Text style={styles.modalCancelText}>{t('ownerRentalRequest.cancel', 'Batal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, isProcessing && { opacity: 0.7 }]}
                onPress={confirmReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalRejectText}>{t('ownerRentalRequest.rejectTitle', 'Tolak Pengajuan')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Approve Facility Modal */}
      <Modal
        visible={approveFacilityModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setApproveFacilityModal({ visible: false, request: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('ownerRentalRequest.facilityApproveTitle', 'Setujui Fasilitas Tambahan')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('ownerRentalRequest.facilityApproveSubtitle', 'Tentukan harga sewa per bulan untuk fasilitas {{facility}}:', { facility: approveFacilityModal.request?.facility_master?.name })}
            </Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                keyboardType="number-pad"
                value={facilityPrice}
                onChangeText={(text) => {
                  const num = text.replace(/\D/g, '');
                  setFacilityPrice(num ? parseInt(num, 10).toLocaleString('id-ID') : '');
                }}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setApproveFacilityModal({ visible: false, request: null })}
              >
                <Text style={styles.modalCancelText}>{t('ownerRentalRequest.cancel', 'Batal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApproveBtn, isProcessing && { opacity: 0.7 }]}
                onPress={confirmApproveFacility}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalApproveText}>{t('ownerRentalRequest.btnApprove', 'Setujui')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backBtn: { marginBottom: SPACING[3] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    marginTop: 2,
    marginLeft: 28,
  },
  // Main Tabs
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[1],
    ...SHADOW.sm,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  mainTabActive: {
    backgroundColor: COLORS.primarySurface,
  },
  mainTabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  mainTabTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  mainTabBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: 6,
  },
  mainTabBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: { paddingHorizontal: SPACING[4], paddingVertical: SPACING[3], gap: SPACING[2] },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: COLORS.white },
  filterBadgeText: { fontSize: 10, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  filterBadgeTextActive: { color: COLORS.primary },
  listContent: { padding: SPACING[4], gap: SPACING[3], paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
    position: 'relative',
  },
  cardStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[3],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING[3],
  },
  cardStatusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  tenantAvatarText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  tenantInfo: { flex: 1 },
  tenantName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  tenantPhone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 1 },
  roomInfoBox: {
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    gap: SPACING[1],
    marginBottom: SPACING[3],
  },
  infoRow: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  infoBold: { fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  messageBox: {
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  messageLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  messageText: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  cardActions: { flexDirection: 'row', gap: SPACING[3] },
  rejectBtn: {
    flex: 1,
    backgroundColor: COLORS.errorLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    alignItems: 'center',
  },
  rejectBtnText: {
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.semiBold,
    fontSize: FONT_SIZE.sm,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    alignItems: 'center',
  },
  approveBtnText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semiBold,
    fontSize: FONT_SIZE.sm,
  },
  rejectionBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
  },
  rejectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.error,
    marginBottom: 4,
  },
  rejectionText: { fontSize: FONT_SIZE.sm, color: COLORS.error },
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['3xl'],
    borderTopRightRadius: BORDER_RADIUS['3xl'],
    padding: SPACING[6],
    paddingBottom: SPACING[10],
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[4],
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.grey50,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[5],
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.grey100,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  modalRejectBtn: {
    flex: 2,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
  },
  modalRejectText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  modalApproveBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  modalApproveText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[5],
    backgroundColor: COLORS.grey50,
  },
  currencyPrefix: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    marginRight: SPACING[2],
  },
  priceInput: {
    flex: 1,
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});

export default RentalRequestScreen;
