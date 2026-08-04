/**
 * constants/screenNames.js
 * Konstanta nama layar (screen name) untuk semua navigator.
 * Dipisah dari file navigator untuk mencegah circular dependency (require cycles).
 */

// ─── Auth ─────────────────────────────────────────────────────
export const AUTH_SCREENS = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  OTP_VERIFICATION: 'OtpVerification',
  RESET_PASSWORD: 'ResetPassword',
};

// ─── Owner ────────────────────────────────────────────────────
export const OWNER_SCREENS = {
  // Bottom Tabs
  DASHBOARD: 'OwnerDashboard',
  PROPERTY_STACK: 'PropertyStack',
  INVOICE_LIST: 'OwnerInvoiceList',
  NOTIFICATIONS: 'OwnerNotifications',
  PROFILE_TAB: 'OwnerProfileTab',
  // Stack di dalam Property
  PROPERTY_LIST: 'PropertyList',
  PROPERTY_FORM: 'PropertyForm',
  ROOM_LIST: 'RoomList',
  ROOM_FORM: 'RoomForm',
  RENTAL_REQUEST: 'RentalRequest',
  CONTRACT: 'Contract',
  FACILITY_MASTER: 'FacilityMaster',
  // Drawer Items
  TENANT_LIST: 'TenantList',
  REPORT: 'Report',
  PROFILE: 'OwnerProfile',
  SETTINGS: 'OwnerSettings',
};

// ─── Tenant ───────────────────────────────────────────────────
export const TENANT_SCREENS = {
  // Bottom Tabs
  SEARCH_STACK: 'SearchStack',
  FAVORITES: 'Favorites',
  MY_RENT_STACK: 'MyRentStack',
  NOTIFICATIONS: 'TenantNotifications',
  PROFILE_TAB: 'TenantProfileTab',
  // Stack di dalam Search
  SEARCH: 'Search',
  PROPERTY_DETAIL: 'PropertyDetail',
  ROOM_DETAIL: 'RoomDetail',
  RENTAL_REQUEST_FORM: 'RentalRequestForm',
  // Stack di dalam MyRent
  MY_RENT: 'MyRent',
  CONTRACT_DETAIL: 'ContractDetail',
  INVOICE_DETAIL: 'InvoiceDetail',
  PAYMENT: 'Payment',
  // Drawer Items
  PROFILE: 'TenantProfile',
  SETTINGS: 'TenantSettings',
};
