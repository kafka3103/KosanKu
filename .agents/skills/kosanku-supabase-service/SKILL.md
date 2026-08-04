---
name: kosanku-supabase-service
description: Pola pembuatan dan modifikasi service layer Supabase di KosanKu. Gunakan skill ini saat diminta membuat service baru, menambah query, membuat migrasi SQL, mengubah RLS policy, atau bekerja dengan database/backend.
---

# Pola Service Layer & Database KosanKu

## Supabase Client
Selalu impor dari satu sumber:
```js
import { supabaseClient } from './supabaseClient';
// ATAU
import supabaseClient from './supabaseClient';
```

## Pola Service Function
Semua service function mengembalikan `{ data, error }`:

```js
/**
 * Deskripsi fungsi
 * @param {string} userId - ID user
 * @returns {{ data: Array|null, error: Error|null }}
 */
export const getItems = async (userId) => {
  const { data, error } = await supabaseClient
    .from('table_name')
    .select('*, related_table(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getItems error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};
```

## Daftar Service & Tanggung Jawab

| Service | File | Fungsi Utama |
|---|---|---|
| Auth | `authService.js` | Login email/Google, register, OTP, reset password, deactivate |
| Property | `propertyService.js` | CRUD properti, kamar, kontrak, rental request, fasilitas |
| Invoice | `invoiceService.js` | Tagihan, realtime subscription, update status |
| Search | `searchService.js` | Pencarian properti, filter, favorit, kota |
| User | `userService.js` | Profil, upload foto, notifikasi, verifikasi |
| Review | `reviewService.js` | CRUD ulasan tenant |
| Notification | `notificationService.js` | Push notification via Expo |
| Translation | `translationService.js` | Terjemahan AI via Edge Function |
| Payment | `xenditService.js` | Pembayaran via Xendit Edge Function |

## Tabel Database Utama

```
users (id, email, full_name, phone, role, avatar_url, is_active, preferred_language)
properties (id, owner_id, name, name_en, address_line, city, latitude, longitude, gender_policy, cover_photo_url)
rooms (id, property_id, room_number, base_price, status [available|occupied|maintenance], description, description_en)
contracts (id, room_id, tenant_id, start_date, end_date, monthly_rent, status [active|expired|terminated])
invoices (id, contract_id, amount, due_date, status [unpaid|paid|overdue|cancelled], paid_at)
rental_requests (id, room_id, tenant_id, status [pending|approved|rejected], tenant_nik)
reviews (id, property_id, tenant_id, average_rating, comment)
favorites (id, user_id, property_id)
notifications (id, user_id, title, body, is_read, type)
facility_master (id, name, name_en, category [room|general|optional], icon)
room_facilities (room_id, facility_id)
optional_facility_requests (id, contract_id, facility_id, status)
```

## Realtime Subscription
```js
export const subscribeToUserInvoicesRealtime = (userId, role, callback) => {
  const channel = supabaseClient
    .channel(`invoices-${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'invoices' },
      (payload) => { callback(payload); }
    )
    .subscribe();
  return channel;
};
// Jangan lupa unsubscribe di useEffect cleanup!
```

## Pola Migrasi SQL
File migrasi di `supabase/migrations/` dengan format `NNN_nama_deskriptif.sql`:
```sql
-- supabase/migrations/031_add_new_column.sql

-- Tambah kolom
ALTER TABLE properties ADD COLUMN IF NOT EXISTS new_field TEXT DEFAULT '';

-- Update RLS jika perlu
CREATE POLICY "Users can read new_field"
  ON properties FOR SELECT
  USING (true);
```

## Storage (Upload File)
```js
const uploadPhoto = async (bucket, filePath, file) => {
  const { data, error } = await supabaseClient.storage
    .from(bucket)  // 'property-photos', 'user-avatars'
    .upload(filePath, file, { contentType: 'image/jpeg', upsert: true });
  return { data, error };
};
```

## Edge Functions (Xendit Payment)
Payment menggunakan Supabase Edge Functions:
```js
const { data, error } = await supabaseClient.functions.invoke('xendit-create-invoice', {
  body: { invoiceId, amount, payerEmail, description }
});
```

## Checklist Membuat Service Baru
1. [ ] Buat file `.js` di `src/services/`
2. [ ] Import `supabaseClient` dari `./supabaseClient`
3. [ ] Semua fungsi mengembalikan `{ data, error }` 
4. [ ] Tambahkan `console.error` untuk debugging
5. [ ] Jika ada tabel baru, buat file migrasi SQL di `supabase/migrations/`
6. [ ] Pastikan RLS policy sudah ditambahkan di migrasi
