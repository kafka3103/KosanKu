/**
 * utils/validationUtils.js
 * Utility validasi form untuk semua input di aplikasi KosanKu
 */

/**
 * Validasi format email
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email?.trim() ?? '');
};

/**
 * Validasi format nomor telepon Indonesia
 * Menerima format: 08xxx, +628xxx, 628xxx
 * @param {string} phoneNumber
 * @returns {boolean}
 */
export const isValidIndonesianPhone = (phoneNumber) => {
  const cleaned = (phoneNumber ?? '').replace(/[\s\-]/g, '');
  const phonePattern = /^(\+62|62|0)8[1-9][0-9]{7,10}$/;
  return phonePattern.test(cleaned);
};

/**
 * Normalisasi nomor telepon ke format internasional +628xxx
 * @param {string} phoneNumber
 * @returns {string}
 */
export const normalizePhoneNumber = (phoneNumber) => {
  const cleaned = (phoneNumber ?? '').replace(/[\s\-]/g, '');
  if (cleaned.startsWith('+62')) return cleaned;
  if (cleaned.startsWith('62')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+62${cleaned.slice(1)}`;
  return cleaned;
};

/**
 * Validasi kekuatan password
 * @param {string} password
 * @returns {{ isValid: boolean, errorKey: string|null }}
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, errorKey: 'auth.errors.passwordRequired' };
  }
  if (password.length < 8) {
    return { isValid: false, errorKey: 'auth.errors.passwordTooShort' };
  }
  return { isValid: true, errorKey: null };
};

/**
 * Validasi field wajib (tidak boleh kosong)
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export const isNotEmpty = (value) => {
  return value !== null && value !== undefined && String(value).trim().length > 0;
};

/**
 * Validasi harga (angka positif)
 * @param {string|number} value
 * @returns {boolean}
 */
export const isValidPositiveNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validasi koordinat GPS
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export const isValidCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

/**
 * Validasi tanggal billingGenerateDay (1-28)
 * @param {number} day
 * @returns {boolean}
 */
export const isValidBillingDay = (day) => {
  const num = Number(day);
  return Number.isInteger(num) && num >= 1 && num <= 28;
};
