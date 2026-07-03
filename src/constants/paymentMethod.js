/**
 * constants/paymentMethod.js
 * Enum metode pembayaran yang didukung payment gateway
 */

export const PAYMENT_METHOD = {
  BANK_TRANSFER: 'bank_transfer',
  GOPAY: 'gopay',
  OVO: 'ovo',
  DANA: 'dana',
  QRIS: 'qris',
  CREDIT_CARD: 'credit_card',
};

export const PAYMENT_METHOD_LABEL = {
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Transfer Bank',
  [PAYMENT_METHOD.GOPAY]: 'GoPay',
  [PAYMENT_METHOD.OVO]: 'OVO',
  [PAYMENT_METHOD.DANA]: 'DANA',
  [PAYMENT_METHOD.QRIS]: 'QRIS',
  [PAYMENT_METHOD.CREDIT_CARD]: 'Kartu Kredit',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS_TRANSLATION_KEY = {
  [PAYMENT_STATUS.PENDING]: 'payment.status.pending',
  [PAYMENT_STATUS.SUCCESS]: 'payment.status.success',
  [PAYMENT_STATUS.FAILED]: 'payment.status.failed',
  [PAYMENT_STATUS.EXPIRED]: 'payment.status.expired',
  [PAYMENT_STATUS.REFUNDED]: 'payment.status.refunded',
};

export default { PAYMENT_METHOD, PAYMENT_METHOD_LABEL, PAYMENT_STATUS };
