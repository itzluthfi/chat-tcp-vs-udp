# 🚀 Nexus Realtime Hub: Technical Documentation

Nexus adalah platform komunikasi realtime yang kini mendukung integrasi **MySQL** untuk penyimpanan data persisten.

---

## 🛠️ Panduan Instalasi & Setup MySQL

### 1. Persiapan Database (MySQL)
1.  Pastikan **MySQL Server** sudah berjalan di komputer Anda (XAMPP/Laragon/Native).
2.  Buka terminal atau MySQL Client (HeidiSQL/DBeaver).
3.  Eksekusi perintah berikut untuk mengimpor skema:
    ```bash
    mysql -u root -p < db.sql
    ```

### 2. Konfigurasi Environment
Salin file `.env` dan sesuaikan dengan kredensial MySQL Anda:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=isi_password_mysql_anda
DB_NAME=nexus_realtime_db
```

### 3. Langkah Instalasi Aplikasi
```bash
# Install dependensi
npm install

# Jalankan server backend (Node.js)
npm run server

# Jalankan frontend (React)
npm run dev
```

---

## 🏗️ Struktur Relasi Database (MySQL)

Sistem Nexus menggunakan mesin **InnoDB** untuk mendukung *Foreign Key constraints*:

1.  **Users Table**: Menyimpan profil, role, dan status online.
2.  **Messages Table**: Relasi `Many-to-One` ke tabel Users (Pengirim & Penerima).
3.  **Friendships Table**: Tabel penghubung untuk relasi pertemanan antar user.

---

## 🧪 Cara Kerja Realtime dengan MySQL
Aplikasi ini menggunakan pola **Write-Through**:
1.  Client mengirim pesan via **WebSocket**.
2.  Server menerima pesan, menyimpannya ke **MySQL**.
3.  Setelah berhasil disimpan di MySQL, Server melakukan **Broadcast** ke client lain yang sedang online.
4.  Jika client offline, pesan tetap tersimpan di MySQL dan akan di-load saat client login kembali.

---
*Nexus Engine v2.7 - Database Ready Architecture*


Jawaban Singkat untuk Dosen/Laporan UTS:

Jika ditanya "Apa yang membuat JWT di sistem ini unik antar sesi login?", jawabannya adalah:

    "JWT digenerate dari kombinasi ID User, Role, dan Timestamp (Issued At). Karena waktu pembuatan (iat) selalu bergerak maju setiap detik, maka setiap kali user melakukan login ulang, string token yang dihasilkan akan selalu berbeda meskipun user-nya sama."