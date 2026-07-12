# KosanKu App - Developer & Agent Guide

Panduan ini adalah standar kerja dan *source of truth* untuk seluruh pengembang (Agent/Developer) di proyek KosanKu.

## 1. Aturan Dasar (Non-Negotiable Rules)

- Push back kalau ada yang aneh. Kalau arsitektur, skema, requirement, atau pendekatan terasa bermasalah, sebutkan dan diskusikan dulu sebelum implementasi.
- Klarifikasi sebelum implementasi besar. Kalau requirement ambigu atau ada beberapa interpretasi yang masuk akal, tanya dulu daripada menulis banyak kode ke arah yang salah.
- Stick ke scope. Jangan refactor file/area di luar scope task. Kalau melihat masalah lain, sebutkan di akhir response sebagai catatan.
- Posisikan diri sebagai kontributor, bukan arsitek. Ikuti konvensi yang sudah ada. Jangan introduce pattern, library, abstraction, atau dependency baru tanpa diskusi.
- Jangan print, expose, atau edit secret di `.env` kecuali user secara eksplisit meminta. Kalau perlu membahas env, redaksi nilai sensitif.

### 1.1 Project-Specific Important Rules
- Proyek ini menggunakan arsitektur *Client-Server* berbasis *Cloud/SaaS*.
- Jika menurutmu ada kesalahan validasi atau *bug* di *backend/database*, laporkan atau perbaiki *backend*-nya (Supabase RLS/Edge Functions). Jangan tangani *fallback* di *frontend* (React Native) untuk menutupi *behavior backend* yang salah.
- *Legacy code* yang sudah tidak dipakai langsung hapus dalam *scope task*. Jangan mempertahankan *fallback* atau memaksakan *compatibility legacy* yang tidak diperlukan karena proyek masih tahap *development*[cite: 3].
- Migrasi skema *database* harus disiplin *forward-only* dan aman untuk data *existing*[cite: 3].

## 2. Source of Truth

Layanan Cloud/SaaS (Supabase) yang bertindak sebagai *Backend* & *Database* terpusat adalah *source of truth* untuk aturan bisnis aplikasi. Frontend (React Native) terintegrasi melalui *Consume API* ke ekosistem tersebut.

Prioritas keputusan:
1. Skema Database (PostgreSQL) dan *Row Level Security* (RLS) di Supabase.
2. *Contract Frontend* dan integrasi API (termasuk akses API eksternal) yang sedang dipakai.
3. Alur integrasi UI/UX yang sudah disepakati.

## 3. Struktur Direktori Proyek

Proyek ini dibangun menggunakan **React Native** dengan pembagian modul yang berfokus pada efisiensi komponen.

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