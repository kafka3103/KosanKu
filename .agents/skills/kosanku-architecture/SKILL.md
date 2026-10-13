---
name: kosanku-architecture
description: Arsitektur dan struktur proyek KosanKu — aplikasi manajemen kos-kosan berbasis React Native (Expo) dengan backend Supabase. Gunakan skill ini saat perlu memahami struktur proyek, lokasi file, alur data, atau cara kerja sistem secara keseluruhan.
---

# Arsitektur Proyek KosanKu

## Ringkasan
KosanKu adalah aplikasi mobile manajemen kos-kosan yang dibangun dengan **React Native (Expo SDK 57)** dan backend **Supabase** (PostgreSQL + Auth + Storage + Edge Functions). Aplikasi mendukung dua peran utama: **Owner** (pemilik kos) dan **Tenant** (pencari/penyewa kos).

## Tech Stack
| Layer | Teknologi |
|---|---|
| Framework | React Native 0.86 + Expo ~57 |
| Navigasi | React Navigation 7 (Stack, Bottom Tabs, Drawer) |
| State | Zustand 5 |
| Backend | Supabase (Auth, DB, Storage, Edge Functions) |
| Lokalisasi | react-i18next + i18next (ID/EN) |
| UI Library | react-native-paper 5, @expo/vector-icons |
| Peta | @rnmapbox/maps 10 |
| Pembayaran | Xendit (via Edge Function) |

## Struktur Folder

```
KosanKu/
├── App.js                          # Entry point, Provider setup
├── index.js                        # Expo registerRootComponent
├── src/
│   ├── components/
│   │   ├── navigation/             # DrawerButton, dll
│   │   └── shared/                 # DynamicText, komponen reusable
│   ├── constants/
│   │   ├── colors.js               # COLORS — palet warna HSL
│   │   ├── typography.js           # FONT_SIZE, FONT_WEIGHT, TEXT_STYLES
│   │   ├── spacing.js              # SPACING, BORDER_RADIUS, SHADOW
│   │   ├── screenNames.js          # AUTH_SCREENS, OWNER_SCREENS, TENANT_SCREENS
│   │   ├── invoiceStatus.js        # Konstanta status tagihan
│   │   ├── paymentMethod.js        # Konstanta metode pembayaran
│   │   └── userRole.js             # Konstanta peran pengguna
│   ├── localization/
│   │   ├── i18n.js                 # Konfigurasi i18next
│   │   ├── id.json                 # Terjemahan Bahasa Indonesia
│   │   └── en.json                 # Terjemahan Bahasa Inggris
│   ├── navigation/
│   │   ├── AppNavigator.jsx        # Root navigator (Auth check)
│   │   ├── AuthNavigator.jsx       # Login, Register, ForgotPassword
│   │   ├── OwnerNavigator.jsx      # Drawer + Bottom Tabs + Stacks (Owner)
│   │   └── TenantNavigator.jsx     # Drawer + Bottom Tabs + Stacks (Tenant)
│   ├── screens/
│   │   ├── owner/                  # 11 screen untuk pemilik kos
│   │   ├── tenant/                 # 10 screen untuk pencari/penyewa kos
│   │   └── shared/                 # 11 screen bersama (auth, profil, settings)
│   ├── services/
│   │   ├── supabaseClient.js       # Singleton Supabase client
│   │   ├── authService.js          # Auth (login, register, Google SSO)
│   │   ├── propertyService.js      # CRUD properti, kamar, kontrak
│   │   ├── invoiceService.js       # Tagihan & realtime subscription
│   │   ├── searchService.js        # Pencarian, filter, favorit
│   │   ├── userService.js          # Profil, notifikasi, deaktivasi akun
│   │   ├── reviewService.js        # Ulasan/review
│   │   ├── notificationService.js  # Push notification (Expo)
│   │   ├── translationService.js   # Terjemahan AI (Supabase Edge Fn)
│   │   └── xenditService.js        # Pembayaran Xendit
│   ├── store/
│   │   ├── authStore.js            # Zustand store (currentUser, role, session)
│   │   └── notificationStore.js    # Zustand store (unreadCount, badges)
│   └── utils/
│       ├── notificationUtils.js    # Registrasi & handler push notification
│       ├── translationService.js   # Util terjemahan field bilingual
│       └── useLocalizedField.js    # Hook getLocalizedField(item, field, lang)
├── supabase/
│   ├── migrations/                 # 37 file migrasi SQL (001-030)
│   └── functions/                  # Supabase Edge Functions (Xendit, dll)
└── android/                        # Native Android project
```

## Pola Arsitektur

### Alur Data: Screen → Service → Supabase → State
1. **Screen** memanggil fungsi dari **Service** (contoh: `propertyService.getOwnerProperties()`)
2. **Service** mengirim query ke **Supabase** dan mengembalikan `{ data, error }`
3. **Screen** menyimpan hasilnya di state lokal (`useState`) atau global (`Zustand store`)

### Navigasi (React Navigation 7)
```
AppNavigator
├── AuthNavigator (Stack)
│   ├── Login → Register → ForgotPassword → OTP → ResetPassword
│
├── OwnerNavigator (Drawer + Bottom Tabs)
│   ├── Tab: Dashboard
│   ├── Tab: PropertyStack → PropertyList → PropertyForm → RoomList → RoomForm
│   ├── Tab: InvoiceList
│   ├── Tab: Notifications
│   ├── Drawer: TenantList, Report, Profile, Settings, FacilityMaster
│
└── TenantNavigator (Drawer + Bottom Tabs)
    ├── Tab: SearchStack → Search → PropertyDetail → RoomDetail → RentalRequestForm
    ├── Tab: Favorites
    ├── Tab: MyRentStack → MyRent → ContractDetail → InvoiceDetail → Payment
    ├── Tab: Notifications
    ├── Drawer: Profile, Settings, AddReview
```

### Lokalisasi (Dwibahasa)
- Semua teks UI menggunakan `t('namespace.key')` dari `react-i18next`
- Kunci terjemahan tersimpan di `id.json` dan `en.json` dengan namespace: `auth`, `owner`, `tenant`, `myRent`, `favorites`, `searchScreen`, `common`, dll.
- Field database bilingual: `name`/`name_en`, `description`/`description_en` — diakses via `getLocalizedField(item, 'name', i18n.language)`

### Design System (Token)
Selalu impor dari `src/constants/`:
- **Warna**: `import COLORS from '../../constants/colors'` — primary (Teal #14B8A6), secondary (Navy), accent (Orange)
- **Typography**: `import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography'`
- **Spacing**: `import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing'`

### Dropdown & Sorting (Pola Standar)
Gunakan `Menu` dan `Button` dari `react-native-paper` untuk semua dropdown filter/sorting:
```jsx
import { Menu, Button } from 'react-native-paper';
// State: [sortVisible, setSortVisible] = useState(false);
// State: [sortBy, setSortBy] = useState('nameAsc');
```

## Database (Supabase/PostgreSQL)
Tabel utama: `users`, `properties`, `rooms`, `contracts`, `invoices`, `rental_requests`, `reviews`, `favorites`, `notifications`, `facility_master`, `room_facilities`, `optional_facility_requests`

## Build APK Release
```bash
cd android
.\gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```
Catatan: `babel-plugin-transform-remove-console` diperlukan (sudah di devDependencies) karena `babel.config.js` menghapus console.log di mode production.
