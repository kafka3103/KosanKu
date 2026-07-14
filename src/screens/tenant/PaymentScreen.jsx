/**
 * screens/tenant/PaymentScreen.jsx
 * Layar pemilihan metode pembayaran tagihan untuk penghuni (Tenant)
 * Menggunakan Xendit (otomatis 24 Jam) dan dilengkapi sinkronisasi status Real-Time super cepat.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { recordManualPayment } from '../../services/invoiceService';
import {
  createXenditCheckout,
  subscribeToInvoiceRealtime,
  fetchInvoiceLatestStatus,
} from '../../services/xenditService';
import useAuthStore from '../../store/authStore';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const PAYMENT_METHODS = [
  {
    id: 'xendit_auto',
    name: 'Pembayaran Otomatis Xendit',
    icon: 'qr-code',
    options: ['QRIS (GoPay, OVO, DANA, BCA)', 'Virtual Account (BCA, BRI, BNI, Mandiri)', 'E-Wallet / Retail Outlet'],
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
  const { currentUser } = useAuthStore();
  const initialInvoice = route.params?.invoice;

  // State tagihan lokal yang selalu ter-update secara real-time & cepat
  const [invoice, setInvoice] = useState(initialInvoice);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInvoicePaid, setIsInvoicePaid] = useState(initialInvoice?.status === 'paid');

  // Simpan invoiceId awal sebagai ref — TIDAK berubah meski invoice state di-update
  // Ini mencegah useEffect subscription ter-trigger ulang setiap kali status berubah
  const invoiceIdRef = React.useRef(initialInvoice?.id);
  const isMountedRef = React.useRef(true);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Xendit automated payment result state
  const [xenditResult, setXenditResult] = useState(null);

  const unpaidAmount =
    parseFloat(invoice?.total_amount ?? 0) - parseFloat(invoice?.paid_amount ?? 0);


  // 1. Cek langsung status tagihan di database saat layar dibuka / fokus
  const checkStatusNow = useCallback(async () => {
    if (!invoice?.id) return;
    const res = await fetchInvoiceLatestStatus(invoice.id);
    if (res.success && res.invoice) {
      setInvoice((prev) => ({ ...prev, ...res.invoice }));
      if (res.invoice.status === 'paid') {
        setIsInvoicePaid(true);
        setXenditResult(null);
      }
    }
  }, [invoice?.id]);

  useFocusEffect(
    useCallback(() => {
      checkStatusNow();
    }, [checkStatusNow])
  );

  // 2. Dengarkan perubahan status invoice secara Real-Time via Supabase
  // Dependency array KOSONG [] → subscription hanya dibuat SEKALI saat mount.
  // invoiceIdRef.current stabil (tidak berubah), sehingga tidak memicu re-subscribe
  // saat invoice state di-update oleh callback realtime itu sendiri.
  useEffect(() => {
    const invoiceId = invoiceIdRef.current;
    if (!invoiceId) return;

    const subscription = subscribeToInvoiceRealtime(invoiceId, (updatedInvoice) => {
      if (!isMountedRef.current) return;
      setInvoice((prev) => ({ ...prev, ...updatedInvoice }));
      if (updatedInvoice.status === 'paid') {
        setIsInvoicePaid(true);
        setXenditResult(null);
        Alert.alert(
          '🎉 Pembayaran Terverifikasi!',
          'Tagihan kos Anda telah berhasil dibayar lunas via Xendit secara otomatis.',
          [{ text: 'OK', onPress: () => navigation.popToTop() }]
        );
      }
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] = hanya mount/unmount, bukan setiap invoice state berubah


  const handlePay = () => {
    if (isInvoicePaid || invoice?.status === 'paid') {
      Alert.alert('Sudah Lunas', 'Tagihan ini telah dibayar lunas.');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Pilih Metode', 'Silakan pilih metode pembayaran terlebih dahulu');
      return;
    }

    if (selectedMethod.isAuto) {
      // Proses pembayaran otomatis melalui Xendit Checkout
      Alert.alert(
        'Pembayaran Otomatis Xendit',
        `Buka halaman pembayaran resmi Xendit senilai ${formatCurrency(unpaidAmount)}? Anda dapat memilih metode QRIS, Virtual Account, atau E-Wallet di sana. Status tagihan akan lunas otomatis setelah Anda membayar.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Lanjutkan Bayar',
            onPress: async () => {
              setIsLoading(true);
              const result = await createXenditCheckout(invoice.id);
              setIsLoading(false);

              if (result.isAlreadyPaid) {
                setIsInvoicePaid(true);
                setInvoice((prev) => ({ ...prev, status: 'paid', paid_amount: prev?.total_amount }));
                Alert.alert(
                  '🎉 Tagihan Sudah Lunas!',
                  result.error || 'Sistem mendeteksi bahwa tagihan ini baru saja diverifikasi lunas.',
                  [{ text: 'OK', onPress: () => navigation.popToTop() }]
                );
                return;
              }

              if (!result.success || !result.invoiceUrl) {
                Alert.alert(
                  'Gagal Membangun Transaksi Xendit',
                  result.error || 'Terjadi kesalahan saat menghubungi server Xendit. Pastikan koneksi internet lancar.'
                );
                return;
              }

              setXenditResult(result);
              // Langsung buka link checkout resmi Xendit di Browser/WebView
              Linking.openURL(result.invoiceUrl);
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING[4] }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText}>Kembali</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pembayaran Tagihan</Text>
        </View>

        {/* Amount Banner */}
        <View style={[styles.amountBanner, isInvoicePaid && { backgroundColor: COLORS.success }]}>
          <Text style={styles.amountLabel}>
            {isInvoicePaid ? '🎉 Status Tagihan' : 'Total yang Harus Dibayar'}
          </Text>
          <Text style={styles.amountValue}>
            {isInvoicePaid ? 'TELAH LUNAS' : formatCurrency(unpaidAmount)}
          </Text>
          <Text style={styles.amountNote}>Invoice #{invoice?.invoice_number || invoice?.id?.slice(0, 8)}</Text>
        </View>

        {/* Jika Sudah Lunas */}
        {isInvoicePaid ? (
          <View style={styles.paidContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            <Text style={styles.paidTitle}>Tagihan Ini Sudah Terbayar Lunas</Text>
            <Text style={styles.paidDesc}>
              Bukti pembayaran resmi telah dicatat di sistem KosanKu dan dikirim ke notifikasi Anda serta pemilik kos.
            </Text>
            <TouchableOpacity style={styles.paidBtn} onPress={() => navigation.popToTop()}>
              <Text style={styles.paidBtnText}>Kembali ke Beranda Tagihan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Payment Methods */
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
                <Text style={styles.demoNoteTitle}>Pembayaran Aman & Otomatis (Xendit)</Text>
              </View>
              <Text style={styles.demoNoteText}>
                Dengan memilih metode pembayaran otomatis Xendit, status tagihan Anda akan berubah menjadi Lunas instan tepat setelah transfer selesai diverifikasi oleh server Xendit.
              </Text>
            </View>

            <View style={{ height: 180 }} />
          </View>
        )}
      </ScrollView>

      {/* Pay Button jika belum lunas */}
      {!isInvoicePaid && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING[4] }]}>
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
      )}

      {/* Xendit Payment Modal */}
      <Modal
        visible={!!xenditResult}
        transparent
        animationType="slide"
        onRequestClose={() => setXenditResult(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pembayaran Xendit</Text>
              <TouchableOpacity onPress={() => setXenditResult(null)}>
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

              <View style={styles.vaBox}>
                <Ionicons name="lock-closed" size={28} color={COLORS.primary} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, textAlign: 'center' }}>
                  Halaman Checkout Xendit Telah Dibuka
                </Text>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }}>
                  Silakan selesaikan pembayaran Anda di browser melalui QRIS, Virtual Account, atau E-Wallet pilihan Anda.
                </Text>
              </View>

              {/* Status polling note */}
              <View style={styles.statusBox}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textPrimary }}>
                  Sistem memantau status pembayaran Anda dari Xendit secara Real-Time... Begitu Anda selesai membayar, halaman ini otomatis menutup dan tagihan lunas!
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', marginTop: SPACING[4], gap: SPACING[3] }}>
                {xenditResult?.invoiceUrl && (
                  <TouchableOpacity
                    style={styles.checkStatusBtn}
                    onPress={() => Linking.openURL(xenditResult.invoiceUrl)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="open-outline" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
                      <Text style={styles.checkStatusBtnText}>Buka Ulang Checkout Xendit</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.openUrlBtn}
                  onPress={() => setXenditResult(null)}
                >
                  <Text style={styles.openUrlBtnText}>Tutup / Selesai</Text>
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
    paddingTop: SPACING[5],
    paddingBottom: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  backBtn: { marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.sm },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },

  amountBanner: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    alignItems: 'center',
  },
  amountLabel: { color: COLORS.primaryLight, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { color: COLORS.white, fontSize: FONT_SIZE['3xl'], fontWeight: FONT_WEIGHT.bold, marginVertical: 2 },
  amountNote: { color: `${COLORS.white}80`, fontSize: FONT_SIZE.xs },

  content: { padding: SPACING[4] },
  sectionTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING[3] },

  methodContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    gap: SPACING[3],
    borderRadius: BORDER_RADIUS.lg, // Ensure rounded corners since overflow hidden is removed
  },
  methodHeaderSelected: { backgroundColor: `${COLORS.primary}05` },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.textTertiary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary },
  methodNameSelected: { fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: COLORS.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },

  optionsContainer: {
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[3],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  optionChip: {
    paddingVertical: SPACING[1.5],
    paddingHorizontal: SPACING[3],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  optionText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  optionTextSelected: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold },

  demoNote: {
    backgroundColor: `${COLORS.primary}10`,
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: SPACING[2],
  },
  demoNoteTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryDark },
  demoNoteText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },

  paidContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[6],
    margin: SPACING[4],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOW.md,
  },
  paidTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING[3],
    textAlign: 'center',
  },
  paidDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING[2],
    marginBottom: SPACING[4],
    lineHeight: 18,
  },
  paidBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: BORDER_RADIUS.md,
  },
  paidBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingTop: SPACING[3],
    paddingBottom: SPACING[6],
    paddingHorizontal: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.lg,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING[3.5],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING[4],
    paddingBottom: SPACING[6],
    paddingHorizontal: SPACING[4],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  vaBox: {
    backgroundColor: `${COLORS.primary}08`,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
    marginBottom: SPACING[3],
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
  },
  checkStatusBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING[3.5],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  checkStatusBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm },
  openUrlBtn: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  openUrlBtnText: { color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONT_SIZE.sm },
});

export default PaymentScreen;
