/**
 * services/searchService.js
 * Service layer untuk pencarian properti & kamar oleh Tenant
 * Mendukung filter harga, kota, gender policy, dan fasilitas
 */

import supabaseClient from './supabaseClient';

/**
 * Cari properti & kamar yang tersedia berdasarkan filter
 *
 * @param {Object} filters
 * @param {string} [filters.city]
 * @param {number} [filters.minPrice]
 * @param {number} [filters.maxPrice]
 * @param {'male'|'female'|'mixed'} [filters.genderPolicy]
 * @param {string} [filters.roomType] - 'standard'|'deluxe'|'suite'|'studio'
 * @param {string} [filters.searchQuery] - teks bebas nama properti
 * @param {number} [filters.page] - halaman pagination (default 0)
 * @param {number} [filters.pageSize] - ukuran halaman (default 20)
 */
export const searchProperties = async (filters = {}) => {
  const {
    city,
    minPrice,
    maxPrice,
    genderPolicy,
    roomType,
    searchQuery,
    page = 0,
    pageSize = 20,
  } = filters;

  let query = supabaseClient
    .from('properties')
    .select(`
      id,
      name,
      description,
      address_line,
      city,
      district,
      latitude,
      longitude,
      gender_policy,
      general_facilities,
      cover_photo_url,
      photo_urls,
      rules,
      rooms!inner(
        id,
        room_number,
        room_type,
        base_price,
        status,
        size_sqm,
        photo_urls,
        room_facilities(
          facility_master(name, icon_name)
        )
      ),
      users!properties_owner_id_fkey(full_name, phone_number)
    `)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('rooms.is_deleted', false)
    .eq('rooms.status', 'available');

  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  if (genderPolicy && genderPolicy !== 'all') {
    query = query.eq('gender_policy', genderPolicy);
  }

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,address_line.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
  }

  if (minPrice != null) {
    query = query.gte('rooms.base_price', minPrice);
  }

  if (maxPrice != null) {
    query = query.lte('rooms.base_price', maxPrice);
  }

  if (roomType) {
    query = query.eq('rooms.room_type', roomType);
  }

  // Pagination
  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  return { data, error };
};

/**
 * Ambil detail properti lengkap untuk halaman detail tenant
 * Sertakan semua kamar available dan info owner
 *
 * @param {string} propertyId
 */
export const getPropertyDetailForTenant = async (propertyId) => {
  const { data, error } = await supabaseClient
    .from('properties')
    .select(`
      *,
      rooms(
        *,
        room_facilities(
          additional_cost,
          facility_master(name, icon_name, category)
        )
      ),
      users!properties_owner_id_fkey(full_name, phone_number, avatar_url)
    `)
    .eq('id', propertyId)
    .eq('is_deleted', false)
    .eq('rooms.is_deleted', false)
    .single();

  return { data, error };
};

/**
 * Ambil daftar properti favorit tenant
 *
 * @param {string} tenantId
 */
export const getTenantFavorites = async (tenantId) => {
  const { data, error } = await supabaseClient
    .from('favorites')
    .select(`
      id,
      created_at,
      properties(
        id,
        name,
        address_line,
        city,
        cover_photo_url,
        gender_policy,
        rooms(base_price, status)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Toggle favorit — tambah jika belum ada, hapus jika sudah ada
 *
 * @param {string} tenantId
 * @param {string} propertyId
 * @returns {Promise<{isFavorite: boolean, error: Error|null}>}
 */
export const toggleFavorite = async (tenantId, propertyId) => {
  // Cek apakah sudah difavorit
  const { data: existing } = await supabaseClient
    .from('favorites')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId)
    .single();

  if (existing) {
    // Hapus favorit
    const { error } = await supabaseClient
      .from('favorites')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId);

    return { isFavorite: false, error };
  } else {
    // Tambah favorit
    const { error } = await supabaseClient
      .from('favorites')
      .insert({ tenant_id: tenantId, property_id: propertyId });

    return { isFavorite: true, error };
  }
};

/**
 * Cek apakah properti sudah difavorit oleh tenant
 *
 * @param {string} tenantId
 * @param {string} propertyId
 */
export const checkIsFavorite = async (tenantId, propertyId) => {
  const { data } = await supabaseClient
    .from('favorites')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId)
    .single();

  return !!data;
};

/**
 * Kirim pengajuan sewa (tenant ke owner)
 *
 * @param {Object} requestData
 * @param {string} requestData.roomId
 * @param {string} requestData.tenantId
 * @param {string} requestData.ownerId
 * @param {string} requestData.requestedStartDate - ISO date string
 * @param {number} requestData.durationMonths
 * @param {number} requestData.monthlyRate
 * @param {string} [requestData.ktpPhotoUrl]
 * @param {string} [requestData.tenantMessage]
 */
export const submitRentalRequest = async (requestData) => {
  // Hitung tanggal kadaluarsa pengajuan (3 hari kerja ~ 4 hari kalender)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 4);

  const { data, error } = await supabaseClient
    .from('rental_requests')
    .insert({
      room_id: requestData.roomId,
      tenant_id: requestData.tenantId,
      owner_id: requestData.ownerId,
      requested_start_date: requestData.requestedStartDate,
      duration_months: requestData.durationMonths,
      monthly_rate: requestData.monthlyRate,
      ktp_photo_url: requestData.ktpPhotoUrl ?? null,
      tenant_message: requestData.tenantMessage ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Ambil pengajuan sewa aktif tenant (status pending/approved)
 *
 * @param {string} tenantId
 */
export const getTenantRentalRequests = async (tenantId) => {
  const { data, error } = await supabaseClient
    .from('rental_requests')
    .select(`
      *,
      rooms(
        room_number,
        base_price,
        photo_urls,
        properties(name, address_line, city, cover_photo_url)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Batalkan pengajuan sewa (oleh tenant)
 *
 * @param {string} requestId
 * @param {string} tenantId - untuk validasi kepemilikan
 */
export const cancelRentalRequest = async (requestId, tenantId) => {
  const { data, error } = await supabaseClient
    .from('rental_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .select()
    .single();

  return { data, error };
};

/**
 * Ambil daftar kota yang punya properti aktif (untuk filter)
 */
export const getAvailableCities = async () => {
  const { data, error } = await supabaseClient
    .from('properties')
    .select('city')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (error) return { data: [], error };

  // Deduplicate
  const cities = [...new Set(data.map((p) => p.city))].filter(Boolean).sort();
  return { data: cities, error: null };
};
