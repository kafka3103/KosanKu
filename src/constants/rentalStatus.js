/**
 * constants/rentalStatus.js
 * Enum status pengajuan sewa
 */

export const RENTAL_STATUS = {
  PENDING: 'pending',           // Menunggu respons Owner
  APPROVED: 'approved',         // Disetujui Owner → kontrak aktif
  REJECTED: 'rejected',         // Ditolak Owner
  EXPIRED: 'expired',           // Auto-expire setelah 3 hari kerja
  CANCELLED: 'cancelled',       // Dibatalkan oleh Tenant
};

export const RENTAL_STATUS_TRANSLATION_KEY = {
  [RENTAL_STATUS.PENDING]: 'rental.status.pending',
  [RENTAL_STATUS.APPROVED]: 'rental.status.approved',
  [RENTAL_STATUS.REJECTED]: 'rental.status.rejected',
  [RENTAL_STATUS.EXPIRED]: 'rental.status.expired',
  [RENTAL_STATUS.CANCELLED]: 'rental.status.cancelled',
};

export default RENTAL_STATUS;
