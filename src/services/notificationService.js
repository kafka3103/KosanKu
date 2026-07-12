/**
 * services/notificationService.js
 * Helper untuk membuat dan mengirim notifikasi ke user (Owner atau Tenant)
 */

import supabaseClient from './supabaseClient';

/**
 * Buat notifikasi baru untuk user tertentu di tabel notifications
 *
 * @param {Object} params
 * @param {string} params.userId - ID penerima notifikasi
 * @param {string} params.title - Judul notifikasi
 * @param {string} params.body - Isi pesan notifikasi
 * @param {string} params.type - Tipe notifikasi ('rental_request_new', 'rental_request_approved', 'rental_request_rejected', dll)
 * @param {string} [params.referenceId] - ID referensi entitas terkait
 * @param {string} [params.referenceType] - Tipe entitas referensi ('rental_request', 'invoice', 'contract')
 */
export const sendNotification = async ({
  userId,
  title,
  body,
  type,
  referenceId = null,
  referenceType = null,
}) => {
  try {
    if (!userId) return { data: null, error: new Error('User ID diperlukan') };

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
      console.warn('Gagal mengirim notifikasi:', error.message);
    }

    return { data, error };
  } catch (err) {
    console.warn('Error sendNotification:', err.message);
    return { data: null, error: err };
  }
};
