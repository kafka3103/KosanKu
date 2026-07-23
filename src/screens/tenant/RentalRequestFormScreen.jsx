/**
 * screens/tenant/RentalRequestFormScreen.jsx
 * Form pengajuan sewa kamar oleh tenant
 * Isi tanggal mulai, durasi, foto KTP (opsional), dan pesan ke owner
 */

import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

import { format, addMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { submitRentalRequest } from '../../services/searchService';
import { getTenantProfile } from '../../services/userService';
import { scheduleLocalNotification } from '../../utils/notificationUtils';


const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (date) => format(date, 'd MMMM yyyy', { locale: idLocale });

const DURATION_OPTIONS = [1, 3, 6, 12];

const RentalRequestFormScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const room = route.params?.room;
  const property = route.params?.property;

  const [startDate] = useState(new Date()); // Selalu mulai dari hari ini
  const [durationMonths, setDurationMonths] = useState(1);
  const [tenantMessage, setTenantMessage] = useState('');
  const [tenantNIK, setTenantNIK] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const loadProfile = async () => {
      const { data } = await getTenantProfile(currentUser.id);
      if (data && data.ktp_number) {
        setTenantNIK(data.ktp_number);
      }
    };
    if (currentUser?.id) {
      loadProfile();
    }
  }, [currentUser]);

  const endDate = addMonths(startDate, durationMonths);
  const totalCost = (room?.base_price ?? 0) * durationMonths;



  const handleSubmit = async () => {
    Alert.alert(
      t('rental.request.confirmTitle', 'Konfirmasi Pengajuan'),
      t('rental.request.confirmMsg', `Ajukan sewa kamar ${room?.room_number} di ${property?.name} selama ${durationMonths} bulan?`, { room: room?.room_number, property: property?.name, months: durationMonths }),
      [
        { text: t('rental.request.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('rental.request.submitButton', 'Kirim Pengajuan'),
          onPress: async () => {
            setIsLoading(true);
            try {


              const { data, error } = await submitRentalRequest({
                roomId: room.id,
                tenantId: currentUser.id,
                ownerId: property.owner_id ?? property.users_owner_id_fkey?.id,
                requestedStartDate: startDate.toISOString().split('T')[0],
                durationMonths,
                monthlyRate: parseFloat(room.base_price ?? 0),

                tenantMessage: tenantMessage.trim() || null,
              });

              if (error) {
                // Cek error unique constraint (sudah ada pengajuan pending)
                if (error.code === '23505') {
                  Alert.alert(
                    t('rental.request.duplicateTitle', 'Pengajuan Duplikat'),
                    t('rental.request.duplicateMsg', 'Kamar ini sudah memiliki pengajuan sewa yang sedang diproses.')
                  );
                } else {
                  Alert.alert(t('rental.request.failTitle', 'Gagal'), error.message);
                }
                return;
              }

              // Panggil Local Notification sebagai pemberitahuan lokal di HP penyewa
              scheduleLocalNotification(
                "Pengajuan Berhasil Dikirim!",
                `Pemilik kos ${property?.name} akan meninjau pengajuan Anda dalam waktu 3 hari.`,
                { type: 'rental_request', status: 'pending' },
                2
              );

              Alert.alert(
                t('rental.request.sentTitle', 'Pengajuan Dikirim! 🎉'),
                t('rental.request.sentMsg', 'Pengajuan sewa Anda berhasil dikirim. Pemilik kos akan membalas dalam 3 hari kerja.'),
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Pop kembali ke property detail
                      navigation.popToTop();
                    },
                  },
                ]
              );
            } catch (err) {
              Alert.alert(t('rental.request.errorTitle', 'Error'), t('rental.request.errorMsg', 'Terjadi kesalahan, coba lagi.'));
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
              
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rental.request.title')}</Text>
        </View>

        {/* Room Summary */}
        <View style={styles.roomSummary}>
          <View style={styles.roomSummaryIcon}>
            <Ionicons name="bed-outline" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.roomSummaryInfo}>
            <Text style={styles.roomSummaryName}>{property?.name}</Text>
            <Text style={styles.roomSummaryRoom}>Kamar {room?.room_number}</Text>
            <Text style={styles.roomSummaryPrice}>
              {formatCurrency(room?.base_price)}/bulan
            </Text>
          </View>
        </View>

        {/* Durasi Sewa */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3] }}>
            <Ionicons name="time-outline" size={20} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('rental.request.durationLabel')}</Text>
          </View>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((months) => (
              <TouchableOpacity
                key={months}
                style={[
                  styles.durationOption,
                  durationMonths === months && styles.durationOptionSelected,
                ]}
                onPress={() => setDurationMonths(months)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.durationLabel,
                    durationMonths === months && styles.durationLabelSelected,
                  ]}
                >
                  {months} {months === 1 ? t('roomDetail.perMonth', 'bulan').replace('per ', '') : t('roomDetail.perMonth', 'bulan').replace('per ', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom duration */}
          <View style={styles.customDuration}>
            <Text style={styles.customDurationLabel}>{t('rental.request.manualInput', 'Atau masukkan manual:')}</Text>
            <TextInput
              style={styles.customDurationInput}
              value={String(durationMonths)}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (!isNaN(n) && n > 0 && n <= 24) setDurationMonths(n);
              }}
              keyboardType="numeric"
              placeholder={t('rental.request.monthsPlaceholder', 'Jumlah bulan')}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
        </View>

        {/* Tanggal */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3] }}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('rental.request.rentalPeriod', 'Periode Sewa')}</Text>
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>{t('rental.request.startDateLabel', 'Mulai')}</Text>
              <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
            </View>
            <Text style={styles.dateSep}>→</Text>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>{t('rental.request.endDateLabel', 'Selesai')}</Text>
              <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
            </View>
          </View>
        </View>



        {/* Pesan ke Owner */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3] }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Jaminan Identitas</Text>
          </View>
          <View style={{ backgroundColor: COLORS.successLight, padding: SPACING[3], borderRadius: BORDER_RADIUS.md }}>
             <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: 4 }}>
               NIK Anda otomatis disertakan sebagai jaminan pengajuan sewa ini:
             </Text>
             <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary }}>
               {tenantNIK || 'Memuat NIK...'}
             </Text>
          </View>
        </View>

        {/* Pesan ke Owner */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3] }}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('rental.request.messageLabel')}</Text>
          </View>
          <TextInput
            style={styles.messageInput}
            placeholder={t('rental.request.messagePlaceholder')}
            value={tenantMessage}
            onChangeText={setTenantMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('rental.request.summaryTitle', 'Ringkasan Pengajuan')}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('roomDetail.priceLabel', 'Harga/bulan')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(room?.base_price)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('rental.request.durationLabel', 'Durasi')}</Text>
            <Text style={styles.summaryValue}>{t('rental.request.durationMonths', '{{count}} Bulan', { count: durationMonths })}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryTotalLabel}>{t('rental.request.totalCost')}</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(totalCost)}</Text>
          </View>
          <Text style={styles.validityNote}>
            {t('rental.request.expiresIn', { days: 4 })}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>{t('rental.request.submitButton')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingBottom: 100 },
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
  roomSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING[4],
    gap: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  roomSummaryIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomSummaryInfo: { flex: 1 },
  roomSummaryName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  roomSummaryRoom: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  roomSummaryPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginTop: 4,
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
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[3],
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[3],
    marginTop: -SPACING[2],
  },
  durationRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  durationOption: {
    flex: 1,
    backgroundColor: COLORS.grey50,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  durationLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  durationLabelSelected: { color: COLORS.primary },
  customDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  customDurationLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  customDurationInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[2],
    width: 80,
    textAlign: 'center',
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.grey50,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  dateItem: { flex: 1, backgroundColor: COLORS.grey50, borderRadius: BORDER_RADIUS.md, padding: SPACING[3] },
  dateLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginBottom: 4 },
  dateValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  dateSep: { fontSize: FONT_SIZE.lg, color: COLORS.textTertiary },
  ktpUpload: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  ktpPreview: { width: '100%', height: 200, resizeMode: 'cover' },
  ktpPlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
  },
  ktpPlaceholderText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  removeKtp: {
    alignSelf: 'center',
    marginTop: SPACING[2],
    padding: SPACING[2],
  },
  removeKtpText: { fontSize: FONT_SIZE.sm, color: COLORS.error },
  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.grey50,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
  },
  summaryTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[4],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  summaryLabel: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: FONT_SIZE.sm, color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: SPACING[3],
    marginTop: SPACING[2],
  },
  summaryTotalLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  summaryTotalValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  validityNote: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: SPACING[3],
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    marginHorizontal: SPACING[4],
    marginTop: SPACING[5],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
    ...SHADOW.md,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
});

export default RentalRequestFormScreen;
