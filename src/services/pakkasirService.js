/**
 * services/pakkasirService.js
 * Layanan integrasi Payment Gateway PakKasir (https://app.pakasir.com) untuk otomatisasi pembayaran tagihan.
 */

import supabaseClient from './supabaseClient';

const PAKKASIR_API_BASE_URL = 'https://app.pakasir.com/api'; // Base URL resmi PakKasir
const PROJECT_SLUG = 'kosanku-app'; // Slug proyek Anda di PakKasir
const API_KEY = '5mu5Izr3CLhzPRprsLKRLEaVLywY218u'; // API Key Anda dari dashboard PakKasir

/**
 * Membuat transaksi baru di PakKasir dan mengembalikan link pembayaran / QR Code / VA Number
 * @param {Object} params
 * @param {Object} params.invoice Data tagihan (id, total_amount, paid_amount, invoice_number)
 * @param {Object} params.tenant Data penghuni (id, full_name, email, phone)
 * @param {string} params.paymentMethod Metode bayar ('qris', 'bca_va', 'bri_va', 'bni_va', 'mandiri_va', dll.)
 */
export const createPakKasirTransaction = async ({ invoice, tenant, paymentMethod = 'qris' }) => {
  try {
    const orderId = invoice.id;
    const amount = Math.round(parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount || 0));

    // Payload request resmi ke API PakKasir
    const payload = {
      project: PROJECT_SLUG,
      order_id: orderId,
      amount: amount,
      api_key: API_KEY,
    };

    console.log(`Mengirim request ke ${PAKKASIR_API_BASE_URL}/transactioncreate/${paymentMethod}`, payload);

    const response = await fetch(`${PAKKASIR_API_BASE_URL}/transactioncreate/${paymentMethod}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Respons PakKasir:', data);

    if (!response.ok || data.error || data.status === 'error') {
      throw new Error(data.message || data.error || 'Gagal membuat transaksi pembayaran PakKasir');
    }

    const tx = data.transaction || data;
    const paymentNum = tx.payment_number || tx.va_number || tx.qris_string;
    const isQris = paymentMethod === 'qris';

    // Jika metode QRIS dan berupa string QR, generate gambar barcode QRIS statis/dinamis yang jelas
    const qrisUrl = isQris && paymentNum
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentNum)}`
      : tx.qris_image_url;

    return {
      success: true,
      paymentUrl: tx.payment_url || `https://app.pakasir.com/pay/${PROJECT_SLUG}/${orderId}`,
      qrisUrl: qrisUrl,
      vaNumber: isQris ? null : paymentNum,
      transactionId: tx.transaction_id || orderId,
      totalPayment: tx.total_payment || amount,
    };
  } catch (error) {
    console.error('Error createPakKasirTransaction:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Memeriksa status transaksi PakKasir
 * @param {string} orderId UUID invoice
 * @param {number} amount Nominal tagihan
 */
export const checkPakKasirStatus = async (orderId, amount = 0) => {
  try {
    const url = `${PAKKASIR_API_BASE_URL}/transactiondetail?project=${PROJECT_SLUG}&order_id=${orderId}&amount=${Math.round(amount)}&api_key=${API_KEY}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const tx = data.transaction || data;
    return {
      success: true,
      status: tx.status, // 'completed', 'success', 'paid', atau 'pending'
      paidAmount: tx.amount,
    };
  } catch (error) {
    console.error('Error checkPakKasirStatus:', error);
    return { success: false, error: error.message };
  }
};
