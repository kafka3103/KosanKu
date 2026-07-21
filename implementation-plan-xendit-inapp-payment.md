# Implementation Plan: Fix Bug — WebView Xendit Tidak Auto-Close & Tagihan Tidak Update

## Root Cause
Setelah pembayaran sukses, Xendit checkout page melakukan **JS redirect** (`window.location.href`) ke `success_redirect_url` (custom scheme, misal `kosanku://payment/success`). Android WebView mencoba memuatnya sebagai URL biasa → gagal resolve domain → muncul `Error loading page: net::ERR_NAME_NOT_RESOLVED`.

Penyebab: intercept navigasi saat ini kemungkinan hanya di `onNavigationStateChange` (terjadi **setelah** WebView mulai/mencoba load), bukan di `onShouldStartLoadWithRequest` (terjadi **sebelum** WebView mencoba load). Custom scheme tidak pernah boleh sampai ke tahap "load" — harus dicegat lebih awal.

---

## Fase 1 — Intercept Navigasi Sebelum Terjadi

**File:** `src/screens/tenant/PaymentWebViewScreen.jsx`

1. Tambahkan prop `onShouldStartLoadWithRequest` pada `<WebView>`:
   - Cek apakah `request.url` diawali dengan scheme custom (`kosanku://payment/success` atau `kosanku://payment/failed`)
   - Jika ya:
     - Jalankan handler sukses/gagal (state update, tutup WebView, navigasi ke `PaymentStatusScreen`)
     - **Return `false`** → mencegah WebView benar-benar memuat URL tersebut, sehingga error page tidak pernah muncul
   - Jika bukan (http/https normal, atau deep link e-wallet) → return `true` seperti biasa, atau arahkan ke `Linking.openURL()` untuk scheme non-http lain (lihat plan sebelumnya untuk e-wallet)

2. **Hilangkan/kurangi ketergantungan** pada `onNavigationStateChange` untuk deteksi redirect sukses — jadikan hanya sebagai fallback logging, bukan trigger utama.

## Fase 2 — Fallback Safety Net (jaga-jaga bug Android WebView versi tertentu)

Ada beberapa versi Android WebView yang tetap memicu percobaan load walau `onShouldStartLoadWithRequest` return `false` (race condition di beberapa device). Tambahkan lapisan pengaman:

1. Pasang `onError` pada WebView:
   - Jika `nativeEvent.description` mengandung `ERR_NAME_NOT_RESOLVED` **dan** `nativeEvent.url` cocok dengan prefix scheme kamu (`kosanku://`) → treat sebagai sinyal sukses/gagal juga (jangan tampilkan error ke user), lalu jalankan handler yang sama seperti Fase 1
   - Jika error dari domain lain (bukan scheme kamu) → baru tampilkan pesan error sungguhan ke user

## Fase 3 — UI Saat Transisi (hindari "flash" error)

1. Tambahkan state `isFinalizing` yang di-set `true` begitu redirect terdeteksi (baik dari Fase 1 maupun Fase 2)
2. Saat `isFinalizing === true`, render **overlay loading** ("Memverifikasi pembayaran...") di atas WebView sebelum modal ditutup — supaya walau ada flash singkat, user tidak melihat error page Android

## Fase 4 — Konfirmasi Status Sungguhan (tetap wajib, jangan hanya andalkan redirect)

*(Ini melanjutkan plan sebelumnya — pastikan ini sudah berjalan)*

1. Setelah WebView ditutup, `PaymentStatusScreen` menampilkan status **"Menunggu konfirmasi dari server"**, bukan langsung "Lunas"
2. Subscribe Supabase Realtime ke tabel `payments` row terkait
3. Saat webhook `xendit-webhook` menerima event `PAID` dan update DB → Realtime push ke app → UI berubah jadi "Lunas" otomatis
4. **Fallback polling**: jika Realtime tidak konek (misal koneksi tidak stabil), lakukan polling `GET` status invoice setiap 3 detik, maksimal 10x percobaan, sebelum menampilkan tombol "Cek status manual"

## Fase 5 — Testing

- [ ] Uji ulang skenario di screenshot: bayar via QRIS sandbox → pastikan tidak ada flash "Error loading page"
- [ ] Cek log: pastikan `onShouldStartLoadWithRequest` benar-benar terpanggil dengan url `kosanku://payment/success` sebelum WebView error
- [ ] Uji redirect gagal (`failure_redirect_url`) dengan skenario invoice expired
- [ ] Uji di minimal 2 device Android berbeda versi (WebView engine beda-beda, terutama Android 10 ke bawah vs Android 12+) untuk pastikan Fase 2 fallback bekerja
- [ ] Pastikan status akhir di UI selalu match dengan status di dashboard Xendit & tabel `payments` — jangan sampai UI bilang "Lunas" tapi backend masih `PENDING`

---

## Contoh Kerangka Kode (untuk referensi implementasi)

```jsx
const SUCCESS_PREFIX = 'kosanku://payment/success';
const FAILED_PREFIX = 'kosanku://payment/failed';

const handleRedirect = (url, type) => {
  setIsFinalizing(true);
  if (type === 'success') {
    navigation.replace('PaymentStatusScreen', { invoiceId, optimisticStatus: 'PROCESSING' });
  } else {
    navigation.replace('PaymentStatusScreen', { invoiceId, optimisticStatus: 'FAILED' });
  }
};

const onShouldStartLoadWithRequest = (request) => {
  if (request.url.startsWith(SUCCESS_PREFIX)) {
    handleRedirect(request.url, 'success');
    return false; // cegah WebView memuat scheme ini
  }
  if (request.url.startsWith(FAILED_PREFIX)) {
    handleRedirect(request.url, 'failed');
    return false;
  }
  return true; // lanjutkan load normal untuk http/https
};

const onWebViewError = (syntheticEvent) => {
  const { nativeEvent } = syntheticEvent;
  if (
    nativeEvent.description?.includes('ERR_NAME_NOT_RESOLVED') &&
    nativeEvent.url?.startsWith('kosanku://')
  ) {
    // fallback safety net — jangan tampilkan error ke user
    const type = nativeEvent.url.startsWith(SUCCESS_PREFIX) ? 'success' : 'failed';
    handleRedirect(nativeEvent.url, type);
  }
};
```

```jsx
<WebView
  source={{ uri: invoiceUrl }}
  onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
  onError={onWebViewError}
  startInLoadingState
  renderLoading={() => <LoadingOverlay />}
/>
```

## Catatan
Status "Lunas" di UI **hanya boleh** ditentukan oleh data dari webhook (via Supabase, Fase 4), bukan dari berhasilnya intercept redirect ini. Redirect di atas hanya berguna untuk **menutup WebView dengan mulus**, bukan sebagai bukti pembayaran sah.