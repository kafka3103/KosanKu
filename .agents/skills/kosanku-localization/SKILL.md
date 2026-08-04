---
name: kosanku-localization
description: Panduan lokalisasi (dwibahasa ID/EN) di KosanKu. Gunakan skill ini saat diminta menambah teks baru, mengubah teks UI, atau bekerja dengan sistem terjemahan.
---

# Lokalisasi KosanKu (Dwibahasa ID/EN)

## Setup
- Library: `react-i18next` + `i18next`
- Config: `src/localization/i18n.js`
- File terjemahan: `src/localization/id.json` dan `src/localization/en.json`
- Bahasa default: Indonesia (`id`)

## Penggunaan di Komponen
```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t, i18n } = useTranslation();
  
  return <Text>{t('namespace.keyName', 'Fallback text')}</Text>;
};
```

## Struktur Namespace Kunci
| Namespace | Digunakan di |
|---|---|
| `auth` | LoginScreen, RegisterScreen, ForgotPassword, OTP, ResetPassword |
| `owner` | Semua screen di `screens/owner/` |
| `tenant` / `myRent` | MyRentScreen, ContractDetailScreen |
| `favorites` | FavoriteScreen |
| `searchScreen` | SearchScreen |
| `roomDetail` | RoomDetailScreen |
| `profile` | ProfileScreen |
| `settings` | SettingsScreen |
| `notifications` | NotificationScreen |
| `common` | Kunci umum (tombol, label, format) |

## Kunci Umum yang Sering Dipakai (`common`)
```json
{
  "common": {
    "perMonth": "/bln",           // en: "/mo"
    "sort": {
      "title": "Urutkan",         // en: "Sort"
      "asc": "A-Z",
      "desc": "Z-A",
      "priceAsc": "Termurah",     // en: "Cheapest"
      "priceDesc": "Termahal"     // en: "Most Expensive"
    },
    "error": "Kesalahan",
    "success": "Berhasil",
    "cancel": "Batal",
    "save": "Simpan",
    "delete": "Hapus",
    "edit": "Ubah",
    "loading": "Memuat..."
  }
}
```

## Interpolasi (Variable di dalam teks)
```json
// id.json
"savedCount": "{{count}} kosan disimpan"
// en.json
"savedCount": "{{count}} properties saved"
```
```jsx
t('favorites.savedCount', { count: favorites.length })
```

## Field Database Bilingual
Beberapa tabel memiliki kolom bilingual (`name`/`name_en`, `description`/`description_en`):
```jsx
import { getLocalizedField } from '../../utils/useLocalizedField';

// Mengambil field sesuai bahasa aktif
const localizedName = getLocalizedField(item, 'name', i18n.language);
```

## Aturan Wajib
1. **JANGAN PERNAH** hardcode teks UI — selalu gunakan `t('key')`
2. Saat menambah kunci baru, **WAJIB** tambahkan di KEDUA file (`id.json` DAN `en.json`)
3. Gunakan fallback text: `t('key', 'Fallback')` untuk mencegah blank text
4. Teks harga: gunakan `t('common.perMonth')` bukan `/bln` atau `/mo`
5. Pastikan terjemahan kontekstual — bukan sekadar terjemahan literal kata per kata
