# KosanKu — Aturan Global untuk AI Agent

## Bahasa
- Gunakan **Bahasa Indonesia** untuk semua respons ke pengguna, komentar kode, dan commit message.
- Kode (nama variabel, fungsi, komponen) tetap dalam **Bahasa Inggris**.

## Gaya Kode
- Gunakan **JSX** (`.jsx`) untuk file komponen React Native, **JS** (`.js`) untuk file non-komponen (services, utils, store, constants).
- Selalu gunakan **arrow function** dan **functional component** (tidak menggunakan class component).
- Impor token desain dari `src/constants/` — jangan pernah hardcode warna, spacing, atau ukuran font.
- Semua teks yang ditampilkan ke pengguna **wajib** menggunakan fungsi `t()` dari `react-i18next` — tidak boleh hardcode string UI.
- Jika menambah teks baru, tambahkan kunci terjemahannya di **KEDUA** file: `src/localization/id.json` dan `src/localization/en.json`.

## Konvensi Penamaan
- Nama file komponen/screen: `PascalCase.jsx` (contoh: `PropertyListScreen.jsx`)
- Nama file service/util: `camelCase.js` (contoh: `propertyService.js`)
- Nama screen di navigator: gunakan konstanta dari `src/constants/screenNames.js`

## Manajemen State
- Gunakan **Zustand** untuk state global (auth, notification).
- Gunakan `useState`/`useCallback`/`useFocusEffect` untuk state lokal.

## Larangan
- JANGAN menambah dependency baru tanpa konfirmasi pengguna.
- JANGAN mengubah file `supabaseClient.js`, `.env`, `app.json`, atau `babel.config.js` tanpa konfirmasi.
- JANGAN menghapus komentar atau docstring yang sudah ada kecuali diminta.
