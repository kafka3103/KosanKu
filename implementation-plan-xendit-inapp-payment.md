# Implementation Plan: Xendit In-App Payment (KosanKu)

## Tujuan
User membayar sewa kos tanpa merasa keluar dari aplikasi KosanKu, menggunakan Xendit akun gratis/self-serve + Supabase Edge Functions.

## Strategi
Gunakan **Xendit Invoice API** (sudah cocok untuk free tier) + render checkout page-nya di dalam **`react-native-webview`**, bukan browser eksternal. Status pembayaran dipantau via **webhook Xendit → Supabase Edge Function → Realtime → React Native**.

---

## Fase 1 — Backend: Create Invoice via Supabase Edge Function

**File:** `supabase/functions/create-invoice/index.ts`

1. Terima request dari app: `{ tenant_id, amount, description, invoice_ref }`
2. Panggil Xendit API `POST /v2/invoices` dengan:
   - `success_redirect_url`: `kosanku://payment/success`
   - `failure_redirect_url`: `kosanku://payment/failed`
   - `payment_methods`: batasi ke metode yang didukung akun gratis (VA, QRIS, e-wallet — cek dashboard Xendit kamu untuk daftar aktif)
3. Simpan response (`invoice_id`, `invoice_url`, `status: PENDING`) ke tabel `payments` di Supabase
4. Return `invoice_url` ke client

> Catatan: `success_redirect_url`/`failure_redirect_url` diisi **custom URL scheme app kamu**, bukan URL web. Ini kunci supaya WebView bisa "menangkap" event selesai dan menutup diri secara otomatis.

## Fase 2 — Setup Deep Link / URL Scheme di React Native

1. Daftarkan scheme `kosanku://` di `app.json` (Expo):
```json
{
  "expo": {
    "scheme": "kosanku"
  }
}
```
2. Pastikan `expo-linking` terpasang untuk menangani deep link masuk.

## Fase 3 — Komponen WebView Pembayaran

**File:** `src/screens/tenant/PaymentWebViewScreen.jsx`

1. Install: `npx expo install react-native-webview`
2. Terima `invoice_url` dari navigation params
3. Render `<WebView source={{ uri: invoice_url }} onNavigationStateChange={...} />`
4. Di `onNavigationStateChange`, deteksi jika `event.url` mulai dengan `kosanku://payment/success` atau `kosanku://payment/failed`
5. Jika terdeteksi:
   - Hentikan WebView (jangan biarkan lanjut load, karena custom scheme tidak bisa di-load browser)
   - Navigate balik ke `PaymentStatusScreen` dengan hasil sementara (`optimistic UI`)
   - Status final tetap menunggu konfirmasi webhook (langkah Fase 4) untuk keamanan — jangan percaya redirect URL sebagai bukti bayar sah

## Fase 4 — Webhook Handler (sumber kebenaran status pembayaran)

**File:** `supabase/functions/xendit-webhook/index.ts`

1. Endpoint public menerima callback dari Xendit saat invoice `PAID`/`EXPIRED`
2. **Verifikasi `x-callback-token`** header terhadap secret dari dashboard Xendit (wajib, supaya endpoint tidak bisa dipalsukan)
3. Update tabel `payments`: status, paid_at, payment_method
4. Trigger push notification FCM (pakai Edge Function yang sudah kamu buat sebelumnya) ke pemilik & penyewa
5. (Opsional) Insert ke tabel `notifications` untuk in-app notification list

## Fase 5 — Realtime Update di App

1. Di `PaymentStatusScreen`, subscribe ke Supabase Realtime pada tabel `payments` filter `id = invoice_id`
2. Saat webhook mengubah status jadi `PAID`, UI otomatis update tanpa perlu refresh manual
3. Tampilkan konfirmasi sukses + navigasi ke halaman invoice/riwayat pembayaran

## Fase 6 — Handling E-Wallet Deep Link dari dalam WebView

1. E-wallet (OVO/DANA/ShopeePay) akan memicu `mobile_deeplink_checkout_url` yang otomatis membuka app e-wallet
2. Tangani ini dengan `onShouldStartLoadWithRequest` di WebView: jika URL bukan `http(s)`, gunakan `Linking.openURL()` untuk membuka app e-wallet, lalu `return false` supaya WebView tidak error mencoba load scheme non-http
3. Setelah user bayar & kembali (biasanya via deep link balik otomatis dari e-wallet), WebView akan lanjut redirect ke `success_redirect_url` kamu → ditangkap oleh Fase 3

## Fase 7 — QA & Edge Cases

- [ ] Uji WebView di-close manual sebelum bayar selesai → pastikan status tetap `PENDING`, tidak stuck
- [ ] Uji invoice expired (default 24 jam) → handle `EXPIRED` webhook, munculkan tombol "Buat ulang pembayaran"
- [ ] Uji koneksi terputus saat WebView loading
- [ ] Pastikan `payments` table punya RLS: tenant hanya bisa lihat pembayaran miliknya
- [ ] Rate limit / idempotency check di `create-invoice` supaya user tidak bisa spam klik bayar dan membuat banyak invoice ganda

---

## Ringkasan Alur

```
[App] --create-invoice--> [Supabase Edge Function] --API call--> [Xendit]
[App] <--invoice_url------------------------------------------------|

[App: WebView loads invoice_url]
   user bayar (VA/QRIS/e-wallet, mungkin deep link keluar-masuk sebentar)
   Xendit redirect ke kosanku://payment/success
[App: WebView tangkap redirect, tutup WebView, tampilkan status "menunggu konfirmasi"]

[Xendit] --webhook PAID--> [Supabase Edge Function: xendit-webhook]
   --verifikasi token--> update tabel payments --> trigger FCM notification

[App: Realtime subscription] --> update UI jadi "Lunas" otomatis
```

## Catatan Penting
- **Jangan pernah** menandai pembayaran sukses hanya dari redirect URL WebView — itu bisa dimanipulasi user. Status final **wajib** dari webhook server-to-server.
- Cek di dashboard Xendit kamu, akun free/self-serve biasanya perlu aktivasi manual per payment method (VA, e-wallet tertentu) sebelum bisa dipakai — beberapa channel mungkin butuh approval tambahan.
