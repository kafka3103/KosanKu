/**
 * screens/tenant/RentalRequestFormScreen.jsx
 * Form pengajuan sewa kamar oleh tenant
 * Isi tanggal mulai, durasi, foto KTP (opsional), dan pesan ke owner
 */

import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { format, addMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { submitRentalRequest } from '../../services/searchService';
import { uploadKtpPhoto } from '../../services/userService';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (date) => format(date, 'd MMMM yyyy', { locale: idLocale });

const DURATION_OPTIONS = [1, 3, 6, 12];

const RentalRequestFormScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const room = route.params?.room;
  const property = route.params?.property;

  const [startDate] = useState(new Date()); // Selalu mulai dari hari ini
  const [durationMonths, setDurationMonths] = useState(1);
  const [tenantMessage, setTenantMessage] = useState('');
  const [ktpUri, setKtpUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const endDate = addMonths(startDate, durationMonths);
  const totalCost = (room?.base_price ?? 0) * durationMonths;

  const handlePickKtp = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Akses galeri foto diperlukan untuk upload KTP.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setKtpUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    Alert.alert(
      'Konfirmasi Pengajuan',
      `Ajukan sewa kamar ${room?.room_number} di ${property?.name} selama ${durationMonths} bulan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kirim Pengajuan',
          onPress: async () => {
            setIsLoading(true);
            try {
              let ktpPhotoUrl = null;

              // Upload KTP jika ada
              if (ktpUri) {
                const { path, error: ktpError } = await uploadKtpPhoto(currentUser.id, ktpUri);
                if (!ktpError && path) {
                  ktpPhotoUrl = path;
                }
              }

              const { data, error } = await submitRentalRequest({
                roomId: room.id,
                tenantId: currentUser.id,
                ownerId: property.owner_id ?? property.users_owner_id_fkey?.id,
                requestedStartDate: startDate.toISOString().split('T')[0],
                durationMonths,
                monthlyRate: parseFloat(room.base_price ?? 0),
                ktpPhotoUrl,
                tenantMessage: tenantMessage.trim() || null,
              });

              if (error) {
                // Cek error unique constraint (sudah ada pengajuan pending)
                if (error.code === '23505') {
                  Alert.alert(
                    'Pengajuan Duplikat',
                    'Kamar ini sudah memiliki pengajuan sewa yang sedang diproses.'
                  );
                } else {
                  Alert.alert('Gagal', error.message);
                }
                return;
              }

              Alert.alert(
                'Pengajuan Dikirim! 🎉',
                'Pengajuan sewa Anda berhasil dikirim. Pemilik kos akan membalas dalam 3 hari kerja.',
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
              Alert.alert('Error', 'Terjadi kesalahan, coba lagi.');
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rental.request.title')}</Text>
        </View>

        {/* Room Summary */}
        <View style={styles.roomSummary}>
          <View style={styles.roomSummaryIcon}>
            <Text style={styles.roomSummaryIconText}>🛏️</Text>
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
          <Text style={styles.sectionTitle}>⏱️ {t('rental.request.durationLabel')}</Text>
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
                  {months} {months === 1 ? 'Bulan' : 'Bulan'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom duration */}
          <View style={styles.customDuration}>
            <Text style={styles.customDurationLabel}>Atau masukkan manual:</Text>
            <TextInput
              style={styles.customDurationInput}
              value={String(durationMonths)}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (!isNaN(n) && n > 0 && n <= 24) setDurationMonths(n);
              }}
              keyboardType="numeric"
              placeholder="Jumlah bulan"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
        </View>

        {/* Tanggal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Periode Sewa</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Mulai</Text>
              <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
            </View>
            <Text style={styles.dateSep}>→</Text>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Selesai</Text>
              <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
            </View>
          </View>
        </View>

        {/* KTP Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🪪 {t('rental.request.ktpPhotoLabel')}</Text>
          <Text style={styles.sectionSubtitle}>{t('rental.request.ktpPhotoHint')}</Text>

          <TouchableOpacity style={styles.ktpUpload} onPress={handlePickKtp} activeOpacity={0.7}>
            {ktpUri ? (
              <Image source={{ uri: ktpUri }} style={styles.ktpPreview} />
            ) : (
              <View style={styles.ktpPlaceholder}>
                <Text style={styles.ktpPlaceholderEmoji}>📷</Text>
                <Text style={styles.ktpPlaceholderText}>Ketuk untuk pilih foto KTP</Text>
              </View>
            )}
          </TouchableOpacity>
          {ktpUri && (
            <TouchableOpacity onPress={() => setKtpUri(null)} style={styles.removeKtp}>
              <Text style={styles.removeKtpText}>✕ Hapus Foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pesan ke Owner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 {t('rental.request.messageLabel')}</Text>
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
          <Text style={styles.summaryTitle}>Ringkasan Pengajuan</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Harga/bulan</Text>
            <Text style={styles.summaryValue}>{formatCurrency(room?.base_price)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Durasi</Text>
            <Text style={styles.summaryValue}>{durationMonths} bulan</Text>
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
  container: { paddingBottom: SPACING[12] },
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
  roomSummaryIconText: { fontSize: 28 },
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
  ktpPlaceholderEmoji: { fontSize: 40 },
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
    backgroundColor: COLORS.secondary,
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
