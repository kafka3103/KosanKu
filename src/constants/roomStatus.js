/**
 * constants/roomStatus.js
 * Enum status kamar — digunakan di database (PostgreSQL enum) dan UI
 */

export const ROOM_STATUS = {
  AVAILABLE: 'available',
  PENDING: 'pending',       // Ada pengajuan aktif
  OCCUPIED: 'occupied',     // Sedang dihuni
  MAINTENANCE: 'maintenance',
};

/**
 * Mapping status kamar ke label translation key (digunakan dengan i18n.t())
 */
export const ROOM_STATUS_TRANSLATION_KEY = {
  [ROOM_STATUS.AVAILABLE]: 'room.status.available',
  [ROOM_STATUS.PENDING]: 'room.status.pending',
  [ROOM_STATUS.OCCUPIED]: 'room.status.occupied',
  [ROOM_STATUS.MAINTENANCE]: 'room.status.maintenance',
};

export default ROOM_STATUS;
