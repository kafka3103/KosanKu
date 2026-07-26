import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
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

const ContractDetailScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { request } = route.params || {};

  if (!request) {
    return (
      <View style={styles.center}>
        <Text>Data tidak ditemukan</Text>
      </View>
    );
  }

  const room = request.rooms;
  const property = room?.properties;
  const owner = property?.users;
  
  // If there's a contract, it's inside request.contracts array
  const contract = request.contracts && request.contracts.length > 0 ? request.contracts[0] : null;
  
  // Determine overall status
  let displayStatus = request.status;
  if (contract && contract.status === 'active') {
    displayStatus = 'active';
  } else if (contract && contract.status === 'ended') {
    displayStatus = 'ended';
  }
  
  const statusConfig = getStatusConfig(displayStatus, t);

  // Determine unpaid invoice
  let activeInvoice = null;
  if (contract && contract.invoices && contract.invoices.length > 0) {
    // Find the first invoice that is not fully paid
    activeInvoice = contract.invoices.find(inv => inv.status !== 'paid') || contract.invoices[0];
  }

  const handleCallOwner = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() =>
      Alert.alert(t('myRent.callFail', 'Gagal'), t('myRent.callFailMsg', 'Tidak bisa membuka aplikasi telepon'))
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myRent.contractDetail', 'Detail Kontrak')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        
        {/* Status Card */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusConfig.color }]}>
          <Text style={styles.sectionTitle}>{t('myRent.statusTitle', 'Status Hunian')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          
          {request.status === 'rejected' && request.owner_rejection_reason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>
                {t('myRent.reason', 'Alasan: {{reason}}', { reason: request.owner_rejection_reason })}
              </Text>
            </View>
          )}

          {contract && (
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
          )}
        </View>

        {/* Room & Property Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('myRent.roomInfo', 'Informasi Kamar')}</Text>
          <View style={styles.roomRow}>
            {room?.photo_urls?.[0] || property?.cover_photo_url ? (
              <Image
                source={{ uri: room?.photo_urls?.[0] ?? property?.cover_photo_url }}
                style={styles.roomPhoto}
              />
            ) : (
              <View style={styles.roomPhotoPlaceholder}>
                <Ionicons name="bed-outline" size={32} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.roomInfo}>
              <Text style={styles.roomPropertyName}>{property?.name}</Text>
              <Text style={styles.roomNumber}>{t('roomDetail.roomNumber', 'Kamar {{number}}', { number: room?.room_number })}</Text>
              <Text style={styles.roomAddress} numberOfLines={2}>
                {property?.address_line}, {property?.city}
              </Text>
              <Text style={styles.roomPrice}>
                {formatCurrency(contract ? contract.monthly_rate : request.monthly_rate)}{t('roomDetail.perMonth', '/bulan')}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Progress */}
        {contract && activeInvoice && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('myRent.paymentInfo', 'Informasi Pembayaran')}</Text>
            <View style={styles.paymentBox}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{t('myRent.totalAmount', 'Total Tagihan')}</Text>
                <Text style={styles.paymentValue}>{formatCurrency(activeInvoice.total_amount)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{t('myRent.paidAmount', 'Sudah Dibayar')}</Text>
                <Text style={[styles.paymentValue, { color: COLORS.success }]}>
                  {formatCurrency(activeInvoice.paid_amount || 0)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, { fontWeight: FONT_WEIGHT.bold }]}>{t('myRent.remainingAmount', 'Sisa Hutang')}</Text>
                <Text style={[styles.paymentValue, { color: COLORS.error, fontWeight: FONT_WEIGHT.bold }]}>
                  {formatCurrency((activeInvoice.total_amount || 0) - (activeInvoice.paid_amount || 0))}
                </Text>
              </View>
              
              {activeInvoice.status !== 'paid' && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => navigation.navigate(TENANT_SCREENS.PAYMENT, { invoice: activeInvoice })}
                >
                  <Ionicons name="wallet-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                  <Text style={styles.payButtonText}>{t('myRent.payNow', 'Bayar Sekarang')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Owner Info */}
        {owner && (
          <View style={styles.card}>
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
            </View>
            {owner.phone_number ? (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.callBtn, { marginRight: 8 }]}
                  onPress={() => handleCallOwner(owner.phone_number)}
                >
                  <Ionicons name="call" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.callBtnText}>{t('myRent.call', 'Telepon')}</Text>
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
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[3],
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
    zIndex: 10,
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING[4],
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[3],
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  rejectionBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING[3],
    marginTop: SPACING[3],
  },
  rejectionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
  },
  contractDates: {
    flexDirection: 'row',
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  dateValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  dateSeparator: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING[2] },
  roomRow: {
    flexDirection: 'row',
  },
  roomPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING[3],
  },
  roomPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  roomInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  roomPropertyName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomNumber: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roomAddress: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  roomPrice: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginTop: 6,
  },
  paymentBox: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  paymentLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING[2],
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING[4],
  },
  payButtonText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.base,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  ownerPhone: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
  },
  callBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default ContractDetailScreen;
