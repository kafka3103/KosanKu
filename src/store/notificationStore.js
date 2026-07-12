/**
 * store/notificationStore.js
 * Zustand store untuk menyimpan jumlah inbox / notifikasi belum dibaca (unread count)
 * serta status pembacaan notifikasi virtual (yang berasal dari rental_requests & invoices)
 * agar badge dan daftar notifikasi tersinkronisasi antar tab secara realtime & persisten.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@kosanku_read_virtual_notifs';

const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  readVirtualIds: new Set(),
  isInitialized: false,

  setUnreadCount: (count) => set({ unreadCount: count }),

  // Inisialisasi daftar virtual ID yang sudah dibaca dari AsyncStorage
  initVirtualReads: async () => {
    if (get().isInitialized) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        set({ readVirtualIds: new Set(arr), isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch (e) {
      console.error('Gagal memuat virtual read notifs dari AsyncStorage:', e);
      set({ isInitialized: true });
    }
  },

  // Cek apakah virtual ID tertentu sudah ditandai dibaca
  isVirtualRead: (id) => {
    return get().readVirtualIds.has(String(id));
  },

  // Tandai satu atau banyak virtual ID sebagai dibaca dan simpan secara persisten ke AsyncStorage
  markVirtualAsRead: async (ids) => {
    if (!ids || ids.length === 0) return;
    const currentSet = new Set(get().readVirtualIds);
    let hasNew = false;

    ids.forEach((id) => {
      const strId = String(id);
      if (!currentSet.has(strId)) {
        currentSet.add(strId);
        hasNew = true;
      }
    });

    if (hasNew) {
      set({ readVirtualIds: currentSet });
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(currentSet)));
      } catch (e) {
        console.error('Gagal menyimpan virtual read notifs ke AsyncStorage:', e);
      }
    }
  },
}));

export default useNotificationStore;
