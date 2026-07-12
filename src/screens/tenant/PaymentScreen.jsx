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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { recordManualPayment } from '../../services/invoiceService';
import useAuthStore from '../../store/authStore';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    name: 'Transfer Bank',
    icon: 'business',
    options: ['BCA', 'BRI', 'BNI', 'Mandiri'],
  },
  {
    id: 'e_wallet',
    name: 'Dompet Digital',
    icon: 'phone-portrait',
    options: ['GoPay', 'OVO', 'DANA', 'ShopeePay'],
  },
  {
    id: 'cash',
    name: 'Tunai',
    icon: 'cash',
    options: ['Bayar Langsung ke Pemilik'],
  },
];

const PaymentScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const invoice = route.params?.invoice;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const unpaidAmount =
    parseFloat(invoice?.total_amount ?? 0) - parseFloat(invoice?.paid_amount ?? 0);

  const handlePay = () => {
    if (!selectedMethod) {
      Alert.alert('Pilih Metode', 'Silakan pilih metode pembayaran terlebih dahulu');
      return;
    }

    Alert.alert(
      'Konfirmasi Pembayaran',
      `Bayar ${formatCurrency(unpaidAmount)} via ${selectedOption ?? selectedMethod.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Konfirmasi',
          onPress: async () => {
            setIsLoading(true);

            // Dalam demo, langsung catat sebagai success
            const { error } = await recordManualPayment({
              invoice_id: invoice.id,
              tenant_id: currentUser.id,
              amount: unpaidAmount,
              payment_method: selectedMethod.id,
              payment_channel: selectedOption ?? selectedMethod.name,
            });

            setIsLoading(false);

            if (error) {
              Alert.alert('Gagal', 'Pembayaran gagal diproses, coba lagi.');
              return;
            }

            Alert.alert(
              'Pembayaran Berhasil!',
              'Tagihan Anda berhasil dibayarkan.',
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText}>Kembali</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pembayaran</Text>
        </View>

        {/* Amount Banner */}
        <View style={styles.amountBanner}>
          <Text style={styles.amountLabel}>Total Pembayaran</Text>
          <Text style={styles.amountValue}>{formatCurrency(unpaidAmount)}</Text>
          <Text style={styles.amountNote}>Invoice #{invoice?.invoice_number}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          {PAYMENT_METHODS.map((method) => {
            const isMethodSelected = selectedMethod?.id === method.id;
            return (
              <View key={method.id} style={styles.methodContainer}>
                {/* Method Header */}
                <TouchableOpacity
                  style={[styles.methodHeader, isMethodSelected && styles.methodHeaderSelected]}
                  onPress={() => {
                    setSelectedMethod(method);
                    setSelectedOption(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={method.icon} size={24} color={isMethodSelected ? COLORS.primary : COLORS.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={[styles.methodName, isMethodSelected && styles.methodNameSelected]}>
                    {method.name}
                  </Text>
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

          {/* Demo Note */}
          <View style={styles.demoNote}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[1] }}>
              <Ionicons name="information-circle" size={16} color={COLORS.warning} style={{ marginRight: 4 }} />
              <Text style={[styles.demoNoteTitle, { marginBottom: 0 }]}>Mode Demo</Text>
            </View>
            <Text style={styles.demoNoteText}>
              Pembayaran ini adalah simulasi. Dalam versi produksi, akan terintegrasi dengan payment gateway seperti Midtrans.
            </Text>
          </View>

          <View style={{ height: 100 }} />
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
    ...SHADOW.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    gap: SPACING[3],
  },
  methodHeaderSelected: { backgroundColor: COLORS.primarySurface },
  methodName: {
    flex: 1,
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
    backgroundColor: COLORS.warningLight,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginTop: SPACING[4],
  },
  demoNoteTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.warning,
    marginBottom: SPACING[1],
  },
  demoNoteText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING[4],
    paddingBottom: SPACING[8],
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
});

export default PaymentScreen;
