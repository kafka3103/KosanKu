/**
 * services/xenditService.js
 * Layanan integrasi Payment Gateway Xendit (Server-to-Server) via Supabase Edge Functions.
 * Mencegah kebocoran Secret Key di aplikasi React Native & menyediakan pengecekan Real-Time cepat.
 */

import supabaseClient from './supabaseClient';
import useAuthStore from '../store/authStore';

/**
 * Pengecekan status tagihan secara cepat langsung ke database Supabase
 * Berguna untuk sinkronisasi seketika sebelum melakukan pembayaran atau saat membuka layar
 * @param {string} invoiceId UUID dari tabel `invoices`
 * @returns {Promise<{success: boolean, invoice?: Object, error?: string}>}
 */
export const fetchInvoiceLatestStatus = async (invoiceId) => {
  try {
    const { data, error } = await supabaseClient
      .from('invoices')
      .select('id, status, paid_amount, total_amount, updated_at')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return { success: true, invoice: data };
  } catch (err) {
    console.error('❌ Error fetchInvoiceLatestStatus:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Memanggil Edge Function `create-xendit-invoice` untuk membuat link pembayaran resmi Xendit
 * @param {string} invoiceId UUID dari tabel `invoices`
 * @returns {Promise<{success: boolean, invoiceUrl?: string, xenditInvoiceId?: string, isAlreadyPaid?: boolean, error?: string}>}
 */
export const createXenditCheckout = async (invoiceId) => {
  try {
    // 1. Cek Cepat Real-Time: Pastikan tagihan belum lunas di database sebelum memanggil server Xendit
    const checkBefore = await fetchInvoiceLatestStatus(invoiceId);
    if (checkBefore.success && checkBefore.invoice?.status === 'paid') {
      console.log('⚡ Cek Cepat Real-Time: Tagihan ini sudah berstatus PAID di database Supabase!');
      return {
        success: false,
        isAlreadyPaid: true,
        error: 'Tagihan ini sudah lunas dan diverifikasi oleh sistem.',
      };
    }

    const currentUser = useAuthStore.getState().currentUser;
    console.log('🚀 Meminta pembuatan invoice Xendit ke Edge Function untuk ID:', invoiceId, 'User:', currentUser?.id);

    const { data, error } = await supabaseClient.functions.invoke('create-xendit-invoice', {
      body: {
        invoice_id: invoiceId,
        user_id: currentUser?.id,
      },
    });

    if (error) {
      console.error('❌ Error invoke Edge Function create-xendit-invoice:', error);
      let errorMessage = error.message;

      // Coba ekstrak pesan error dari JSON body jika respons dari server mengandung detail
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorJson = await error.context.json();
          if (errorJson && errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (e) {
          // Abaikan jika tidak bisa diparsing
        }
      }

      // Jika error mengatakan tagihan sudah lunas, ubah status isAlreadyPaid menjadi true
      if (errorMessage && errorMessage.toLowerCase().includes('sudah lunas')) {
        return {
          success: false,
          isAlreadyPaid: true,
          error: 'Tagihan ini sudah lunas! Status telah diperbarui secara otomatis.',
        };
      }

      throw new Error(errorMessage || 'Gagal memanggil Edge Function pembayaran Xendit');
    }

    if (!data.success) {
      console.error('❌ Respons error dari create-xendit-invoice:', data.error);
      if (data.error && data.error.toLowerCase().includes('sudah lunas')) {
        return {
          success: false,
          isAlreadyPaid: true,
          error: 'Tagihan ini sudah lunas! Status telah diperbarui secara otomatis.',
        };
      }
      throw new Error(data.error || 'Gagal membuat URL pembayaran Xendit');
    }

    console.log('✅ Berhasil mendapatkan URL checkout Xendit:', data.invoice_url);

    return {
      success: true,
      invoiceUrl: data.invoice_url,       // URL untuk dibuka di WebView atau Linking.openURL
      xenditInvoiceId: data.xendit_invoice_id,
      expiryDate: data.expiry_date,
    };
  } catch (err) {
    console.error('Error di createXenditCheckout:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Berlangganan (Subscribe) perubahan status invoice di Supabase Realtime secara langsung.
 * Sangat berguna di layar PaymentScreen agar ketika webhook Xendit masuk,
 * UI otomatis berubah menjadi LUNAS tanpa reload manual.
 *
 * @param {string} invoiceId UUID invoice yang sedang dibayar
 * @param {function} onStatusChange Callback yang dipanggil saat status berubah (misal menjadi 'paid')
 * @returns {Object} Realtime channel subscription yang bisa di-remove saat component unmount
 */
export const subscribeToInvoiceRealtime = (invoiceId, onStatusChange) => {
  const channelName = `xendit-realtime-inv-${invoiceId}`;

  // Hapus channel lama dengan nama yang sama sebelum membuat subscription baru.
  // Ini mencegah error "cannot add callbacks after subscribe()" yang terjadi
  // ketika React reconnect cycle (Strict Mode / Fast Refresh) menjalankan effect ulang.
  const existingChannels = supabaseClient.getChannels();
  const existingChannel = existingChannels.find(
    (ch) => ch.topic === `realtime:${channelName}`
  );
  if (existingChannel) {
    supabaseClient.removeChannel(existingChannel);
  }

  const subscription = supabaseClient
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'invoices',
        filter: `id=eq.${invoiceId}`,
      },
      (payload) => {
        if (payload.new && payload.new.status) {
          console.log('🔔 Supabase Realtime - Status Invoice berubah menjadi:', payload.new.status);
          onStatusChange(payload.new);
        }
      }
    )
    .subscribe();

  return subscription;
};


/**
 * Berlangganan (Subscribe) perubahan semua invoice milik seorang user (tenant atau owner)
 * Mencegah tampilan stale/outdated di layar MyRentScreen atau OwnerInvoiceList
 *
 * @param {string} userId UUID dari tabel `users`
 * @param {string} role 'tenant' atau 'owner'
 * @param {function} onAnyChange Callback yang dipanggil saat ada tagihan baru/diubah
 * @returns {Object} Realtime channel subscription
 */
export const subscribeToUserInvoicesRealtime = (userId, role = 'tenant', onAnyChange) => {
  const filterColumn = role === 'owner' ? 'owner_id' : 'tenant_id';
  const channelName = `invoices-user-${userId}`;

  // Hapus channel lama jika sudah ada (cegah duplicate subscribe error)
  const existingChannels = supabaseClient.getChannels();
  const existingChannel = existingChannels.find(
    (ch) => ch.topic === `realtime:${channelName}`
  );
  if (existingChannel) {
    supabaseClient.removeChannel(existingChannel);
  }

  const subscription = supabaseClient
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `${filterColumn}=eq.${userId}`,
      },
      (payload) => {
        console.log(`🔔 Realtime Sync Invoices (${role}) - perubahan terdeteksi:`, payload.eventType);
        onAnyChange(payload.new || payload.old);
      }
    )
    .subscribe();

  return subscription;
};

