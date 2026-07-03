/**
 * utils/dateUtils.js
 * Utility untuk manipulasi dan format tanggal
 */

import { format, formatDistanceToNow, differenceInDays, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

/**
 * Format tanggal ke format lokal yang mudah dibaca
 * @param {string|Date} dateInput
 * @param {string} formatPattern - Default: 'd MMMM yyyy'
 * @param {string} language - 'id' | 'en'
 * @returns {string} - Contoh: "1 Juli 2026" atau "July 1, 2026"
 */
export const formatDate = (dateInput, formatPattern = 'd MMMM yyyy', language = 'id') => {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (!isValid(date)) return '-';

  return format(date, formatPattern, {
    locale: language === 'id' ? idLocale : undefined,
  });
};

/**
 * Format tanggal dengan waktu
 * @param {string|Date} dateInput
 * @returns {string} - Contoh: "1 Juli 2026, 09:30"
 */
export const formatDateTime = (dateInput, language = 'id') => {
  return formatDate(dateInput, 'd MMM yyyy, HH:mm', language);
};

/**
 * Format ke "X waktu yang lalu" / "X time ago"
 * @param {string|Date} dateInput
 * @param {string} language - 'id' | 'en'
 * @returns {string} - Contoh: "3 jam yang lalu"
 */
export const formatRelativeTime = (dateInput, language = 'id') => {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (!isValid(date)) return '-';

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: language === 'id' ? idLocale : undefined,
  });
};

/**
 * Hitung selisih hari antara dua tanggal
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {number} - Jumlah hari
 */
export const getDaysDifference = (startDate, endDate) => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start);
};

/**
 * Format periode tagihan (bulan & tahun)
 * @param {string|Date} dateInput
 * @param {string} language
 * @returns {string} - Contoh: "Juli 2026" atau "July 2026"
 */
export const formatBillingPeriod = (dateInput, language = 'id') => {
  return formatDate(dateInput, 'MMMM yyyy', language);
};

/**
 * Cek apakah tanggal sudah lewat (overdue)
 * @param {string|Date} dateInput
 * @returns {boolean}
 */
export const isDateOverdue = (dateInput) => {
  if (!dateInput) return false;
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return isValid(date) && date < new Date();
};

/**
 * Dapatkan label sisa hari hingga jatuh tempo
 * @param {string|Date} dueDateInput
 * @returns {string} - Contoh: "Jatuh tempo 3 hari lagi" atau "Terlambat 2 hari"
 */
export const getDueDateLabel = (dueDateInput, language = 'id') => {
  if (!dueDateInput) return '-';
  const dueDate = typeof dueDateInput === 'string' ? parseISO(dueDateInput) : dueDateInput;
  if (!isValid(dueDate)) return '-';

  const daysDiff = differenceInDays(dueDate, new Date());

  if (language === 'id') {
    if (daysDiff > 0) return `Jatuh tempo ${daysDiff} hari lagi`;
    if (daysDiff === 0) return 'Jatuh tempo hari ini';
    return `Terlambat ${Math.abs(daysDiff)} hari`;
  } else {
    if (daysDiff > 0) return `Due in ${daysDiff} day(s)`;
    if (daysDiff === 0) return 'Due today';
    return `${Math.abs(daysDiff)} day(s) overdue`;
  }
};
