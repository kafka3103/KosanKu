/**
 * store/notificationStore.js
 * Zustand store untuk menyimpan jumlah inbox / notifikasi belum dibaca (unread count)
 * agar badge pada bottom tab (Owner maupun Tenant) terupdate secara realtime
 */
import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));

export default useNotificationStore;
