/**
 * screens/owner/FacilityMasterScreen.jsx
 * Manajemen Master Fasilitas untuk Owner:
 * - Lihat semua fasilitas tersedia di katalog
 * - Tambah fasilitas baru (untuk digunakan di kamar & kontrak opsional)
 * - Edit atau hapus fasilitas yang ada
 */

import React, { useState, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import {
  getFacilityMaster,
  createFacilityMaster,
  updateFacilityMaster,
  deleteFacilityMaster,
} from '../../services/propertyService';

// Ikon bawaan yang umum dipakai untuk fasilitas kos
const ICON_OPTIONS = [
  { label: 'WiFi', value: 'wifi' },
  { label: 'AC', value: 'snow' },
  { label: 'Parkir', value: 'car' },
  { label: 'Dapur', value: 'restaurant' },
  { label: 'Kulkas', value: 'cube' },
  { label: 'TV', value: 'tv' },
  { label: 'Laundri', value: 'water' },
  { label: 'Gym', value: 'barbell' },
  { label: 'CCTV', value: 'eye' },
  { label: 'Listrik', value: 'flash' },
  { label: 'Air', value: 'water-outline' },
  { label: 'Kasur', value: 'bed' },
  { label: 'Lemari', value: 'archive' },
  { label: 'Meja', value: 'desktop' },
  { label: 'Lainnya', value: 'apps' },
];

const INITIAL_FORM = {
  name: '',
  icon_name: 'apps',
  category: 'general',
};

const FacilityMasterScreen = ({ navigation }) => {
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null); // null = add mode
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const { data, error } = await getFacilityMaster();
    if (!error && data) setFacilities(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditingFacility(null);
    setForm(INITIAL_FORM);
    setIsModalVisible(true);
  };

  const openEdit = (facility) => {
    setEditingFacility(facility);
    setForm({
      name: facility.name ?? '',
      icon_name: facility.icon_name ?? 'apps',
      category: facility.category ?? 'general',
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Perhatian', 'Nama fasilitas wajib diisi.');
      return;
    }

    setIsSaving(true);
    let result;
    if (editingFacility) {
      result = await updateFacilityMaster(editingFacility.id, {
        name: form.name.trim(),
        icon_name: form.icon_name,
        category: form.category || 'general',
      });
    } else {
      result = await createFacilityMaster({
        name: form.name.trim(),
        icon_name: form.icon_name,
        category: form.category || 'general',
      });
    }
    setIsSaving(false);

    if (result.error) {
      Alert.alert('Gagal', result.error.message || 'Terjadi kesalahan.');
    } else {
      setIsModalVisible(false);
      load(true);
    }
  };

  const handleDelete = (facility) => {
    Alert.alert(
      'Hapus Fasilitas',
      `Yakin ingin menghapus "${facility.name}" dari master fasilitas?\n\nFasilitas yang sedang digunakan di kamar atau kontrak tidak akan terpengaruh.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteFacilityMaster(facility.id);
            if (error) {
              Alert.alert('Gagal', error.message || 'Tidak bisa menghapus fasilitas yang masih digunakan.');
            } else {
              setFacilities((prev) => prev.filter((f) => f.id !== facility.id));
            }
          },
        },
      ]
    );
  };

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
          <Ionicons name="chevron-back" size={22} color={COLORS.primaryLight} />
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Master Fasilitas</Text>
        <Text style={styles.headerSubtitle}>{facilities.length} fasilitas terdaftar</Text>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.info} style={{ marginRight: 8 }} />
        <Text style={styles.infoText}>
          Fasilitas di sini digunakan sebagai pilihan saat menambahkan fasilitas opsional ke kontrak sewa penghuni.
        </Text>
      </View>

      {/* Fab + Add */}
      <FlatList
        data={facilities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); load(true); }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="apps-outline" size={56} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>Belum Ada Master Fasilitas</Text>
            <Text style={styles.emptySubtitle}>Tambahkan fasilitas seperti WiFi, AC, Parkir untuk ditawarkan ke penghuni</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const iconName = ICON_OPTIONS.find((i) => i.value === item.icon_name)?.value ?? 'apps';
          return (
            <View style={styles.facilityCard}>
              <View style={styles.facilityIconBox}>
                <Ionicons name={iconName} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.facilityInfo}>
                <Text style={styles.facilityName}>{item.name}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category ?? 'general'}</Text>
                </View>
              </View>
              <View style={styles.facilityActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Modal Tambah/Edit Fasilitas */}
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
              <Text style={styles.modalTitle}>
                {editingFacility ? 'Edit Fasilitas' : 'Tambah Fasilitas Baru'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Nama */}
            <Text style={styles.fieldLabel}>Nama Fasilitas *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Misal: WiFi 100 Mbps, AC 1 PK, dll"
              placeholderTextColor={COLORS.textTertiary}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            {/* Deskripsi (Removed to match DB schema) */}

            {/* Kategori */}
            <Text style={styles.fieldLabel}>Kategori</Text>
            <View style={styles.categoryRow}>
              {['general', 'optional', 'room'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, form.category === cat && styles.categoryChipActive]}
                  onPress={() => setForm((p) => ({ ...p, category: cat }))}
                >
                  <Text style={[styles.categoryChipText, form.category === cat && styles.categoryChipTextActive]}>
                    {cat === 'general' ? 'Umum' : cat === 'optional' ? 'Opsional' : 'Kamar'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ikon */}
            <Text style={styles.fieldLabel}>Ikon</Text>
            <TouchableOpacity
              style={styles.iconPickerBtn}
              onPress={() => setShowIconPicker((p) => !p)}
            >
              <Ionicons name={form.icon_name ?? 'apps'} size={22} color={COLORS.primary} />
              <Text style={styles.iconPickerLabel}>
                {ICON_OPTIONS.find((i) => i.value === form.icon_name)?.label ?? 'Lainnya'}
              </Text>
              <Ionicons name={showIconPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {showIconPicker && (
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.value}
                    style={[styles.iconGridItem, form.icon_name === icon.value && styles.iconGridItemActive]}
                    onPress={() => { setForm((p) => ({ ...p, icon_name: icon.value })); setShowIconPicker(false); }}
                  >
                    <Ionicons name={icon.value} size={22} color={form.icon_name === icon.value ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.iconGridLabel, form.icon_name === icon.value && { color: COLORS.primary }]}>{icon.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>{editingFacility ? 'Simpan Perubahan' : 'Tambahkan'}</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[14],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base, marginLeft: 2 },
  headerTitle: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.infoLight ?? '#EFF6FF',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.info ?? '#1D4ED8', lineHeight: 18 },

  list: { padding: SPACING[4], gap: SPACING[3], paddingBottom: 120 },
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
    gap: SPACING[3],
  },
  facilityIconBox: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  facilityInfo: { flex: 1 },
  facilityName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  facilityDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, marginBottom: 4 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.grey100,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  categoryText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  facilityActions: { flexDirection: 'row', gap: SPACING[1] },
  actionBtn: { padding: SPACING[2] },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.lg,
  },

  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[12], gap: SPACING[3] },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING[6] },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[4] },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  modalCloseBtn: { padding: 4 },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginBottom: SPACING[2], marginTop: SPACING[3] },
  textInput: {
    backgroundColor: COLORS.grey50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  categoryRow: { flexDirection: 'row', gap: SPACING[2] },
  categoryChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.grey100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primary },
  categoryChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  categoryChipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold },

  iconPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grey50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    gap: SPACING[2],
  },
  iconPickerLabel: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], marginTop: SPACING[2] },
  iconGridItem: {
    width: 72,
    alignItems: 'center',
    padding: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.grey50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconGridItemActive: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primary },
  iconGridLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 },

  modalActions: { flexDirection: 'row', gap: SPACING[3], paddingTop: SPACING[4], borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING[3] },
  cancelBtn: { flex: 1, padding: SPACING[3], borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.grey100, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONT_SIZE.base },
  saveBtn: { flex: 2, padding: SPACING[3], borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.base },
});

export default FacilityMasterScreen;
