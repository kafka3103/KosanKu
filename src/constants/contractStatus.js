/**
 * constants/contractStatus.js
 * Enum status kontrak hunian
 */

export const CONTRACT_STATUS = {
  ACTIVE: 'active',           // Kontrak berjalan
  ENDED: 'ended',             // Kontrak selesai natural (jatuh tempo)
  TERMINATED: 'terminated',   // Diakhiri sepihak oleh Owner
  EARLY_EXIT: 'early_exit',   // Tenant keluar lebih awal (approved)
};

export const CONTRACT_STATUS_TRANSLATION_KEY = {
  [CONTRACT_STATUS.ACTIVE]: 'contract.status.active',
  [CONTRACT_STATUS.ENDED]: 'contract.status.ended',
  [CONTRACT_STATUS.TERMINATED]: 'contract.status.terminated',
  [CONTRACT_STATUS.EARLY_EXIT]: 'contract.status.earlyExit',
};

export default CONTRACT_STATUS;
