/**
 * screens/shared/NotificationScreen.jsx
 * Halaman notifikasi in-app — shared untuk Owner dan Tenant
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import supabaseClient from '../../services/supabaseClient';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return format(date, 'd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const NOTIF_TYPE_CONFIG = {
  rental_request_new: { icon: 'document-text', color: COLORS.info },
  rental_request_approved: { icon: 'checkmark-circle', color: COLORS.success },
  rental_request_rejected: { icon: 'close-circle', color: COLORS.error },
  invoice_generated: { icon: 'receipt', color: COLORS.warning },
  invoice_overdue: { icon: 'alert-circle', color: COLORS.error },
  payment_received: { icon: 'wallet', color: COLORS.success },
  contract_ending: { icon: 'calendar', color: COLORS.warning },
  system: { icon: 'notifications', color: COLORS.grey500 },
};

const NotifCard = ({ notif, onRead }) => {
  const config = NOTIF_TYPE_CONFIG[notif.type] ?? NOTIF_TYPE_CONFIG.system;

  return (
    <TouchableOpacity
      style={[styles.card, !notif.is_read && styles.cardUnread]}
      onPress={() => onRead(notif.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.notifIcon, { backgroundColor: `${config.color}22` }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleUnread]}>
          {notif.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(notif.created_at)}</Text>
      </View>
      {!notif.is_read && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
    </TouchableOpacity>
  );
};

const NotificationScreen = () => {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setNotifications(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    await supabaseClient
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabaseClient
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
        <Text style={styles.headerTitle}>Notifikasi</Text>
        {unreadCount > 0 && (
          <Text style={styles.headerSubtitle}>{unreadCount} belum dibaca</Text>
        )}
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Tandai Semua Dibaca</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadNotifications(true); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
            <Text style={styles.emptySubtitle}>
              Notifikasi tentang kamar, tagihan, dan pengajuan akan muncul di sini
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <NotifCard notif={item} onRead={handleMarkRead} />
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
  markAllBtn: {
    alignSelf: 'flex-start',
    marginTop: SPACING[3],
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  markAllText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.medium,
  },
  listContent: { padding: SPACING[4], gap: SPACING[2], paddingBottom: SPACING[10] },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[3],
    ...SHADOW.sm,
  },
  cardUnread: {
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  
  notifContent: { flex: 1 },
  notifTitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: 4,
  },
  notifTitleUnread: { fontWeight: FONT_WEIGHT.bold },
  notifBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: SPACING[2],
    flexShrink: 0,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING[16] },
  emptyIcon: { marginBottom: SPACING[4] },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING[6],
  },
});

export default NotificationScreen;
