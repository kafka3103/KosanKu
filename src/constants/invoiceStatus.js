/**
 * constants/invoiceStatus.js
 * Enum status tagihan bulanan
 */

export const INVOICE_STATUS = {
  UNPAID: 'unpaid',       // Belum dibayar, belum jatuh tempo
  PAID: 'paid',           // Lunas
  OVERDUE: 'overdue',     // Melewati tanggal jatuh tempo
  PARTIAL: 'partial',     // Bayar sebagian (jika diizinkan)
  CANCELLED: 'cancelled', // Dibatalkan Owner
};

export const INVOICE_STATUS_TRANSLATION_KEY = {
  [INVOICE_STATUS.UNPAID]: 'billing.status.unpaid',
  [INVOICE_STATUS.PAID]: 'billing.status.paid',
  [INVOICE_STATUS.OVERDUE]: 'billing.status.overdue',
  [INVOICE_STATUS.PARTIAL]: 'billing.status.partial',
  [INVOICE_STATUS.CANCELLED]: 'billing.status.cancelled',
};

export default INVOICE_STATUS;
