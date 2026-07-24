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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

import DrawerButton from '../../components/navigation/DrawerButton';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import supabaseClient from '../../services/supabaseClient';

const formatRelativeTime = (dateStr, i18n) => {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const isEn = i18n?.language === 'en';
    const locale = isEn ? enLocale : idLocale;

    if (diffMins < 1) return isEn ? 'Just now' : 'Baru saja';
    if (diffMins < 60) return isEn ? `${diffMins} mins ago` : `${diffMins} menit lalu`;
    if (diffHours < 24) return isEn ? `${diffHours} hours ago` : `${diffHours} jam lalu`;
    if (diffDays < 7) return isEn ? `${diffDays} days ago` : `${diffDays} hari lalu`;
    return format(date, 'd MMM yyyy', { locale });
  } catch {
    return dateStr;
  }
};

const NOTIF_TYPE_CONFIG = {
  rental_request_new: { icon: 'document-text', color: COLORS.info },
  rental_request_approved: { icon: 'checkmark-circle', color: COLORS.success },
  rental_request_rejected: { icon: 'close-circle', color: COLORS.error },
  rental_request_expired: { icon: 'time', color: COLORS.grey500 },
  invoice_generated: { icon: 'receipt', color: COLORS.warning },
  invoice_paid: { icon: 'checkmark-done-circle', color: COLORS.success },
  invoice_overdue: { icon: 'alert-circle', color: COLORS.error },
  payment_received: { icon: 'wallet', color: COLORS.success },
  contract_ending: { icon: 'calendar', color: COLORS.warning },
  system: { icon: 'notifications', color: COLORS.grey500 },
};

/**
 * Attempt to translate a notification body.
 * New format: JSON string { key: "...", params: {...} }
 * Old format: plain text string (fallback — displayed as-is)
 */
const translateBody = (body, t) => {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed.key) {
      return t('dbNotification.' + parsed.key, parsed.params || {});
    }
  } catch {
    // Not JSON — old plain-text notification, return as-is
  }
  return body;
};

const NotifCard = ({ notif, onRead, i18n, t }) => {
  const config = NOTIF_TYPE_CONFIG[notif.type] ?? NOTIF_TYPE_CONFIG.system;

  // For virtual notifs (already translated via t()), use body directly.
  // For DB notifs, try JSON parse + translate.
  const displayBody = notif.is_virtual_request
    ? notif.body
    : translateBody(notif.body, t);

  return (
    <TouchableOpacity
      style={[styles.card, !notif.is_read && styles.cardUnread]}
      onPress={() => onRead(notif)}
      activeOpacity={0.7}
    >
      <View style={[styles.notifIcon, { backgroundColor: `${config.color}22` }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleUnread]}>
          {t('dbNotification.' + notif.title, notif.title)}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{displayBody}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(notif.created_at, i18n)}</Text>
      </View>
      {!notif.is_read && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
    </TouchableOpacity>
  );
};

const NotificationScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { currentUser } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const loadNotifications = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoading(true);

    const { data: dbNotifs } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    let mergedList = dbNotifs ?? [];

    // Jika Owner, ambil langsung pengajuan sewa pending
    if (currentUser.role === 'owner') {
      const { data: pendingReqs } = await supabaseClient
        .from('rental_requests')
        .select('*')
        .eq('owner_id', currentUser.id)
        .in('status', ['pending', 'approved', 'rejected']);

      if (pendingReqs && pendingReqs.length > 0) {
        const roomIds = [...new Set(pendingReqs.map((r) => r.room_id).filter(Boolean))];
        const tenantIds = [...new Set(pendingReqs.map((r) => r.tenant_id).filter(Boolean))];

        let roomMap = {};
        if (roomIds.length > 0) {
          const { data: roomsData } = await supabaseClient
            .from('rooms')
            .select('id, room_number, properties(name)')
            .in('id', roomIds);
          roomMap = Object.fromEntries((roomsData || []).map((r) => [r.id, r]));
        }

        let userMap = {};
        if (tenantIds.length > 0) {
          const { data: usersData } = await supabaseClient
            .from('users')
            .select('id, full_name')
            .in('id', tenantIds);
          userMap = Object.fromEntries((usersData || []).map((u) => [u.id, u]));
        }

        await useNotificationStore.getState().initVirtualReads();
        const isVirtualRead = useNotificationStore.getState().isVirtualRead;

        const existingRefIds = new Set(mergedList.map((n) => n.reference_id));
        const virtualNotifs = [];

        for (const req of pendingReqs) {
          if (!existingRefIds.has(req.id)) {
            const rInfo = roomMap[req.room_id] || {};
            const uInfo = userMap[req.tenant_id] || {};
            if (req.status === 'approved') {
              const virtualId = `req_app_${req.id}`;
              virtualNotifs.push({
                id: virtualId,
                user_id: currentUser.id,
                title: t('notification.reqApproveOwnerTitle', 'Pengajuan Sewa Disetujui ✅'),
                body: t('notification.reqApproveOwnerBody', `Anda telah menyetujui pengajuan sewa kamar ${rInfo.room_number ?? ''} di ${rInfo.properties?.name ?? 'properti Anda'} dari ${uInfo.full_name ?? 'Penghuni'}.`, { room: rInfo.room_number ?? '', property: rInfo.properties?.name ?? 'properti Anda', tenant: uInfo.full_name ?? 'Penghuni' }),
                type: 'rental_request_approved',
                reference_id: req.id,
                reference_type: 'rental_request',
                is_read: isVirtualRead(virtualId),
                created_at: req.reviewed_at || req.created_at,
                is_virtual_request: true,
              });
            } else if (req.status === 'rejected') {
              const virtualId = `req_rej_${req.id}`;
              virtualNotifs.push({
                id: virtualId,
                user_id: currentUser.id,
                title: t('notification.reqRejectOwnerTitle', 'Pengajuan Sewa Ditolak ❌'),
                body: t('notification.reqRejectOwnerBody', `Anda telah menolak pengajuan sewa kamar ${rInfo.room_number ?? ''} di ${rInfo.properties?.name ?? 'properti Anda'} dari ${uInfo.full_name ?? 'Penghuni'}.`, { room: rInfo.room_number ?? '', property: rInfo.properties?.name ?? 'properti Anda', tenant: uInfo.full_name ?? 'Penghuni' }),
                type: 'rental_request_rejected',
                reference_id: req.id,
                reference_type: 'rental_request',
                is_read: isVirtualRead(virtualId),
                created_at: req.reviewed_at || req.created_at,
                is_virtual_request: true,
              });
            } else if (req.status === 'pending') {
              const virtualId = `req_pen_${req.id}`;
              virtualNotifs.push({
                id: virtualId,
                user_id: currentUser.id,
                title: t('notification.reqNewOwnerTitle', 'Pengajuan Sewa Baru 📋'),
                body: t('notification.reqNewOwnerBody', `${uInfo.full_name ?? 'Penghuni baru'} mengajukan sewa kamar ${rInfo.room_number ?? ''} di ${rInfo.properties?.name ?? 'properti Anda'} (${req.duration_months ?? 1} bulan). Tekan untuk meninjau/menyetujui.`, { tenant: uInfo.full_name ?? 'Penghuni baru', room: rInfo.room_number ?? '', property: rInfo.properties?.name ?? 'properti Anda', months: req.duration_months ?? 1 }),
                type: 'rental_request_new',
                reference_id: req.id,
                reference_type: 'rental_request',
                is_read: isVirtualRead(virtualId),
                created_at: req.created_at,
                is_virtual_request: true,
              });
            }
          }
        }

        mergedList = [...virtualNotifs, ...mergedList];
      }
    }

    // Jika Tenant, ambil SEMUA pengajuan sewa (pending, approved, rejected) + tagihan unpaid
    if (currentUser.role === 'tenant') {
      await useNotificationStore.getState().initVirtualReads();
      const isVirtualRead = useNotificationStore.getState().isVirtualRead;

      const { data: tenantReqs } = await supabaseClient
        .from('rental_requests')
        .select('*')
        .eq('tenant_id', currentUser.id)
        .in('status', ['pending', 'approved', 'rejected']);

      const { data: tenantInvoices } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('tenant_id', currentUser.id)
        .eq('status', 'unpaid');

      // Kumpulkan semua room_id dari requests dan invoices untuk satu kali fetch info kamar
      const reqRooms = (tenantReqs || []).map((r) => r.room_id).filter(Boolean);
      const invRooms = (tenantInvoices || []).map((i) => i.room_id).filter(Boolean);
      const allRoomIds = [...new Set([...reqRooms, ...invRooms])];

      let roomMap = {};
      if (allRoomIds.length > 0) {
        const { data: roomsData } = await supabaseClient
          .from('rooms')
          .select('id, room_number, properties(name)')
          .in('id', allRoomIds);
        roomMap = Object.fromEntries((roomsData || []).map((r) => [r.id, r]));
      }

      if (tenantReqs && tenantReqs.length > 0) {
        const existingRefIds = new Set(mergedList.map((n) => n.reference_id));
        const virtualTenantNotifs = [];

        for (const req of tenantReqs) {
          if (!existingRefIds.has(req.id)) {
            const rInfo = roomMap[req.room_id] || {};
            const propName = rInfo.properties?.name || 'kos';
            const roomNum = rInfo.room_number || '';

            if (req.status === 'approved') {
              const virtualId = `req_app_${req.id}`;
              virtualTenantNotifs.push({
                id: virtualId,
                user_id: currentUser.id,
                title: t('notification.reqApproveTenantTitle', 'Pengajuan Sewa Disetujui! 🎉'),
                body: t('notification.reqApproveTenantBody', `Selamat! Pengajuan sewa kamar ${roomNum} di ${propName} telah disetujui oleh pemilik kos. Silakan lakukan pembayaran tagihan pertama Anda.`, { room: roomNum, property: propName }),
                type: 'rental_request_approved',
                reference_id: req.id,
                reference_type: 'rental_request',
                is_read: isVirtualRead(virtualId),
                created_at: req.reviewed_at || req.created_at,
                is_virtual_request: true,
              });
            } else if (req.status === 'rejected') {
              const virtualId = `req_rej_${req.id}`;
              virtualTenantNotifs.push({
                id: virtualId,
                user_id: currentUser.id,
                title: t('notification.reqRejectTenantTitle', 'Pengajuan Sewa Ditolak ❌'),
                body: t('notification.reqRejectTenantBody', `Mohon maaf, pengajuan sewa kamar ${roomNum} di ${propName} tidak dapat disetujui. ${req.rejection_reason ? 'Alasan: ' + req.rejection_reason : ''}`, { room: roomNum, property: propName, reason: req.rejection_reason ? 'Alasan: ' + req.rejection_reason : '' }),
                type: 'rental_request_rejected',
                reference_id: req.id,
                reference_type: 'rental_request',
                is_read: isVirtualRead(virtualId),
                created_at: req.reviewed_at || req.created_at,
                is_virtual_request: true,
              });
            } else if (req.status === 'pending') {
              const virtualId = `req_pen_${req.id}`;
              virtualTenantNotifs.push({
                id: virtualId,
                user_id: currentUser.id,
                title: t('notification.reqPendingTenantTitle', 'Pengajuan Sewa Dikirim ⏳'),
                body: t('notification.reqPendingTenantBody', `Pengajuan sewa kamar ${roomNum} di ${propName} telah dikirim dan sedang menunggu tinjauan dari pemilik kos.`, { room: roomNum, property: propName }),
                type: 'rental_request_pending',
                reference_id: req.id,
                reference_type: 'rental_request',
                is_read: isVirtualRead(virtualId),
                created_at: req.created_at,
                is_virtual_request: true,
              });
            }
          }
        }

        mergedList = [...virtualTenantNotifs, ...mergedList];
      }

      if (tenantInvoices && tenantInvoices.length > 0) {
        const existingRefIds = new Set(mergedList.map((n) => n.reference_id));
        const virtualInvoiceNotifs = [];

        for (const inv of tenantInvoices) {
          if (!existingRefIds.has(inv.id)) {
            const rInfo = roomMap[inv.room_id] || {};
            const propName = rInfo.properties?.name || 'kos';
            const roomNum = rInfo.room_number || '';
            const virtualId = `inv_${inv.id}`;
            virtualInvoiceNotifs.push({
              id: virtualId,
              user_id: currentUser.id,
              title: t('notification.invoiceNewTitle', 'Tagihan Pembayaran Baru 📄'),
              body: t('notification.invoiceNewBody', `Tagihan kamar ${roomNum} di ${propName} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.total_amount || inv.amount || 0)} siap untuk dibayar.`, { room: roomNum, property: propName, amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.total_amount || inv.amount || 0) }),
              type: 'invoice_new',
              reference_id: inv.id,
              reference_type: 'invoice',
              is_read: isVirtualRead(virtualId),
              created_at: inv.created_at,
              is_virtual_request: true,
            });
          }
        }

        mergedList = [...virtualInvoiceNotifs, ...mergedList];
      }
    }

    mergedList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setNotifications(mergedList);
    const unread = mergedList.filter((n) => !n.is_read).length;
    // Gunakan getState() bukan hook untuk menghindari setState saat render komponen lain
    useNotificationStore.getState().setUnreadCount(unread);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [currentUser?.id, currentUser?.role, t, i18n.language]);


  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkRead = async (notifId) => {
    if (String(notifId).startsWith('req_') || String(notifId).startsWith('inv_')) {
      await useNotificationStore.getState().markVirtualAsRead([notifId]);
    } else {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);
      
      if (error) {
        console.error('Failed to mark notification as read:', error.message);
      }
    }

    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n));
      const unread = updated.filter((n) => !n.is_read).length;
      useNotificationStore.getState().setUnreadCount(unread);
      return updated;
    });
  };


  const handleNotifPress = async (notif) => {
    if (!notif.is_read) {
      await handleMarkRead(notif.id);
    }
    if (currentUser?.role === 'owner') {
      if (notif.type === 'rental_request_new' || notif.reference_type === 'rental_request') {
        navigation.navigate('RentalRequest');
      } else if (notif.reference_type === 'invoice') {
        navigation.navigate('OwnerInvoiceList');
      }
    } else if (currentUser?.role === 'tenant') {
      if (notif.type === 'rental_request_approved' || notif.reference_type === 'invoice') {
        if (notif.reference_id && notif.reference_type === 'invoice') {
          navigation.navigate('MyRentStack', {
            screen: 'InvoiceDetail',
            params: { invoiceId: notif.reference_id },
          });
        } else {
          navigation.navigate('MyRentStack');
        }
      } else if (notif.type === 'rental_request_rejected' || notif.type === 'rental_request_pending') {
        navigation.navigate('MyRentStack');
      }
    }
  };

  const handleMarkAllRead = async () => {
    const virtualIdsToMark = [];
    notifications.forEach((n) => {
      if (n.is_virtual_request || String(n.id).startsWith('req_') || String(n.id).startsWith('inv_')) {
        virtualIdsToMark.push(n.id);
      }
    });
    await useNotificationStore.getState().markVirtualAsRead(virtualIdsToMark);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    useNotificationStore.getState().setUnreadCount(0);


    await supabaseClient
      .from('notifications')
      .update({ is_read: true })
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
      <View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <DrawerButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('notification.title')}</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} {t('notification.unread', 'belum dibaca')}</Text>
            )}
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
                <Text style={styles.markAllText}>{t('notification.markAllRead')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
            <Text style={styles.emptyTitle}>{t('notification.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('notification.emptySubtitle', 'Notifikasi tentang kamar, tagihan, dan pengajuan akan muncul di sini')}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <NotifCard notif={item} onRead={handleNotifPress} i18n={i18n} t={t} />
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
