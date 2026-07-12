/**
 * screens/tenant/PaymentScreen.jsx
 * Halaman konfirmasi dan simulasi pembayaran tagihan
 * (Dalam production: terintegrasi dengan payment gateway seperti Midtrans)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { recordManualPayment } from '../../services/invoiceService';
import { createPakKasirTransaction, checkPakKasirStatus } from '../../services/pakkasirService';
import useAuthStore from '../../store/authStore';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const PAYMENT_METHODS = [
  {
    id: 'pakkasir_qris',
    name: 'QRIS Otomatis (PakKasir)',
    icon: 'qr-code',
    options: ['QRIS (GoPay, OVO, DANA, BCA, ShopeePay)'],
    isAuto: true,
  },
  {
    id: 'pakkasir_va',
    name: 'Virtual Account Otomatis',
    icon: 'card',
    options: ['BCA Virtual Account', 'BRI Virtual Account', 'BNI Virtual Account', 'Mandiri Virtual Account'],
    isAuto: true,
  },
  {
    id: 'bank_transfer',
    name: 'Transfer Bank Manual',
    icon: 'business',
    options: ['BCA Manual', 'BRI Manual', 'BNI Manual', 'Mandiri Manual'],
    isAuto: false,
  },
  {
    id: 'cash',
    name: 'Tunai / Langsung',
    icon: 'cash',
    options: ['Bayar Langsung ke Pemilik Kos'],
    isAuto: false,
  },
];

const PaymentScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const invoice = route.params?.invoice;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // PakKasir automated payment result state
  const [pakKasirResult, setPakKasirResult] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const unpaidAmount =
    parseFloat(invoice?.total_amount ?? 0) - parseFloat(invoice?.paid_amount ?? 0);

  const handlePay = () => {
    if (!selectedMethod) {
      Alert.alert('Pilih Metode', 'Silakan pilih metode pembayaran terlebih dahulu');
      return;
    }

    if (selectedMethod.isAuto) {
      // Proses pembayaran otomatis melalui PakKasir
      Alert.alert(
        'Pembayaran Otomatis PakKasir',
        `Buat kode ${selectedOption ?? selectedMethod.name} senilai ${formatCurrency(unpaidAmount)}? Status tagihan akan lunas otomatis setelah Anda membayar.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Buat Kode Bayar',
            onPress: async () => {
              setIsLoading(true);
              const methodCode = selectedMethod.id === 'pakkasir_qris' 
                ? 'qris' 
                : (selectedOption ? selectedOption.split(' ')[0].toLowerCase() + '_va' : 'bca_va');

              const result = await createPakKasirTransaction({
                invoice,
                tenant: currentUser,
                paymentMethod: methodCode,
              });
              setIsLoading(false);

              if (!result.success) {
                Alert.alert(
                  'Gagal Membuat Transaksi',
                  result.error || 'Terjadi kesalahan saat menghubungi PakKasir. Pastikan koneksi internet lancar.'
                );
                return;
              }

              setPakKasirResult(result);
            },
          },
        ]
      );
      return;
    }

    // Proses pembayaran manual
    Alert.alert(
      'Konfirmasi Pembayaran Manual',
      `Bayar ${formatCurrency(unpaidAmount)} via ${selectedOption ?? selectedMethod.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Konfirmasi',
          onPress: async () => {
            setIsLoading(true);

            const { error } = await recordManualPayment({
              invoice_id: invoice.id,
              tenant_id: currentUser.id,
              amount: unpaidAmount,
              payment_method: selectedMethod.id,
              payment_channel: selectedOption ?? selectedMethod.name,
            });

            setIsLoading(false);

            if (error) {
              Alert.alert('Gagal', 'Pembayaran manual gagal diproses, coba lagi.');
              return;
            }

            Alert.alert(
              'Pembayaran Dicatat!',
              'Pembayaran manual Anda sedang menunggu konfirmasi dari pemilik kos.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.popToTop(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleCheckStatus = async () => {
    if (!pakKasirResult?.transactionId) return;
    setIsCheckingStatus(true);
    const res = await checkPakKasirStatus(pakKasirResult.transactionId);
    setIsCheckingStatus(false);

    if (res.success && (res.status === 'completed' || res.status === 'success' || res.status === 'paid')) {
      Alert.alert('Pembayaran Terverifikasi! 🎉', 'Tagihan Anda berhasil dibayarkan secara otomatis.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } else {
      Alert.alert('Belum Terbayar ⏳', 'Pembayaran belum masuk. Jika Anda baru saja membayar, tunggu sekitar 30 detik dan coba cek kembali.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText}>Kembali</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pembayaran Tagihan</Text>
        </View>

        {/* Amount Banner */}
        <View style={styles.amountBanner}>
          <Text style={styles.amountLabel}>Total yang Harus Dibayar</Text>
          <Text style={styles.amountValue}>{formatCurrency(unpaidAmount)}</Text>
          <Text style={styles.amountNote}>Invoice #{invoice?.invoice_number}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Pilih Metode Pembayaran</Text>
          {PAYMENT_METHODS.map((method) => {
            const isMethodSelected = selectedMethod?.id === method.id;
            return (
              <View key={method.id} style={[styles.methodContainer, isMethodSelected && { borderColor: COLORS.primary, borderWidth: 1 }]}>
                {/* Method Header */}
                <TouchableOpacity
                  style={[styles.methodHeader, isMethodSelected && styles.methodHeaderSelected]}
                  onPress={() => {
                    setSelectedMethod(method);
                    setSelectedOption(method.options[0]);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrapper, isMethodSelected && { backgroundColor: `${COLORS.primary}20` }]}>
                    <Ionicons name={method.icon} size={22} color={isMethodSelected ? COLORS.primary : COLORS.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodName, isMethodSelected && styles.methodNameSelected]}>
                      {method.name}
                    </Text>
                    {method.isAuto && (
                      <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: FONT_WEIGHT.semiBold }}>
                        ⚡ Verifikasi Otomatis 24 Jam
                      </Text>
                    )}
                  </View>
                  <View style={[styles.radioCircle, isMethodSelected && styles.radioCircleSelected]}>
                    {isMethodSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                {/* Options */}
                {isMethodSelected && (
                  <View style={styles.optionsContainer}>
                    {method.options.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.optionChip,
                          selectedOption === opt && styles.optionChipSelected,
                        ]}
                        onPress={() => setSelectedOption(opt)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedOption === opt && styles.optionTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Info Banner */}
          <View style={styles.demoNote}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[1] }}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.demoNoteTitle}>Pembayaran Aman & Otomatis</Text>
            </View>
            <Text style={styles.demoNoteText}>
              Dengan memilih metode otomatis PakKasir, status tagihan Anda akan berubah menjadi Lunas instan tepat setelah transfer selesai.
            </Text>
          </View>

          <View style={{ height: 180 }} />
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payBtn, isLoading && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payBtnText}>
              Bayar {formatCurrency(unpaidAmount)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* PakKasir Payment Modal */}
      <Modal
        visible={!!pakKasirResult}
        transparent
        animationType="slide"
        onRequestClose={() => setPakKasirResult(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pembayaran PakKasir</Text>
              <TouchableOpacity onPress={() => setPakKasirResult(null)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingVertical: SPACING[3] }}>
              <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING[2] }}>
                Total Pembayaran
              </Text>
              <Text style={{ fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, marginBottom: SPACING[4] }}>
                {formatCurrency(unpaidAmount)}
              </Text>

              {/* QRIS Image if available */}
              {pakKasirResult?.qrisUrl ? (
                <View style={styles.qrisBox}>
                  <Image
                    source={{ uri: pakKasirResult.qrisUrl }}
                    style={{ width: 220, height: 220 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: SPACING[2] }}>
                    Scan menggunakan BCA, GoPay, OVO, atau DANA
                  </Text>
                </View>
              ) : null}

              {/* Virtual Account Number if available */}
              {pakKasirResult?.vaNumber ? (
                <View style={styles.vaBox}>
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary }}>Nomor Virtual Account:</Text>
                  <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginVertical: 4 }}>
                    {pakKasirResult.vaNumber}
                  </Text>
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.primary }}>
                    Salin & bayar melalui m-Banking / ATM Anda
                  </Text>
                </View>
              ) : null}

              {/* Status polling note */}
              <View style={styles.statusBox}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textPrimary }}>
                  Sistem mengecek status pembayaran secara otomatis via Webhook...
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', marginTop: SPACING[4], gap: SPACING[3] }}>
                {pakKasirResult?.paymentUrl && (
                  <TouchableOpacity
                    style={styles.openUrlBtn}
                    onPress={() => Linking.openURL(pakKasirResult.paymentUrl)}
                  >
                    <Ionicons name="open-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.openUrlBtnText}>Buka Checkout di Browser</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.checkStatusBtn}
                  onPress={handleCheckStatus}
                  disabled={isCheckingStatus}
                >
                  {isCheckingStatus ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.checkStatusBtnText}>Cek Status Sekarang</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[14],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: { marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  amountBanner: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING[8],
    paddingTop: SPACING[2],
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
  },
  amountLabel: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.7)' },
  amountValue: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginVertical: SPACING[2],
  },
  amountNote: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.6)' },
  content: {
    marginTop: -SPACING[4],
    padding: SPACING[4],
    paddingTop: SPACING[6],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[4],
  },
  methodContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING[3],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    gap: SPACING[3],
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodHeaderSelected: { backgroundColor: COLORS.primarySurface },
  methodName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  methodNameSelected: { color: COLORS.primary },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: COLORS.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
  },
  optionChip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.grey100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionChipSelected: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  optionTextSelected: { color: COLORS.primary },
  demoNote: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginTop: SPACING[4],
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  demoNoteTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  demoNoteText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    padding: SPACING[4],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.xl,
  },
  payBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[4],
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING[4],
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
    paddingBottom: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  qrisBox: {
    alignItems: 'center',
    backgroundColor: COLORS.grey50,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING[4],
  },
  vaBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING[4],
    width: '100%',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
  },
  openUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  openUrlBtnText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  checkStatusBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING[3.5],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  checkStatusBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default PaymentScreen;
