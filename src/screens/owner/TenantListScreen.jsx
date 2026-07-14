/**
 * screens/owner/TenantListScreen.jsx
 * Daftar tenant aktif yang sedang menghuni properti owner
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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import { getOwnerActiveTenants } from '../../services/propertyService';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const getDaysUntilEnd = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
};

const TenantCard = ({ contract, onCall }) => {
  const tenant = contract.users;
  const room = contract.rooms;
  const property = room?.properties;
  const daysLeft = getDaysUntilEnd(contract.end_date);
  const isExpiringSoon = daysLeft != null && daysLeft <= 30 && daysLeft >= 0;
  const isExpired = daysLeft != null && daysLeft < 0;

  return (
    <View style={[styles.card, isExpiringSoon && styles.cardWarning]}>
      {/* Expiry warning */}
      {isExpiringSoon && (
        <View style={styles.expiryWarning}>
          <Ionicons name="warning" size={16} color={COLORS.warning} style={{ marginRight: 4 }} />
          <Text style={styles.expiryWarningText}>
            Kontrak berakhir {daysLeft === 0 ? 'hari ini' : `dalam ${daysLeft} hari`}
          </Text>
        </View>
      )}
      {isExpired && (
        <View style={[styles.expiryWarning, styles.expiryExpired]}>
          <Ionicons name="close-circle" size={16} color={COLORS.error} style={{ marginRight: 4 }} />
          <Text style={[styles.expiryWarningText, { color: COLORS.error }]}>Kontrak sudah berakhir</Text>
        </View>
      )}

      {/* Tenant Info */}
      <View style={styles.tenantRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {tenant?.full_name?.[0]?.toUpperCase() ?? 'T'}
          </Text>
        </View>
        <View style={styles.tenantInfo}>
          <Text style={styles.tenantName}>{tenant?.full_name ?? 'Tenant'}</Text>
          <Text style={styles.tenantContact}>{tenant?.phone_number ?? tenant?.email ?? '—'}</Text>
        </View>
        {tenant?.phone_number && (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => onCall(tenant.phone_number)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={18} color={COLORS.success} />
          </TouchableOpacity>
        )}
      </View>

      {/* Contract Details */}
      <View style={styles.contractDetails}>
        <View style={styles.detailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.detailLabel}>Properti</Text>
          </View>
          <Text style={styles.detailValue}>{property?.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.detailLabel}>Kamar</Text>
          </View>
          <Text style={styles.detailValue}>{room?.room_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.detailLabel}>Mulai</Text>
          </View>
          <Text style={styles.detailValue}>{formatDate(contract.start_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.detailLabel}>Selesai</Text>
          </View>
          <Text style={[styles.detailValue, isExpiringSoon && { color: COLORS.warning }]}>
            {formatDate(contract.end_date)}
            {daysLeft != null && daysLeft >= 0 && (
              <Text style={styles.daysLeft}> ({daysLeft} hari lagi)</Text>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
};

const TenantListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadTenants = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);
    const { data, error } = await getOwnerActiveTenants(currentUser.id);
    if (!error && data) setContracts(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadTenants();
    }, [loadTenants])
  );

  const handleCall = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Gagal', 'Tidak bisa membuka aplikasi telepon');
    });
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
          <Ionicons name="arrow-back" size={20} color={COLORS.primaryLight} style={{ marginRight: 0 }} />
          
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Penghuni</Text>
        <Text style={styles.headerSubtitle}>
          {contracts.length} penghuni aktif
        </Text>
      </View>

      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadTenants(true); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Belum Ada Penghuni</Text>
            <Text style={styles.emptySubtitle}>
              Penghuni aktif akan muncul setelah Anda menyetujui pengajuan sewa.
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TenantCard contract={item} onCall={handleCall} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING[14],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[5],
  },
  backBtn: { marginBottom: SPACING[3], flexDirection: 'row', alignItems: 'center' },
  backBtnText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.base },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, marginTop: 2 },
  listContent: { padding: SPACING[4], gap: SPACING[3], paddingBottom: SPACING[10] },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  cardWarning: {
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  expiryWarning: {
    backgroundColor: COLORS.warningLight,
    padding: SPACING[2],
    paddingHorizontal: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryExpired: { backgroundColor: COLORS.errorLight },
  expiryWarningText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.warning,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    paddingBottom: SPACING[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  tenantInfo: { flex: 1 },
  tenantName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  tenantContact: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractDetails: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
    gap: SPACING[2],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  detailValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING[4],
  },
  daysLeft: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHT.regular,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[12] },
  emptyIcon: { marginBottom: SPACING[3] },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[1],
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING[6],
  },
});

export default TenantListScreen;
