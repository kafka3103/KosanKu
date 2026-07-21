/**
 * services/invoiceService.js
 * Service layer untuk operasi tagihan (invoices), pembayaran (payments),
 * dan kontrak (contracts)
 */

import supabaseClient from './supabaseClient';
import { sendNotification } from './notificationService';

// ─── Invoices ─────────────────────────────────────────────────


/**
 * Ambil semua invoice milik owner (dengan filter status)
 *
 * @param {string} ownerId
 * @param {string} statusFilter - 'all' | 'unpaid' | 'paid' | 'overdue'
 */
export const getOwnerInvoices = async (ownerId, statusFilter = 'all') => {
  let query = supabaseClient
    .from('invoices')
    .select(`
      *,
      rooms(room_number, properties(name)),
      users!invoices_tenant_id_fkey(full_name, phone_number)
    `)
    .eq('owner_id', ownerId)
    .order('due_date', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  return { data, error };
};

/**
 * Ambil semua invoice milik tenant
 *
 * @param {string} tenantId
 * @param {string} statusFilter - 'all' | 'unpaid' | 'paid' | 'overdue'
 */
export const getTenantInvoices = async (tenantId, statusFilter = 'all') => {
  let query = supabaseClient
    .from('invoices')
    .select(`
      *,
      rooms(room_number, properties(name, address_line, city))
    `)
    .eq('tenant_id', tenantId)
    .order('billing_period', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  return { data, error };
};

/**
 * Ambil detail invoice lengkap termasuk item-item tagihan
 *
 * @param {string} invoiceId
 */
export const getInvoiceDetail = async (invoiceId) => {
  const { data, error } = await supabaseClient
    .from('invoices')
    .select(`
      *,
      invoice_items(*),
      rooms(room_number, properties(name, address_line, city)),
      users!invoices_tenant_id_fkey(full_name, phone_number, email),
      contracts(start_date, end_date, monthly_rate, deposit_amount)
    `)
    .eq('id', invoiceId)
    .single();

  return { data, error };
};

// ─── Contracts ────────────────────────────────────────────────

/**
 * Ambil kontrak aktif tenant (hanya boleh ada satu)
 *
 * @param {string} tenantId
 */
export const getTenantActiveContract = async (tenantId) => {
  const { data, error } = await supabaseClient
    .from('contracts')
    .select(`
      *,
      contract_facilities(
        *,
        facility_master(name, icon_name)
      ),
      rooms(
        room_number,
        base_price,
        photo_urls,
        room_facilities(
          facility_master(name, icon_name)
        ),
        properties(
          name,
          address_line,
          city,
          cover_photo_url,
          general_facilities,
          users!properties_owner_id_fkey(full_name, phone_number)
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  // PGRST116 = no rows found — bukan error kritis untuk tenant baru
  if (error?.code === 'PGRST116') return { data: null, error: null };

  return { data, error };
};

/**
 * Ambil semua kontrak owner (untuk laporan)
 *
 * @param {string} ownerId
 */
export const getOwnerContracts = async (ownerId) => {
  const { data, error } = await supabaseClient
    .from('contracts')
    .select(`
      *,
      contract_facilities(
        *,
        facility_master(name, icon_name)
      ),
      rooms(room_number, properties(name)),
      users!contracts_tenant_id_fkey(full_name, phone_number)
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Ambil kontrak spesifik berdasarkan ID
 *
 * @param {string} contractId
 */
export const getContractById = async (contractId) => {
  const { data, error } = await supabaseClient
    .from('contracts')
    .select(`
      *,
      contract_facilities(
        *,
        facility_master(name, icon_name)
      ),
      rooms(
        *,
        room_facilities(facility_master(name, icon_name)),
        properties(*)
      ),
      users!contracts_tenant_id_fkey(full_name, phone_number, email, avatar_url),
      rental_requests(ktp_photo_url, tenant_message)
    `)
    .eq('id', contractId)
    .single();

  return { data, error };
};

/**
 * Akhiri kontrak (owner terminate atau early exit tenant)
 *
 * @param {string} contractId
 * @param {'terminated'|'early_exit'} endStatus
 * @param {string} reason
 */
export const endContract = async (contractId, endStatus, reason) => {
  const { data, error } = await supabaseClient
    .from('contracts')
    .update({
      status: endStatus,
      end_reason: endStatus === 'terminated' ? 'terminated_by_owner' : 'early_exit_approved',
      end_reason_note: reason,
      actual_end_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId)
    .select()
    .single();

  return { data, error };
};

/**
 * Ambil daftar fasilitas tambahan yang disewa pada sebuah kontrak
 *
 * @param {string} contractId
 */
export const getContractFacilities = async (contractId) => {
  const { data, error } = await supabaseClient
    .from('contract_facilities')
    .select(`
      *,
      facility_master(name, icon_name)
    `)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true });

  return { data, error };
};

/**
 * Tambahkan fasilitas opsional ke kontrak sewa berjalan via RPC Smart Billing
 *
 * @param {Object} params
 * @param {string} params.contractId
 * @param {string|null} params.facilityId
 * @param {string|null} params.customName
 * @param {number} params.pricePerMonth
 * @param {'next_invoice'|'bill_immediately'} params.billingMode
 */
export const addContractFacility = async ({
  contractId,
  facilityId = null,
  customName = null,
  pricePerMonth = 0,
  billingMode = 'next_invoice',
}) => {
  const { data, error } = await supabaseClient.rpc('add_facility_to_contract', {
    p_contract_id: contractId,
    p_facility_id: facilityId,
    p_custom_name: customName,
    p_price_per_month: pricePerMonth,
    p_billing_mode: billingMode,
  });

  // Kirim notifikasi dari FE untuk menghindari RLS violation dari dalam fungsi DB
  if (!error && data?.billing_action === 'invoice_created' && data?.tenant_id) {
    await sendNotification({
      userId: data.tenant_id,
      title: 'facility_invoice_title',
      body: JSON.stringify({ key: 'facility_invoice_body', params: { amount: `Rp ${pricePerMonth.toLocaleString('id-ID')}`, facilityName: data.facility_name ?? customName ?? 'fasilitas tambahan' } }),
      type: 'invoice_generated',
      referenceId: data.invoice_id,
      referenceType: 'invoice',
    });
  }

  return { data, error };
};


/**
 * Ubah status fasilitas tambahan pada kontrak (misal nonaktif/berhenti sewa)
 *
 * @param {string} contractFacilityId
 * @param {'active'|'inactive'|'cancelled'} status
 */
export const updateContractFacilityStatus = async (contractFacilityId, status) => {
  const { data, error } = await supabaseClient.rpc('update_contract_facility_status', {
    p_contract_facility_id: contractFacilityId,
    p_new_status: status,
    p_end_date: new Date().toISOString().split('T')[0],
  });

  return { data, error };
};

// ─── Payments ─────────────────────────────────────────────────

/**
 * Ambil riwayat pembayaran untuk sebuah invoice
 *
 * @param {string} invoiceId
 */
export const getInvoicePayments = async (invoiceId) => {
  const { data, error } = await supabaseClient
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Catat pembayaran manual (misalnya transfer bank yang dikonfirmasi owner)
 * Dalam flow nyata, ini dipanggil setelah webhook gateway
 *
 * @param {Object} paymentData
 */
export const recordManualPayment = async (paymentData) => {
  const { data, error } = await supabaseClient
    .from('payments')
    .insert({
      ...paymentData,
      status: 'success',
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
};

// ─── Report (Owner) ───────────────────────────────────────────

/**
 * Ambil statistik pendapatan owner per bulan (12 bulan terakhir)
 *
 * @param {string} ownerId
 */
export const getOwnerRevenueReport = async (ownerId) => {
  // 12 bulan terakhir
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 11);
  const startPeriod = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabaseClient
    .from('invoices')
    .select('billing_period, total_amount, paid_amount, status')
    .eq('owner_id', ownerId)
    .gte('billing_period', startPeriod)
    .order('billing_period', { ascending: true });

  if (error) return { data: null, error };

  // Group by bulan
  const byMonth = {};
  data.forEach((inv) => {
    const month = inv.billing_period?.slice(0, 7) ?? 'unknown';
    if (!byMonth[month]) {
      byMonth[month] = { month, total: 0, paid: 0, unpaid: 0 };
    }
    byMonth[month].total += parseFloat(inv.total_amount ?? 0);
    if (inv.status === 'paid') {
      byMonth[month].paid += parseFloat(inv.paid_amount ?? 0);
    } else {
      byMonth[month].unpaid += parseFloat(inv.total_amount ?? 0);
    }
  });

  return { data: Object.values(byMonth), error: null };
};
