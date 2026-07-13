# KosanKu App - Developer & Agent Guide

Panduan ini adalah standar kerja dan *source of truth* mutlak untuk seluruh pengembang (Agent/Developer/AI) di proyek KosanKu. Proyek ini merupakan pemenuhan Tugas Akhir Pemrograman 6 Tahun Akademik 2025/2026 di Politeknik Astra. 

Waktu pengerjaan proyek dibatasi mulai dari 15 Juni hingga 24 Juli 2025.

## 1. Aturan Dasar (Non-Negotiable Rules)

*   Push back kalau ada yang aneh. Kalau arsitektur, skema, requirement, atau pendekatan terasa bermasalah, sebutkan dan diskusikan dulu sebelum implementasi.
*   Klarifikasi sebelum implementasi besar. Kalau requirement ambigu atau ada beberapa interpretasi yang masuk akal, tanya dulu daripada menulis banyak kode ke arah yang salah.
*   Stick ke scope. Jangan refactor file/area di luar scope task. Kalau melihat masalah lain, sebutkan di akhir response sebagai catatan.
*   Posisikan diri sebagai kontributor, bukan arsitek. Ikuti konvensi yang sudah ada. Jangan introduce pattern, library, abstraction, atau dependency baru tanpa diskusi.
*   Jangan print, expose, atau edit secret di `.env` kecuali user secara eksplisit meminta. Kalau perlu membahas env, redaksi nilai sensitif.

## 2. Spesifikasi Akademis & Kewajiban Proyek (Strict Compliance)

Pengembangan aplikasi wajib mengikuti parameter teknologi berikut agar memenuhi syarat sidang tugas akhir:

*   **Framework Aplikasi:** Aplikasi harus dibangun menggunakan framework React Native dengan bahasa pemrograman JavaScript.
*   **Database & Backend:** Menggunakan layanan Cloud/SaaS terpusat (Supabase) sebagai basis data dan penyedia *backend* API, sesuai kelonggaran yang diperbolehkan.
*   **Komponen UI Wajib:** Pengembangan *interface* wajib memakai *React Native Component* dasar seperti `text`, `view`, dan `flatlist`.
*   **Manajemen State:** Dilarang menggunakan *class component*. Wajib menggunakan React Hooks, secara spesifik `useState` & `useEffect`.
*   **Sistem Navigasi:** Wajib menerapkan *React Native Navigation* yang mencakup `bottom navigation` dan `drawer navigation`.
*   **Konektivitas:** Harus menerapkan *Consume API* untuk mengakses layanan pihak ketiga/eksternal.
*   **Lokalisasi (Bilingual):** Aplikasi wajib memiliki fitur bahasa (*Localization*) yang mendukung minimal Bahasa Indonesia dan Bahasa Inggris.
*   **Fitur Opsional (Ditargetkan):** Implementasi *Camera* untuk unggah foto profil/dokumentasi, *Maps* untuk peta penunjuk lokasi via Google Maps API, dan *Location* untuk mengakses titik koordinat GPS pengguna.

## 3. Source of Truth

Layanan Cloud/SaaS (Supabase) yang bertindak sebagai *Backend* & *Database* terpusat adalah *source of truth* untuk aturan bisnis aplikasi. Frontend (React Native) terintegrasi melalui *Consume API* ke ekosistem tersebut.

Prioritas keputusan:
1. Skema Database (PostgreSQL) dan *Row Level Security* (RLS) di Supabase.
2. *Contract Frontend* dan integrasi API (termasuk akses API eksternal) yang sedang dipakai.
3. Alur integrasi UI/UX yang sudah disepakati.

## 4. Aturan Spesifik Repositori

*   Proyek ini menggunakan arsitektur *Client-Server* berbasis *Cloud/SaaS*.
*   Jika terdapat kesalahan validasi atau *bug* di *backend/database*, perbaikan wajib dilakukan di sisi *backend* (Supabase RLS/Edge Functions).
*   Jangan membuat *fallback* di sisi *frontend* (React Native) semata-mata untuk menutupi kesalahan perilaku *backend*.
*   *Legacy code* yang sudah tidak terpakai harus langsung dihapus dalam lingkup *task* yang berjalan.
*   Jangan mempertahankan *fallback* atau memaksakan kecocokan sistem lama yang tidak diperlukan di tahap pengembangan ini.
*   Seluruh migrasi skema *database* harus dilakukan secara *forward-only* dan dipastikan aman terhadap data yang sudah ada.

## 5. Struktur Direktori Proyek

Proyek ini dibangun menggunakan React Native dengan pembagian modul yang berfokus pada efisiensi komponen.

```text
kosanku-app/
|- src/
|  |- components/       <- React Native Component (View, Text, FlatList, dll.)
|  |- screens/          <- Layar operasional (Modul Owner & Tenant)
|  |- navigation/       <- Konfigurasi Bottom Navigation & Drawer Navigation
|  |- hooks/            <- Custom hooks, useState, & useEffect
|  |- services/         <- Consume API (Supabase, Maps, Payment Gateway)
|  |- i18n/             <- Localization (ID & EN)
|  `- utils/            <- Format tanggal, harga, dll.
|- supabase/            <- Konfigurasi Backend/Database Terpusat (SaaS)
|  |- migrations/       <- Skema SQL
|  `- functions/        <- Edge Functions
`- package.json 