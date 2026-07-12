/**
 * services/pakkasirService.js
 * Layanan integrasi Payment Gateway PakKasir (https://pakasir.com) untuk otomatisasi pembayaran tagihan.
 */

import supabaseClient from './supabaseClient';

const PAKKASIR_API_BASE_URL = 'https://api.pakasir.com/v1'; // Base URL resmi PakKasir
const PROJECT_SLUG = 'kosanku-app'; // Ganti dengan slug proyek PakKasir Anda

/**
 * Membuat transaksi baru di PakKasir dan mengembalikan link pembayaran / QR Code
 * @param {Object} params
 * @param {Object} params.invoice Data tagihan (id, total_amount, paid_amount, invoice_number)
 * @param {Object} params.tenant Data penghuni (id, full_name, email, phone)
 * @param {string} params.paymentMethod Metode bayar ('qris', 'bca_va', 'bri_va', 'gopay', dll.)
 */
export const createPakKasirTransaction = async ({ invoice, tenant, paymentMethod = 'qris' }) => {
  try {
    const orderId = invoice.id;
    const amount = parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount || 0);

    // Payload request ke API PakKasir
    const payload = {
      project: PROJECT_SLUG,
      order_id: orderId,
      amount: amount,
      method: paymentMethod,
      customer_name: tenant?.full_name || 'Penghuni KosanKu',
      customer_email: tenant?.email || 'penghuni@kosanku.com',
      callback_url: `https://app.kosanku.com/payment/success?invoice_id=${orderId}`,
    };

    const response = await fetch(`${PAKKASIR_API_BASE_URL}/transaction/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.message || 'Gagal membuat transaksi pembayaran PakKasir');
    }

    return {
      success: true,
      paymentUrl: data.payment_url, // URL untuk WebView atau Checkout
      qrisUrl: data.qris_image_url, // URL gambar QRIS (jika metode QRIS)
      vaNumber: data.va_number,     // Nomor VA (jika metode VA)
      transactionId: data.transaction_id || orderId,
    };
  } catch (error) {
    console.error('Error createPakKasirTransaction:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Memeriksa status transaksi PakKasir (Polling opsional jika Webhook terlambat)
 * @param {string} orderId UUID invoice
 */
export const checkPakKasirStatus = async (orderId) => {
  try {
    const response = await fetch(`${PAKKASIR_API_BASE_URL}/transaction/status?project=${PROJECT_SLUG}&order_id=${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return {
      success: true,
      status: data.status, // 'completed', 'pending', atau 'failed'
      paidAmount: data.amount,
    };
  } catch (error) {
    console.error('Error checkPakKasirStatus:', error);
    return { success: false, error: error.message };
  }
};
