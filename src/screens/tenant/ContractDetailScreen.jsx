/**
 * screens/tenant/ContractDetailScreen.jsx
 * Halaman khusus untuk menampilkan detail kontrak, tagihan, dan kontak pemilik
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { id as idLocale } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

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

const ContractDetailScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Data dikirim via route params dari MyRentScreen
  const { contract, invoices } = route.params || {};

  if (!contract) {
    return (
      <View style={styles.errorContainer}>
        <Text>Data kontrak tidak ditemukan.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff' }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const room = contract.rooms;
  const property = room?.properties;
  const owner = property?.users;
  const facilities = room?.room_facilities?.map((rf) => rf.facility_master?.name).filter(Boolean) ?? [];
  const activeContractFacilities = (contract.contract_facilities || []).filter((f) => f.status === 'active');
  const requestedContractFacilities = (contract.contract_facilities || []).filter((f) => f.status === 'requested');
  const contractInvoices = invoices || [];

  const handleCallOwner = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() =>
      Alert.alert(t('myRent.callFail', 'Gagal'), t('myRent.callFailMsg', 'Tidak bisa membuka aplikasi telepon'))
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <TouchableOpacity style={{ padding: 8, marginRight: 8, marginLeft: -8 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('myRent.myRoom', 'Kamar Saya')}</Text>
          <Text style={styles.headerSubtitle}>{property?.name}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 32 }}>
          {/* Room Summary Card */}
          <View style={styles.section}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.optionalFacilitiesTitle}>{t('myRent.additionalFacilities', 'Fasilitas Tambahan')}</Text>
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
                {owner.phone_number ? (
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
                ) : null}
              </View>
            </View>
          )}

          {/* Recent Invoices */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('myRent.recentInvoices', 'Tagihan')}</Text>
            </View>

            {contractInvoices.length === 0 ? (
              <View style={styles.emptyInvoice}>
                <Text style={styles.emptyInvoiceText}>{t('myRent.noInvoices', 'Belum ada tagihan')}</Text>
              </View>
            ) : (
              contractInvoices.map((invoice) => {
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
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING[10] },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { marginTop: 16, padding: 12, backgroundColor: COLORS.primary, borderRadius: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  roomCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
    position: 'relative',
  },
  roomPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING[4],
  },
  roomPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.grey100,
    marginRight: SPACING[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: { flex: 1, justifyContent: 'center' },
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
    marginTop: 2,
  },
  roomPrice: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginTop: 8,
  },
  contractDates: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    alignItems: 'center',
  },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  dateValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  dateSeparator: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.grey300,
    marginHorizontal: SPACING[4],
  },
  facilitiesContainer: { marginBottom: SPACING[4] },
  facilitiesLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  facilitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  facilityTag: {
    backgroundColor: COLORS.grey100,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    borderRadius: BORDER_RADIUS.full,
  },
  facilityTagText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  optionalFacilitiesBox: {
    backgroundColor: '#fff8e1',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#ffecb3',
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
    marginTop: SPACING[2],
  },
  optionalFacilityName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  optionalFacilityPrice: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  requestBadgeInline: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requestBadgeTextInline: { fontSize: 10, color: COLORS.warning, fontWeight: 'bold' },
  ownerCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  ownerAvatarText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  ownerInfo: { marginBottom: SPACING[4] },
  ownerName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  ownerPhone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  callBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  invoiceLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  invoicePeriod: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  invoiceStatus: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold },
  invoiceAmount: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  emptyInvoice: {
    backgroundColor: COLORS.white,
    padding: SPACING[6],
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  emptyInvoiceText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
});

export default ContractDetailScreen;
