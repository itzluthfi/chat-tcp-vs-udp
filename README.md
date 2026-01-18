# 🚀 Nexus Realtime Hub V2: Video Call & Secure Chat

Nexus adalah platform komunikasi realtime modern yang menggabungkan integritas data **TCP** (Chat & Auth) dengan kecepatan **UDP** (Video Streaming) dalam satu arsitektur Hybrid.

---

## 🛠️ Panduan Instalasi & Setup (Untuk Developer)

Ikuti langkah ini secara berurutan agar tidak terjadi error koneksi atau SSL.

### 1. Persiapan Database (MySQL)
1. Pastikan **MySQL Server** (XAMPP/Laragon) sudah berjalan.
2. Buat database baru dengan nama: `nexus_realtime_db`.

### 2. Konfigurasi Environment (.env)

Buat file `.env` di root folder proyek, lalu copy konfigurasi berikut.
**PENTING:** Biarkan `VITE_API_URL` kosong agar Proxy bekerja dengan benar.

```env
# Database Config
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nexus_realtime_db

# Security
JWT_SECRET=nexus_secret_key_v2_secure

# Backend Port
PORT=3000

# Frontend Config (PENTING: Kosongkan value ini untuk mengaktifkan Relative Path Proxy)
VITE_API_URL=
```
### 3. Instalasi & Migrasi

Buka terminal dan jalankan perintah berikut:

# 1. Install semua library (Backend & Frontend)
npm install

# 2. Migrasi Database (Membuat tabel users, messages, rooms, dll)
node scripts/migrate.js

# Output sukses harusnya: "Migration completed successfully."

### 4. Menjalankan Aplikasi

Anda perlu menjalankan dua terminal terpisah:

Terminal 1 (Backend Server):
# npm run server
Server akan berjalan di HTTP port 3000

Terminal 2 (Frontend Client):
# npm run dev
Vite akan menjalankan HTTPS server di port 5173

### 5. ⚠️ PENTING: Akses Pertama Kali (HTTPS Warning)

Karena aplikasi menggunakan SSL Self-Signed (agar fitur Kamera/Mic bisa jalan), browser akan memberikan peringatan keamanan.

    Buka browser di: https://localhost:5173

    Muncul layar merah "Your connection is not private".

    Klik Advanced -> Proceed to localhost (unsafe).

    (Opsional) Jika Backend error, buka tab baru ke https://localhost:3000, lakukan hal yang sama ("Proceed"), lalu kembali ke frontend.


