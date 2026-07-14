/**
 * screens/owner/ContractScreen.jsx
 * Daftar dan detail kontrak owner beserta manajemen fasilitas opsional
 */

import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { id as idLocale } from 'date-fns/locale';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import {
  getOwnerContracts,
  endContract,
  addContractFacility,
  updateContractFacilityStatus,
} from '../../services/invoiceService';
import { getFacilityMaster } from '../../services/propertyService';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const STATUS_CONFIG = {
  active: { color: COLORS.success, bg: COLORS.successLight, label: 'Aktif', icon: 'checkmark-circle' },
  completed: { color: COLORS.grey500, bg: COLORS.grey100, label: 'Selesai', icon: 'flag' },
  terminated: { color: COLORS.error, bg: COLORS.errorLight, label: 'Dihentikan', icon: 'stop-circle' },
  early_exit: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Keluar Lebih Awal', icon: 'flash' },
};

const ContractCard = ({ contract, onTerminate, onAddFacility, onRemoveFacility }) => {
  const insets = useSafeAreaInsets();
  const status = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.completed;
  const tenant = contract.users;
  const room = contract.rooms;
  const property = room?.properties;
  const activeFacilities = (contract.contract_facilities || []).filter((f) => f.status === 'active');

  return (
    <View style={[styles.card, contract.status === 'active' && styles.cardActive]}>
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Ionicons name={status.icon} size={12} color={status.color} style={{ marginRight: 4 }} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{tenant?.full_name?.[0]?.toUpperCase() ?? 'T'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.tenantName}>{tenant?.full_name}</Text>
          <Text style={styles.roomInfo}>{property?.name} · Kamar {room?.room_number}</Text>
        </View>
      </View>

      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Mulai</Text>
          <Text style={styles.dateValue}>{formatDate(contract.start_date)}</Text>
        </View>
        <View style={styles.dateSep} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Selesai</Text>
          <Text style={styles.dateValue}>{formatDate(contract.end_date)}</Text>
        </View>
        <View style={styles.dateSep} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Sewa/Bulan</Text>
          <Text style={styles.dateValue}>{formatCurrency(contract.monthly_rate)}</Text>
        </View>
      </View>

      {/* Fasilitas Opsional Aktif */}
      {activeFacilities.length > 0 && (
        <View style={styles.facilitySection}>
          <Text style={styles.facilitySectionTitle}>Fasilitas Opsional Berjalan:</Text>
          {activeFacilities.map((cf) => (
            <View key={cf.id} style={styles.facilityItemRow}>
              <View style={styles.facilityItemLeft}>
                <Ionicons name="sparkles" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.facilityItemName}>
                  {cf.custom_facility_name || cf.facility_master?.name || 'Fasilitas Tambahan'}
                </Text>
              </View>
              <View style={styles.facilityItemRight}>
                <Text style={styles.facilityItemPrice}>{formatCurrency(cf.price_per_month)}/bln</Text>
                {contract.status === 'active' && (
                  <TouchableOpacity
                    style={styles.removeFacilityBtn}
                    onPress={() => onRemoveFacility(cf)}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {contract.status === 'active' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.addFacilityBtn}
            onPress={() => onAddFacility(contract)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addFacilityBtnText}>+ Fasilitas Opsional</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.terminateBtn}
            onPress={() => onTerminate(contract)}
            activeOpacity={0.7}
          >
            <Text style={styles.terminateBtnText}>Hentikan</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const ContractScreen = ({ navigation }) => {
  const { currentUser } = useAuthStore();
  const [contracts, setContracts] = useState([]);
  const [masterFacilities, setMasterFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active');

  // Modal Tambah Fasilitas Opsional state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [isCustomName, setIsCustomName] = useState(false);
  const [customName, setCustomName] = useState('');
  const [pricePerMonth, setPricePerMonth] = useState('');
  const [billingMode, setBillingMode] = useState('next_invoice');
  const [isSubmittingFacility, setIsSubmittingFacility] = useState(false);

  const loadContracts = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const [contractsRes, facilitiesRes] = await Promise.all([
      getOwnerContracts(currentUser.id),
      getFacilityMaster(),
    ]);
    if (!contractsRes.error && contractsRes.data) setContracts(contractsRes.data);
    if (!facilitiesRes.error && facilitiesRes.data) setMasterFacilities(facilitiesRes.data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(useCallback(() => { loadContracts(); }, [loadContracts]));

  const handleTerminate = (contract) => {
    Alert.alert(
      'Hentikan Kontrak',
      `Yakin ingin menghentikan kontrak untuk ${contract.users?.full_name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hentikan',
          style: 'destructive',
          onPress: async () => {
            const { error } = await endContract(contract.id, 'terminated', 'Dihentikan oleh pemilik');
            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              setContracts((prev) => prev.map((c) => c.id === contract.id ? { ...c, status: 'terminated' } : c));
            }
          },
        },
      ]
    );
  };

  const handleOpenAddFacilityModal = (contract) => {
    setSelectedContract(contract);
    setSelectedFacilityId(masterFacilities[0]?.id ?? null);
    setIsCustomName(false);
    setCustomName('');
    setPricePerMonth('');
    setBillingMode('next_invoice');
    setIsModalVisible(true);
  };

  const handleSaveFacility = async () => {
    if (!selectedContract) return;
    if (isCustomName && !customName.trim()) {
      Alert.alert('Perhatian', 'Nama fasilitas custom wajib diisi.');
      return;
    }
    if (!pricePerMonth || isNaN(parseFloat(pricePerMonth)) || parseFloat(pricePerMonth) < 0) {
      Alert.alert('Perhatian', 'Biaya per bulan wajib diisi dengan angka valid.');
      return;
    }

    setIsSubmittingFacility(true);
    const payload = {
      contractId: selectedContract.id,
      facilityId: isCustomName ? null : selectedFacilityId,
      customName: isCustomName ? customName.trim() : null,
      pricePerMonth: parseFloat(pricePerMonth),
      billingMode: billingMode,
    };

    const { data, error } = await addContractFacility(payload);
    setIsSubmittingFacility(false);

    if (error) {
      Alert.alert('Gagal Menambahkan', error.message);
    } else {
      setIsModalVisible(false);
      Alert.alert('Berhasil! 🎉', data?.message ?? 'Fasilitas opsional berhasil ditambahkan ke kontrak.', [
        { text: 'OK', onPress: () => loadContracts(true) },
      ]);
    }
  };

  const handleRemoveFacility = (cf) => {
    const name = cf.custom_facility_name || cf.facility_master?.name || 'Fasilitas ini';
    Alert.alert(
      'Hentikan Fasilitas',
      `Yakin ingin menghentikan langganan ${name} (Rp ${cf.price_per_month.toLocaleString('id-ID')}/bln)?\n\nPenghuni tidak akan dikenakan biaya fasilitas ini pada periode tagihan berikutnya.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hentikan',
          style: 'destructive',
          onPress: async () => {
            const { error } = await updateContractFacilityStatus(cf.id, 'inactive');
            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              loadContracts(true);
            }
          },
        },
      ]
    );
  };

  const filters = [
    { key: 'active', label: 'Aktif' },
    { key: 'completed', label: 'Selesai' },
    { key: 'terminated', label: 'Dihentikan' },
    { key: 'all', label: 'Semua' },
  ];

  const filteredContracts = activeFilter === 'all' ? contracts : contracts.filter((c) => c.status === activeFilter);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kontrak Sewa</Text>
        <Text style={styles.headerSubtitle}>{contracts.length} kontrak total</Text>
      </View>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredContracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadContracts(true); }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Tidak Ada Kontrak</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ContractCard
            contract={item}
            onTerminate={handleTerminate}
            onAddFacility={handleOpenAddFacilityModal}
            onRemoveFacility={handleRemoveFacility}
          />
        )}
      />

      {/* Modal Tambah Fasilitas Opsional */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ Fasilitas Opsional</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Penghuni: {selectedContract?.users?.full_name} · Kamar {selectedContract?.rooms?.room_number}
            </Text>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Gunakan Nama Custom</Text>
                <Switch
                  value={isCustomName}
                  onValueChange={(val) => setIsCustomName(val)}
                  trackColor={{ false: COLORS.grey200, true: COLORS.primaryLight }}
                  thumbColor={isCustomName ? COLORS.primary : COLORS.grey500}
                />
              </View>

              {isCustomName ? (
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Nama Fasilitas Custom</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Misal: Sewa AC Portabel / Parkir Mobil"
                    placeholderTextColor={COLORS.textTertiary}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>
              ) : (
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Pilih dari Master Fasilitas</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {masterFacilities.map((item) => {
                      const isSelected = selectedFacilityId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.chipItem, isSelected && styles.chipItemActive]}
                          onPress={() => setSelectedFacilityId(item.id)}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{item.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Biaya Tambahan Per Bulan (Rp)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Misal: 150000"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  value={pricePerMonth}
                  onChangeText={setPricePerMonth}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Metode Penyatuan Tagihan</Text>
                
                <TouchableOpacity
                  style={[styles.modeCard, billingMode === 'next_invoice' && styles.modeCardActive]}
                  onPress={() => setBillingMode('next_invoice')}
                  activeOpacity={0.8}
                >
                  <View style={styles.modeCardHeader}>
                    <Ionicons
                      name={billingMode === 'next_invoice' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={billingMode === 'next_invoice' ? COLORS.primary : COLORS.grey400}
                    />
                    <Text style={styles.modeCardTitle}>Disatukan dengan Tagihan Kos</Text>
                  </View>
                  <Text style={styles.modeCardDesc}>
                    Jika ada tagihan kos bulan ini yang belum dibayar, otomatis digabungkan sekarang. Jika sudah lunas, akan disatukan dengan uang kos bulan depan.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeCard, billingMode === 'bill_immediately' && styles.modeCardActive]}
                  onPress={() => setBillingMode('bill_immediately')}
                  activeOpacity={0.8}
                >
                  <View style={styles.modeCardHeader}>
                    <Ionicons
                      name={billingMode === 'bill_immediately' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={billingMode === 'bill_immediately' ? COLORS.primary : COLORS.grey400}
                    />
                    <Text style={styles.modeCardTitle}>Buat Tagihan Khusus Hari Ini</Text>
                  </View>
                  <Text style={styles.modeCardDesc}>
                    Langsung buat invoice baru hari ini khusus biaya fasilitas opsional ini dan kirim notifikasi pembayaran ke penghuni.
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
                disabled={isSubmittingFacility}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveFacility}
                disabled={isSubmittingFacility}
              >
                {isSubmittingFacility ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Fasilitas</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary,  paddingBottom: SPACING[5], paddingHorizontal: SPACING[5] },
  backBtn: { marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
  filterRow: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], gap: SPACING[2], borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterTab: { paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.grey100 },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold },
  list: { padding: SPACING[4], gap: SPACING[3], paddingBottom: 100 },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING[4], ...SHADOW.sm },
  cardActive: { borderLeftWidth: 3, borderLeftColor: COLORS.success },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: SPACING[3], paddingVertical: 4, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING[3] },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3], gap: SPACING[3] },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primarySurface, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  info: { flex: 1 },
  tenantName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  roomInfo: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  datesRow: { flexDirection: 'row', backgroundColor: COLORS.grey50, borderRadius: BORDER_RADIUS.md, padding: SPACING[3], marginBottom: SPACING[3] },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginBottom: 2 },
  dateValue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, textAlign: 'center' },
  dateSep: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING[2] },
  
  facilitySection: { backgroundColor: COLORS.primarySurface, borderRadius: BORDER_RADIUS.md, padding: SPACING[3], marginBottom: SPACING[3] },
  facilitySectionTitle: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, marginBottom: SPACING[2] },
  facilityItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  facilityItemLeft: { flexDirection: 'row', alignItems: 'center' },
  facilityItemName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  facilityItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  facilityItemPrice: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  removeFacilityBtn: { padding: 2 },

  actionsRow: { flexDirection: 'row', gap: SPACING[2] },
  addFacilityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySurface, borderRadius: BORDER_RADIUS.md, padding: SPACING[2], borderWidth: 1, borderColor: COLORS.primaryLight },
  addFacilityBtnText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },
  terminateBtn: { backgroundColor: COLORS.errorLight, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], alignItems: 'center', justifyContent: 'center' },
  terminateBtnText: { color: COLORS.error, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },

  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[12] },
  emptyIcon: { marginBottom: SPACING[3] },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  /* Modal styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS['2xl'], borderTopRightRadius: BORDER_RADIUS['2xl'], padding: SPACING[5], maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  modalCloseBtn: { padding: 4 },
  modalSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING[4] },
  modalScroll: { gap: SPACING[4], paddingBottom: SPACING[4] },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginBottom: SPACING[2] },
  textInput: { backgroundColor: COLORS.grey50, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg, padding: SPACING[3], fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  chipScroll: { gap: SPACING[2], paddingVertical: 4 },
  chipItem: { paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.grey100, borderWidth: 1, borderColor: COLORS.border },
  chipItemActive: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold },
  
  modeCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg, padding: SPACING[3], marginBottom: SPACING[2], backgroundColor: COLORS.grey50 },
  modeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySurface },
  modeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modeCardTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  modeCardDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 16, paddingLeft: 28 },

  modalActions: { flexDirection: 'row', gap: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelBtn: { flex: 1, padding: SPACING[3], borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.grey100, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONT_SIZE.base },
  saveBtn: { flex: 2, padding: SPACING[3], borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.base },
});

export default ContractScreen;

