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
} from 'react-native';
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
} from '../../services/propertyService';

const STATUS_CONFIG = {
  pending: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Menunggu' },
  approved: { color: COLORS.success, bg: COLORS.successLight, label: 'Disetujui' },
  rejected: { color: COLORS.error, bg: COLORS.errorLight, label: 'Ditolak' },
  expired: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Kedaluwarsa' },
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
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const RequestCard = ({ request, onApprove, onReject }) => {
  const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
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
      </View>

      {/* Room Info */}
      <View style={styles.roomInfoBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="home" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            <Text style={styles.infoBold}>{property?.name}</Text> · Kamar {room?.room_number}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="calendar" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            Mulai: <Text style={styles.infoBold}>{formatDate(request.requested_start_date)}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="time" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            Durasi: <Text style={styles.infoBold}>{request.duration_months} bulan</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Ionicons name="wallet" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.infoRow}>
            <Text style={styles.infoBold}>{formatCurrency(request.monthly_rate)}/bln</Text>
          </Text>
        </View>
        {request.tenant_message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>Pesan Tenant:</Text>
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
              <Text style={styles.rejectBtnText}>Tolak</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => onApprove(request)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark" size={16} color={COLORS.white} style={{ marginRight: 4 }} />
              <Text style={styles.approveBtnText}>Setujui</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Rejection reason (jika ditolak) */}
      {request.status === 'rejected' && request.owner_rejection_reason && (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionLabel}>Alasan Penolakan:</Text>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('pending');

  // Reject modal
  const [rejectModal, setRejectModal] = useState({ visible: false, request: null });
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRequests = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const { data, error } = await getOwnerRentalRequests(currentUser.id, 'all');
    if (!error && data) setRequests(data);
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
      'Setujui Pengajuan',
      t('rental.review.confirmApprove'),
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui',
          onPress: async () => {
            setIsProcessing(true);
            const { error } = await approveRentalRequest(request.id);
            setIsProcessing(false);
            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              // Update lokal tanpa reload
              setRequests((prev) =>
                prev.map((r) => (r.id === request.id ? { ...r, status: 'approved' } : r))
              );
              Alert.alert('Berhasil', 'Pengajuan disetujui! Kontrak dibuat otomatis.');
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
      Alert.alert('Error', 'Alasan penolakan wajib diisi');
      return;
    }
    setIsProcessing(true);
    const { error } = await rejectRentalRequest(rejectModal.request.id, rejectReason.trim());
    setIsProcessing(false);

    if (error) {
      Alert.alert('Gagal', error.message);
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === rejectModal.request.id
            ? { ...r, status: 'rejected', owner_rejection_reason: rejectReason.trim() }
            : r
        )
      );
      setRejectModal({ visible: false, request: null });
      Alert.alert('Selesai', 'Pengajuan berhasil ditolak.');
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const filters = [
    { key: 'pending', label: 'Menunggu', count: pendingCount },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'all', label: 'Semua' },
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
            <Text style={styles.backBtnText}>Kembali</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rental.list.ownerTitle')}</Text>
        {pendingCount > 0 && (
          <Text style={styles.headerSubtitle}>{pendingCount} pengajuan menunggu konfirmasi</Text>
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
              count={item.count}
              onPress={() => setActiveFilter(item.key)}
            />
          )}
        />
      </View>

      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
            <Ionicons name="mail-open-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{t('rental.list.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('rental.list.emptySubtitle')}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
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
            <Text style={styles.modalTitle}>Tolak Pengajuan</Text>
            <Text style={styles.modalSubtitle}>
              Berikan alasan penolakan untuk tenant:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('rental.review.rejectionReasonPlaceholder')}
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
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, isProcessing && { opacity: 0.7 }]}
                onPress={confirmReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalRejectText}>Tolak Pengajuan</Text>
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
    paddingTop: SPACING[14],
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
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
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
  listContent: { padding: SPACING[4], gap: SPACING[3], paddingBottom: SPACING[10] },
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
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default RentalRequestScreen;
