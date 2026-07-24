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
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

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
import { useTranslation } from 'react-i18next';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);


const PaymentScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const initialInvoice = route.params?.invoice;

  // Re-build PAYMENT_METHODS based on translations
  const PAYMENT_METHODS = [
    {
      id: 'xendit_va',
      name: t('paymentScreen.methodVA', 'Transfer Bank (Virtual Account)'),
      icon: 'business',
      options: ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'Permata', 'CIMB Niaga'],
      isAuto: true,
    },
    {
      id: 'xendit_ewallet',
      name: t('paymentScreen.methodEwallet', 'E-Wallets'),
      icon: 'wallet',
      options: ['OVO', 'DANA', 'ShopeePay', 'LinkAja'],
      isAuto: true,
    },
    {
      id: 'xendit_qris',
      name: t('paymentScreen.methodQris', 'QR Code (QRIS)'),
      icon: 'qr-code',
      options: ['Scan QRIS (M-Banking & E-Wallet)'],
      isAuto: true,
    },
    {
      id: 'xendit_retail',
      name: t('paymentScreen.methodRetail', 'Retail Outlets'),
      icon: 'cart',
      options: ['Alfamart', 'Indomaret'],
      isAuto: true,
    },
  ];

  const [invoice, setInvoice] = useState(initialInvoice);
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0]);
  const [selectedOption, setSelectedOption] = useState(PAYMENT_METHODS[0]?.options[0]);
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
  const [isFinalizing, setIsFinalizing] = useState(false);

  // ── Logika DP 50% & Cicilan ──
  const totalAmount = parseFloat(invoice?.total_amount ?? 0);
  const paidAmount = parseFloat(invoice?.paid_amount ?? 0);
  const remainingDebt = Math.max(totalAmount - paidAmount, 0);
  const isFirstPayment = paidAmount === 0;
  const minimumDP = Math.ceil(totalAmount * 0.5);
  const paymentProgress = totalAmount > 0 ? paidAmount / totalAmount : 0;

  // State untuk nominal cicilan custom (setelah DP pertama)
  const [customAmountText, setCustomAmountText] = useState('');
  
  // State untuk pilihan pembayaran pertama (DP atau Lunas)
  const [firstPaymentType, setFirstPaymentType] = useState('dp'); // 'dp' atau 'full'

  // Tentukan nominal yang akan dibayar
  const getPayAmount = () => {
    if (isFirstPayment) {
      return firstPaymentType === 'dp' ? minimumDP : totalAmount;
    }
    if (customAmountText) {
      const parsed = parseInt(customAmountText.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) return Math.min(parsed, remainingDebt);
    }
    return remainingDebt; // default = bayar sisa penuh
  };
  const unpaidAmount = getPayAmount();


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
      // Cek status langsung saat screen refocus
      checkStatusNow();

      // Saat user kembali dari browser Xendit, realtime subscription mungkin terputus.
      // Poll beberapa kali untuk memastikan status ter-update.
      const pollInterval = setInterval(() => {
        checkStatusNow();
      }, 3000); // Cek setiap 3 detik

      // Berhenti polling setelah 30 detik atau saat screen kehilangan fokus
      const stopTimeout = setTimeout(() => clearInterval(pollInterval), 30000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(stopTimeout);
      };
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
          t('paymentScreen.statusPaid', '🎉 Pembayaran Terverifikasi!'),
          t('paymentScreen.paidDesc', 'Tagihan kos Anda telah berhasil dibayar lunas via Xendit secara otomatis.'),
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
      Alert.alert(t('paymentScreen.alreadyPaidAlertTitle', 'Sudah Lunas'), t('paymentScreen.alreadyPaidAlertMsg', 'Tagihan ini telah dibayar lunas.'));
      return;
    }

    if (!selectedMethod) {
      Alert.alert(t('paymentScreen.selectMethodAlertTitle', 'Pilih Metode'), t('paymentScreen.selectMethodAlertMsg', 'Silakan pilih metode pembayaran terlebih dahulu'));
      return;
    }

    if (selectedMethod.isAuto) {
      // Proses pembayaran otomatis melalui Xendit Checkout
      Alert.alert(
        t('paymentScreen.xenditAutoAlertTitle', 'Pembayaran Otomatis Xendit'),
        t('paymentScreen.xenditAutoAlertMsg', 'Buka halaman pembayaran resmi Xendit senilai {{amount}}? Anda dapat memilih metode QRIS, Virtual Account, atau E-Wallet di sana. Status tagihan akan lunas otomatis setelah Anda membayar.', { amount: formatCurrency(unpaidAmount) }),
        [
          { text: t('paymentScreen.cancel', 'Batal'), style: 'cancel' },
          {
            text: t('paymentScreen.continuePay', 'Lanjutkan Bayar'),
            onPress: async () => {
              setIsLoading(true);
              
              // Batasi metode di WebView Xendit sesuai pilihan pengguna
              let paymentMethods = null;
              if (selectedMethod.id === 'xendit_va') paymentMethods = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'BSI', 'PERMATA', 'CIMB'];
              else if (selectedMethod.id === 'xendit_ewallet') paymentMethods = ['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'];
              else if (selectedMethod.id === 'xendit_qris') paymentMethods = ['QRIS'];
              else if (selectedMethod.id === 'xendit_retail') paymentMethods = ['ALFAMART', 'INDOMARET'];

              const result = await createXenditCheckout(invoice.id, paymentMethods, unpaidAmount);
              setIsLoading(false);

              if (result.isAlreadyPaid) {
                setIsInvoicePaid(true);
                setInvoice((prev) => ({ ...prev, status: 'paid', paid_amount: prev?.total_amount }));
                Alert.alert(
                  t('paymentScreen.xenditSuccessTitle', '🎉 Tagihan Sudah Lunas!'),
                  result.error || t('paymentScreen.xenditSuccessMsg', 'Sistem mendeteksi bahwa tagihan ini baru saja diverifikasi lunas.'),
                  [{ text: 'OK', onPress: () => navigation.popToTop() }]
                );
                return;
              }

              if (!result.success || !result.invoiceUrl) {
                Alert.alert(
                  t('paymentScreen.xenditErrorTitle', 'Gagal Membangun Transaksi Xendit'),
                  result.error || t('paymentScreen.xenditErrorMsg', 'Terjadi kesalahan saat menghubungi server Xendit. Pastikan koneksi internet lancar.')
                );
                return;
              }

              setXenditResult(result);
              // Langsung buka link checkout resmi Xendit di WebView (In-App)
            },
          },
        ]
      );
      return;
    }

    // Proses pembayaran manual
    Alert.alert(
      t('paymentScreen.manualAlertTitle', 'Konfirmasi Pembayaran Manual'),
      t('paymentScreen.manualAlertMsg', 'Bayar {{amount}} via {{method}}?', { amount: formatCurrency(unpaidAmount), method: selectedOption ?? selectedMethod.name }),
      [
        { text: t('paymentScreen.cancel', 'Batal'), style: 'cancel' },
        {
          text: t('paymentScreen.confirm', 'Konfirmasi'),
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
              Alert.alert(t('paymentScreen.manualErrorTitle', 'Gagal'), t('paymentScreen.manualErrorMsg', 'Pembayaran manual gagal diproses, coba lagi.'));
              return;
            }

            Alert.alert(
              t('paymentScreen.manualSuccessTitle', 'Pembayaran Dicatat!'),
              t('paymentScreen.manualSuccessMsg', 'Pembayaran manual Anda sedang menunggu konfirmasi dari pemilik kos.'),
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
        <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }, { paddingTop: insets.top + SPACING[4] }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
              
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('paymentScreen.headerTitle', 'Pembayaran Tagihan')}</Text>
        </View>

        {/* Amount Banner */}
        <View style={[styles.amountBanner, isInvoicePaid && { backgroundColor: COLORS.success }]}>
          <Text style={styles.amountLabel}>
            {isInvoicePaid ? t('paymentScreen.statusPaid', '🎉 Status Tagihan') : t('paymentScreen.totalToPay', 'Total yang Harus Dibayar')}
          </Text>
          <Text style={styles.amountValue}>
            {isInvoicePaid ? t('paymentScreen.fullyPaid', 'TELAH LUNAS') : formatCurrency(unpaidAmount)}
          </Text>
          <Text style={styles.amountNote}>Invoice #{invoice?.invoice_number || invoice?.id?.slice(0, 8)}</Text>

          {/* Progress Bar */}
          {!isInvoicePaid && totalAmount > 0 && (
            <View style={{ width: '100%', marginTop: 12 }}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(paymentProgress * 100, 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {t('paymentScreen.progressInfo', 'Terbayar {{paid}} dari {{total}} (Sisa {{remaining}})', {
                  paid: formatCurrency(paidAmount),
                  total: formatCurrency(totalAmount),
                  remaining: formatCurrency(remainingDebt),
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Jika Sudah Lunas */}
        {isInvoicePaid ? (
          <View style={styles.paidContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            <Text style={styles.paidTitle}>{t('paymentScreen.paidTitle', 'Tagihan Ini Sudah Terbayar Lunas')}</Text>
            <Text style={styles.paidDesc}>
              {t('paymentScreen.paidDesc', 'Bukti pembayaran resmi telah dicatat di sistem KosanKu dan dikirim ke notifikasi Anda serta pemilik kos.')}
            </Text>
            <TouchableOpacity style={styles.paidBtn} onPress={() => navigation.popToTop()}>
              <Text style={styles.paidBtnText}>{t('paymentScreen.backToHome', 'Kembali ke Beranda Tagihan')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Payment Methods */
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>{t('paymentScreen.selectMethod', 'Pilih Metode Pembayaran')}</Text>
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
                          {t('paymentScreen.autoVerification', '⚡ Verifikasi Otomatis 24 Jam')}
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
                <Text style={styles.demoNoteTitle}>{t('paymentScreen.secureAutoPayment', 'Pembayaran Aman & Otomatis (Xendit)')}</Text>
              </View>
              <Text style={styles.demoNoteText}>
                {t('paymentScreen.autoPaymentDesc', 'Dengan memilih metode pembayaran otomatis Xendit, status tagihan Anda akan berubah menjadi Lunas instan tepat setelah transfer selesai diverifikasi oleh server Xendit.')}
              </Text>
            </View>

            {/* Form Cicilan Custom (hanya muncul setelah DP pertama) */}
            {!isFirstPayment && remainingDebt > 0 && (
              <View style={styles.installmentBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] }}>
                  <Ionicons name="calculator" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.installmentTitle}>{t('paymentScreen.installmentTitle', 'Nominal Cicilan')}</Text>
                </View>
                <Text style={styles.installmentDesc}>
                  {t('paymentScreen.installmentDesc', 'Masukkan nominal yang ingin dibayarkan. Maksimal: {{max}}', { max: formatCurrency(remainingDebt) })}
                </Text>
                <View style={styles.installmentInputRow}>
                  <Text style={styles.installmentPrefix}>Rp</Text>
                  <TextInput
                    style={styles.installmentInput}
                    placeholder={remainingDebt.toLocaleString('id-ID')}
                    placeholderTextColor={COLORS.textTertiary}
                    value={customAmountText}
                    onChangeText={(text) => {
                      // Hanya terima angka
                      const digits = text.replace(/\D/g, '');
                      setCustomAmountText(digits);
                    }}
                    keyboardType="numeric"
                  />
                </View>
                {customAmountText && parseInt(customAmountText.replace(/\D/g, ''), 10) > remainingDebt && (
                  <Text style={styles.installmentError}>
                    {t('paymentScreen.installmentOverpay', 'Nominal melebihi sisa hutang!')}
                  </Text>
                )}
              </View>
            )}

            <View style={{ height: 180 }} />
          </View>
        )}
      </ScrollView>

      {/* Pay Button jika belum lunas */}
      {!isInvoicePaid && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + SPACING[2], SPACING[6]) }]}>
          {isFirstPayment && (
            <View style={{ marginBottom: SPACING[3] }}>
              <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginBottom: SPACING[2], fontSize: FONT_SIZE.sm }}>
                {t('paymentScreen.firstPaymentChoice', 'Pilih nominal pembayaran pertama Anda:')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING[2] }}>
                <TouchableOpacity
                  style={[
                    { flex: 1, padding: SPACING[2], borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
                    firstPaymentType === 'dp' && { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` }
                  ]}
                  onPress={() => setFirstPaymentType('dp')}
                >
                  <Text style={[{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold }, firstPaymentType === 'dp' ? { color: COLORS.primary } : { color: COLORS.textPrimary }]}>
                    DP 50%
                  </Text>
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 }}>
                    {formatCurrency(minimumDP)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    { flex: 1, padding: SPACING[2], borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
                    firstPaymentType === 'full' && { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` }
                  ]}
                  onPress={() => setFirstPaymentType('full')}
                >
                  <Text style={[{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold }, firstPaymentType === 'full' ? { color: COLORS.primary } : { color: COLORS.textPrimary }]}>
                    Bayar Lunas
                  </Text>
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 }}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.payBtn, isLoading && styles.payBtnDisabled, (customAmountText && parseInt(customAmountText.replace(/\D/g, ''), 10) > remainingDebt) && styles.payBtnDisabled]}
            onPress={handlePay}
            disabled={isLoading || (customAmountText && parseInt(customAmountText.replace(/\D/g, ''), 10) > remainingDebt)}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.payBtnText}>
                {t('paymentScreen.payAmount', 'Bayar {{amount}}', { amount: formatCurrency(unpaidAmount) })}
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="lock-closed" size={16} color={COLORS.success} style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>{t('paymentScreen.modalTitle', 'Pembayaran Xendit')}</Text>
              </View>
              <TouchableOpacity onPress={() => setXenditResult(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {xenditResult?.invoiceUrl ? (
              <>
                <WebView 
                source={{ uri: xenditResult.invoiceUrl }} 
                style={{ flex: 1, width: '100%' }}
                startInLoadingState={true}
                originWhitelist={['*']}
                onShouldStartLoadWithRequest={(request) => {
                  const { url } = request;
                  
                  // Deteksi redirect sukses dari Xendit (custom scheme ATAU legacy https)
                  if (
                    url.startsWith('kosanku://payment/success') ||
                    url.includes('app.kosanku.com/payment/success')
                  ) {
                    setIsFinalizing(true);
                    setTimeout(async () => {
                      setXenditResult(null);
                      setIsFinalizing(false);
                      // Cek status real dari DB, jangan langsung set paid
                      await checkStatusNow();
                      Alert.alert(
                        t('paymentScreen.paymentProcessed', '✅ Pembayaran Diproses!'),
                        t('paymentScreen.paymentProcessedDesc', 'Pembayaran Anda telah diterima. Status tagihan akan diperbarui secara otomatis.'),
                        [{ text: 'OK', onPress: () => navigation.popToTop() }]
                      );
                    }, 300);
                    return false;
                  }
                  
                  // Deteksi redirect gagal dari Xendit
                  if (
                    url.startsWith('kosanku://payment/failed') ||
                    url.includes('app.kosanku.com/payment/failed')
                  ) {
                    setIsFinalizing(true);
                    setTimeout(() => {
                      setXenditResult(null);
                      setIsFinalizing(false);
                      Alert.alert(
                        t('paymentScreen.manualErrorTitle', 'Gagal'),
                        t('paymentScreen.manualErrorMsg', 'Pembayaran gagal diproses, coba lagi.')
                      );
                    }, 300);
                    return false;
                  }

                  // Handle E-Wallet Deep Links (OVO, Gojek, Dana, dll)
                  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
                    Linking.openURL(url).catch(() => {
                      Alert.alert(
                        t('paymentScreen.errorAppNotInstalled', 'Aplikasi Tidak Ditemukan'), 
                        t('paymentScreen.errorAppNotInstalledDesc', 'Pastikan aplikasi e-wallet tersebut terinstal di perangkat Anda.')
                      );
                    });
                    return false;
                  }
                  return true;
                }}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  const errorUrl = nativeEvent.url || '';
                  const isKosankuRedirect =
                    errorUrl.startsWith('kosanku://') ||
                    errorUrl.includes('app.kosanku.com/payment/');
                  
                  if (
                    nativeEvent.description?.includes('ERR_NAME_NOT_RESOLVED') &&
                    isKosankuRedirect
                  ) {
                    const isSuccess =
                      errorUrl.startsWith('kosanku://payment/success') ||
                      errorUrl.includes('app.kosanku.com/payment/success');
                    setIsFinalizing(true);
                    setTimeout(async () => {
                      setXenditResult(null);
                      setIsFinalizing(false);
                      if (isSuccess) {
                        // Cek status real dari DB, jangan langsung set paid
                        await checkStatusNow();
                        Alert.alert(
                          t('paymentScreen.paymentProcessed', '✅ Pembayaran Diproses!'),
                          t('paymentScreen.paymentProcessedDesc', 'Pembayaran Anda telah diterima. Status tagihan akan diperbarui secara otomatis.'),
                          [{ text: 'OK', onPress: () => navigation.popToTop() }]
                        );
                      } else {
                        Alert.alert(
                          t('paymentScreen.manualErrorTitle', 'Gagal'),
                          t('paymentScreen.manualErrorMsg', 'Pembayaran gagal diproses, coba lagi.')
                        );
                      }
                    }, 300);
                  }
                }}
                onNavigationStateChange={(navState) => {
                  const { url } = navState;
                  const isSuccessUrl =
                    url.startsWith('kosanku://payment/success') ||
                    url.includes('app.kosanku.com/payment/success');
                  const isFailedUrl =
                    url.startsWith('kosanku://payment/failed') ||
                    url.includes('app.kosanku.com/payment/failed');
                  
                  // Fallback — jika lolos dari onShouldStartLoadWithRequest
                  if (isSuccessUrl && !isFinalizing) {
                    setXenditResult(null);
                    checkStatusNow(); // Cek status real dari DB
                  } else if (isFailedUrl && !isFinalizing) {
                    setXenditResult(null);
                  }
                }}
                renderLoading={() => (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Memuat halaman pembayaran...</Text>
                  </View>
                )}
              />
              {isFinalizing && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)' }]}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ marginTop: 12, color: COLORS.primary, fontWeight: 'bold' }}>Memverifikasi pembayaran...</Text>
                </View>
              )}
              </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
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
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    marginTop: 60,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING[4],
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING[3],
    paddingHorizontal: SPACING[4],
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
  // ── Progress Bar ──
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: 6,
  },
  // ── Cicilan Form ──
  installmentBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    marginTop: SPACING[3],
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOW.sm,
  },
  installmentTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  installmentDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING[3],
    lineHeight: 18,
  },
  installmentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    backgroundColor: COLORS.grey50,
  },
  installmentPrefix: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    marginRight: SPACING[2],
  },
  installmentInput: {
    flex: 1,
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  installmentError: {
    color: COLORS.error,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    marginTop: SPACING[1],
  },
});

export default PaymentScreen;
