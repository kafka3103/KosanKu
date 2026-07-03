/**
 * utils/currencyUtils.js
 * Utility untuk format mata uang Rupiah
 */

/**
 * Format angka menjadi format Rupiah
 * @param {number} amount - Jumlah dalam angka
 * @param {Object} options
 * @param {boolean} options.withSymbol - Tampilkan "Rp" (default: true)
 * @param {boolean} options.compact - Format compact untuk jumlah besar (default: false)
 * @returns {string} - Contoh: "Rp 1.200.000" atau "Rp 1,2 Jt"
 */
export const formatRupiah = (amount, { withSymbol = true, compact = false } = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return withSymbol ? 'Rp -' : '-';
  }

  const numericAmount = Number(amount);

  if (compact) {
    if (numericAmount >= 1_000_000_000) {
      const formatted = (numericAmount / 1_000_000_000).toFixed(1);
      return withSymbol ? `Rp ${formatted} M` : `${formatted} M`;
    }
    if (numericAmount >= 1_000_000) {
      const formatted = (numericAmount / 1_000_000).toFixed(1);
      return withSymbol ? `Rp ${formatted} Jt` : `${formatted} Jt`;
    }
    if (numericAmount >= 1_000) {
      const formatted = (numericAmount / 1_000).toFixed(0);
      return withSymbol ? `Rp ${formatted} Rb` : `${formatted} Rb`;
    }
  }

  const formatted = numericAmount.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return withSymbol ? `Rp ${formatted}` : formatted;
};

/**
 * Parse string Rupiah kembali ke angka
 * @param {string} rupiahString - Contoh: "Rp 1.200.000"
 * @returns {number}
 */
export const parseRupiah = (rupiahString) => {
  if (!rupiahString) return 0;
  const cleaned = rupiahString.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

/**
 * Format persentase
 * @param {number} value - Nilai persentase (0-100)
 * @param {number} decimalPlaces
 * @returns {string} - Contoh: "85,5%"
 */
export const formatPercentage = (value, decimalPlaces = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimalPlaces).replace('.', ',')}%`;
};
