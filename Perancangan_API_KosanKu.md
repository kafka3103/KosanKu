# 2.3 Perancangan API KosanKu

Berikut adalah daftar endpoint API yang digunakan dalam aplikasi KosanKu. Sistem ini menggunakan arsitektur Backend-as-a-Service dari Supabase. 

| Method | Endpoint | Keterangan |
|---|---|---|
| **GET** | `/rest/v1/properties` | Mengambil daftar properti kosan (Kosan) beserta detailnya |
| **POST** | `/rest/v1/properties` | Menambahkan data properti kosan baru oleh Owner |
| **PATCH / PUT** | `/rest/v1/properties?id=eq.{id}` | Mengubah detail data properti kosan tertentu |
| **DELETE** | `/rest/v1/properties?id=eq.{id}` | Menghapus data properti kosan tertentu |
| **GET** | `/rest/v1/rooms` | Mengambil daftar kamar yang tersedia di suatu kosan |
| **POST** | `/rest/v1/rental_requests` | Mengajukan permintaan sewa kamar kos oleh Tenant |
| **PATCH / PUT** | `/rest/v1/rental_requests?id=eq.{id}`| Memperbarui status pengajuan sewa (disetujui/ditolak) oleh Owner |
| **GET** | `/rest/v1/contracts` | Mengambil daftar kontrak sewa kos yang sedang aktif |
| **GET** | `/rest/v1/invoices` | Mengambil daftar tagihan (bulanan atau fasilitas) milik Tenant |
| **POST** | `/rest/v1/payments` | Mencatat riwayat pembayaran yang berhasil |
| **POST** | `/functions/v1/create-xendit-invoice` | Menghasilkan link pembayaran Xendit Payment Gateway |
| **POST** | `/functions/v1/xendit-webhook` | Menerima *callback* otomatis dari Xendit saat pembayaran berhasil |
| **POST** | `/rest/v1/rpc/add_facility_to_contract`| Fungsi khusus (RPC) untuk menambahkan fasilitas tambahan ke dalam kontrak berjalan |

---
*Catatan Tambahan untuk Developer:*
*Untuk endpoint yang merupakan tabel database (diawali `/rest/v1/`), proses Update data menggunakan method `PATCH` sesuai standar PostgREST (Supabase).*
