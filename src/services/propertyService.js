/**
 * services/propertyService.js
 * Service layer untuk semua operasi properti & kamar:
 * - properties: CRUD milik owner
 * - rooms: CRUD kamar dalam properti
 * - room_facilities: manajemen fasilitas per kamar
 * - facility_master: ambil daftar fasilitas tersedia
 */

import supabaseClient from './supabaseClient';

const PROPERTY_PHOTOS_BUCKET = 'property-photos';
const ROOM_PHOTOS_BUCKET = 'room-photos';

// ─── Properties ───────────────────────────────────────────────

/**
 * Ambil semua properti milik owner yang login
 * Include jumlah kamar dan kamar yang terisi
 *
 * @param {string} ownerId
 */
export const getOwnerProperties = async (ownerId) => {
  const { data, error } = await supabaseClient
    .from('properties')
    .select(`
      *,
      rooms(id, status)
    `)
    .eq('owner_id', ownerId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  // Hitung statistik kamar
  const enriched = data.map((property) => ({
    ...property,
    total_rooms: property.rooms?.length ?? 0,
    occupied_rooms: property.rooms?.filter((r) => r.status === 'occupied').length ?? 0,
    available_rooms: property.rooms?.filter((r) => r.status === 'available').length ?? 0,
  }));

  return { data: enriched, error: null };
};

/**
 * Ambil satu properti berdasarkan ID (dengan semua kamar)
 *
 * @param {string} propertyId
 */
export const getPropertyById = async (propertyId) => {
  const { data, error } = await supabaseClient
    .from('properties')
    .select(`
      *,
      rooms(
        *,
        room_facilities(
          *,
          facility_master(*)
        )
      )
    `)
    .eq('id', propertyId)
    .eq('is_deleted', false)
    .single();

  return { data, error };
};

/**
 * Buat properti baru
 *
 * @param {string} ownerId
 * @param {Object} propertyData
 */
export const createProperty = async (ownerId, propertyData) => {
  const { data, error } = await supabaseClient
    .from('properties')
    .insert({ owner_id: ownerId, is_active: true, ...propertyData })
    .select()
    .single();

  return { data, error };
};

/**
 * Update properti yang sudah ada
 *
 * @param {string} propertyId
 * @param {Object} propertyData
 */
export const updateProperty = async (propertyId, propertyData) => {
  const { data, error } = await supabaseClient
    .from('properties')
    .update({ ...propertyData, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select()
    .single();

  return { data, error };
};

/**
 * Soft delete properti
 *
 * @param {string} propertyId
 */
export const deleteProperty = async (propertyId) => {
  const { data, error } = await supabaseClient
    .from('properties')
    .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select()
    .single();

  return { data, error };
};

/**
 * Upload foto properti ke Storage, kembalikan URL publik
 *
 * @param {string} propertyId
 * @param {string} localUri
 * @param {string} fileName - nama unik file
 */
export const uploadPropertyPhoto = async (propertyId, localUri, fileName) => {
  try {
    const ext = localUri.split('.').pop() ?? 'jpg';
    const path = `${propertyId}/${fileName}.${ext}`;
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error: uploadError } = await supabaseClient.storage
      .from(PROPERTY_PHOTOS_BUCKET)
      .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) return { url: null, error: uploadError };

    const { data } = supabaseClient.storage
      .from(PROPERTY_PHOTOS_BUCKET)
      .getPublicUrl(path);

    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: err };
  }
};

// ─── Rooms ────────────────────────────────────────────────────

/**
 * Ambil semua kamar dalam sebuah properti
 * Include data fasilitas
 *
 * @param {string} propertyId
 */
export const getPropertyRooms = async (propertyId) => {
  const { data, error } = await supabaseClient
    .from('rooms')
    .select(`
      *,
      room_facilities(
        *,
        facility_master(name, icon_name, category)
      )
    `)
    .eq('property_id', propertyId)
    .eq('is_deleted', false)
    .order('room_number', { ascending: true });

  return { data, error };
};

/**
 * Ambil satu kamar berdasarkan ID
 *
 * @param {string} roomId
 */
export const getRoomById = async (roomId) => {
  const { data, error } = await supabaseClient
    .from('rooms')
    .select(`
      *,
      room_facilities(
        *,
        facility_master(*)
      ),
      properties(name, address_line, city, owner_id, billing_generate_day, billing_due_days)
    `)
    .eq('id', roomId)
    .single();

  return { data, error };
};

/**
 * Buat kamar baru
 *
 * @param {string} propertyId
 * @param {Object} roomData
 */
export const createRoom = async (propertyId, roomData) => {
  const { data, error } = await supabaseClient
    .from('rooms')
    .insert({ property_id: propertyId, ...roomData })
    .select()
    .single();

  return { data, error };
};

/**
 * Update data kamar
 *
 * @param {string} roomId
 * @param {Object} roomData
 */
export const updateRoom = async (roomId, roomData) => {
  const { data, error } = await supabaseClient
    .from('rooms')
    .update({ ...roomData, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .select()
    .single();

  return { data, error };
};

/**
 * Soft delete kamar
 *
 * @param {string} roomId
 */
export const deleteRoom = async (roomId) => {
  const { data, error } = await supabaseClient
    .from('rooms')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .select()
    .single();

  return { data, error };
};

/**
 * Upload foto kamar
 *
 * @param {string} roomId
 * @param {string} localUri
 * @param {string} fileName
 */
export const uploadRoomPhoto = async (roomId, localUri, fileName) => {
  try {
    const ext = localUri.split('.').pop() ?? 'jpg';
    const path = `${roomId}/${fileName}.${ext}`;
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error: uploadError } = await supabaseClient.storage
      .from(ROOM_PHOTOS_BUCKET)
      .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) return { url: null, error: uploadError };

    const { data } = supabaseClient.storage
      .from(ROOM_PHOTOS_BUCKET)
      .getPublicUrl(path);

    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: err };
  }
};

// ─── Facility Master ──────────────────────────────────────────

/**
 * Ambil semua fasilitas dari master data (untuk form kamar)
 */
export const getFacilityMaster = async () => {
  const { data, error } = await supabaseClient
    .from('facility_master')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return { data, error };
};

// ─── Room Facilities ──────────────────────────────────────────

/**
 * Set fasilitas kamar (replace semua — delete lama, insert baru)
 *
 * @param {string} roomId
 * @param {Array<{facility_id: string, additional_cost: number|null}>} facilities
 */
export const setRoomFacilities = async (roomId, facilities) => {
  // Hapus semua fasilitas lama
  const { error: deleteError } = await supabaseClient
    .from('room_facilities')
    .delete()
    .eq('room_id', roomId);

  if (deleteError) return { data: null, error: deleteError };

  if (!facilities || facilities.length === 0) return { data: [], error: null };

  // Insert fasilitas baru
  const inserts = facilities.map((f) => ({
    room_id: roomId,
    facility_id: f.facility_id,
    additional_cost: f.additional_cost ?? null,
  }));

  const { data, error } = await supabaseClient
    .from('room_facilities')
    .insert(inserts)
    .select();

  return { data, error };
};

// ─── Dashboard Stats ──────────────────────────────────────────

/**
 * Ambil statistik dashboard owner
 *
 * @param {string} ownerId
 */
export const getOwnerDashboardStats = async (ownerId) => {
  const [propertiesResult, invoicesResult, requestsResult] = await Promise.all([
    // Total properti & kamar
    supabaseClient
      .from('properties')
      .select('id, rooms(id, status)')
      .eq('owner_id', ownerId)
      .eq('is_deleted', false),

    // Invoice bulan ini
    supabaseClient
      .from('invoices')
      .select('id, total_amount, paid_amount, status, billing_period')
      .eq('owner_id', ownerId),

    // Pengajuan sewa pending
    supabaseClient
      .from('rental_requests')
      .select('id, status, created_at, rooms(room_number, properties(name)), users!rental_requests_tenant_id_fkey(full_name)')
      .eq('owner_id', ownerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const properties = propertiesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const pendingRequests = requestsResult.data ?? [];

  const allRooms = properties.flatMap((p) => p.rooms ?? []);
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const monthlyInvoices = invoices.filter(
    (inv) => inv.billing_period?.startsWith(currentMonth)
  );
  const monthlyRevenue = monthlyInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount ?? 0), 0);
  const unpaidCount = invoices.filter((inv) => ['unpaid', 'overdue'].includes(inv.status)).length;

  return {
    data: {
      totalProperties: properties.length,
      totalRooms: allRooms.length,
      occupiedRooms: allRooms.filter((r) => r.status === 'occupied').length,
      availableRooms: allRooms.filter((r) => r.status === 'available').length,
      monthlyRevenue,
      unpaidInvoicesCount: unpaidCount,
      pendingRequests,
    },
    error: null,
  };
};

// ─── Rental Requests (Owner) ──────────────────────────────────

/**
 * Ambil semua pengajuan sewa untuk owner
 *
 * @param {string} ownerId
 * @param {'pending'|'approved'|'rejected'|'all'} statusFilter
 */
export const getOwnerRentalRequests = async (ownerId, statusFilter = 'all') => {
  let query = supabaseClient
    .from('rental_requests')
    .select(`
      *,
      rooms(room_number, base_price, properties(name, address_line, city)),
      users!rental_requests_tenant_id_fkey(id, full_name, phone_number, avatar_url)
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  return { data, error };
};

/**
 * Approve pengajuan sewa
 *
 * @param {string} requestId
 */
export const approveRentalRequest = async (requestId) => {
  const { data, error } = await supabaseClient
    .from('rental_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  return { data, error };
};

/**
 * Tolak pengajuan sewa
 *
 * @param {string} requestId
 * @param {string} reason
 */
export const rejectRentalRequest = async (requestId, reason) => {
  const { data, error } = await supabaseClient
    .from('rental_requests')
    .update({
      status: 'rejected',
      owner_rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  return { data, error };
};

// ─── Tenants (Owner) ──────────────────────────────────────────

/**
 * Ambil semua tenant aktif owner (dari kontrak active)
 *
 * @param {string} ownerId
 */
export const getOwnerActiveTenants = async (ownerId) => {
  const { data, error } = await supabaseClient
    .from('contracts')
    .select(`
      *,
      rooms(room_number, properties(name)),
      users!contracts_tenant_id_fkey(id, full_name, phone_number, avatar_url, email)
    `)
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('start_date', { ascending: false });

  return { data, error };
};
