/**
 * services/notificationService.js
 * Helper untuk membuat dan mengirim notifikasi ke user (Owner atau Tenant)
 *
 * Alur:
 * 1. Insert notifikasi ke tabel `notifications` (in-app / inbox)
 * 2. Panggil Edge Function `send-notification` untuk push notif ke device (FCM)
 */

import supabaseClient from './supabaseClient';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Kirim push notification via Edge Function (FCM)
 * Fire-and-forget — tidak memblokir alur utama jika gagal
 *
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {Object} [data] - Opsional, key-value untuk deep-link
 */
const triggerPushNotification = async (userId, title, body, data = {}) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, title, body, data }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('⚠️ Push notification gagal terkirim:', errBody);
    }
  } catch (err) {
    // Push notif adalah best-effort — jangan crash alur utama
    console.warn('⚠️ Error memanggil send-notification Edge Function:', err?.message);
  }
};

/**
 * Buat notifikasi baru untuk user tertentu di tabel notifications,
 * sekaligus kirim push notification ke device via FCM.
 *
 * @param {Object} params
 * @param {string} params.userId - ID penerima notifikasi
 * @param {string} params.title - Judul notifikasi
 * @param {string} params.body - Isi pesan notifikasi
 * @param {string} params.type - Tipe notifikasi ('rental_request_new', 'invoice_generated', dll)
 * @param {string} [params.referenceId] - ID referensi entitas terkait
 * @param {string} [params.referenceType] - Tipe entitas referensi ('rental_request', 'invoice', 'contract')
 * @param {Object} [params.pushData] - Opsional, data tambahan untuk push notif (deep-link)
 */
export const sendNotification = async ({
  userId,
  title,
  body,
  type,
  referenceId = null,
  referenceType = null,
  pushData = {},
}) => {
  try {
    if (!userId) return { data: null, error: new Error('User ID diperlukan') };

    // 1. Simpan notifikasi ke database (in-app inbox)
    const { data, error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        type,
        reference_id: referenceId,
        reference_type: referenceType,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.warn('Gagal menyimpan notifikasi ke database:', error.message);
    }

    // 2. Kirim push notification ke device (FCM) — fire and forget
    triggerPushNotification(userId, title, body, {
      type,
      referenceId: referenceId || '',
      referenceType: referenceType || '',
      ...pushData,
    });

    return { data, error };
  } catch (err) {
    console.warn('Error sendNotification:', err.message);
    return { data: null, error: err };
  }
};

