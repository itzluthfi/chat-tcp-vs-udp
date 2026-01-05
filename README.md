# 🚀 Nexus Realtime Hub: Technical Documentation

Nexus adalah platform komunikasi realtime yang kini mendukung integrasi **MySQL** untuk penyimpanan data persisten.

---

## 🛠️ Panduan Instalasi & Setup MySQL

### 1. Persiapan Database (MySQL)

1.  Pastikan **MySQL Server** sudah berjalan di komputer Anda (XAMPP/Laragon/Native).
2.  Pastikan Anda telah membuat database (jika belum, script migrasi akan mencoba membuatnya).

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

# Jalankan Migrasi Database (Setup Schema)
node scripts/migrate.js

# Jalankan server backend (Node.js)
npm run server

# Jalankan frontend (React)
npm run dev
```

---

## 🏗️ Struktur & Relasi Database

Aplikasi ini menggunakan **MySQL (InnoDB)** sebagai basis data utama dengan struktur relasi sebagai berikut:

### 1. Tabel `users`

Menyimpan data pengguna, kredensial logn, dan status sesi.

- **Primary Key**: `id`
- **Columns**: `username`, `email`, `password`, `role` (admin/user), `status` (online/offline), `last_ping`, `remember_token`.
- **Relasi**: Parent table untuk `messages` dan `friendships`.

### 2. Tabel `messages`

Menyimpan seluruh riwayat percakapan (Global & Private).

- **Primary Key**: `id`
- **Foreign Keys**:
  - `sender_id` -> relasi ke `users.id` (Pengirim)
  - `receiver_id` -> relasi ke `users.id` (Penerima). _Jika NULL, dianggap pesan Global/Broadcast._
- **Fitur**: Mendukung tipe pesan `text`, `system`, dan `broadcast`.

### 3. Tabel `friendships`

Menyimpan status pertemanan antar user (Two-way relationship).

- **Primary Key**: `id`
- **Foreign Keys**: `sender_id` & `receiver_id` -> relasi ke `users.id`.
- **Status**: `pending` (menunggu konfirmasi) atau `accepted` (berteman).

---

## ⚡ Cara Kerja Socket.io (Realtime Engine)

Sistem komunikasi realtime dibangun di atas **Socket.IO** yang berjalan di atas protokol **TCP/WebSocket**.

1.  **Koneksi (Handshake)**: Client melakukan upgrade koneksi HTTP ke WebSocket untuk saluran komunikasi dua arah yang persisten.
2.  **Pola "Write-Through"**:
    - Saat User A mengirim pesan, pesan dikirim ke Server via REST API / Socket.
    - Server **menyimpan dahulu ke MySQL** untuk menjamin data aman (Durability).
    - Setelah tersimpan, Server mem-**broadcast** event `receive_message` ke User B (atau semua user) secara realtime.
3.  **Heartbeat/Ping**:
    - Server mengirim sinyal detak secara berkala.
    - Client merespon untuk memberitahu server bahwa dia "Online".
    - Jika tidak ada respon, status di DB dbah menjadi "Offline".

---

## 🔬 Simulasi TCP vs UDP (Network Lab)

Fitur **Network Lab** di dashboard admin mensimulasikan perbedaan fundamental antara protokol TCP dan UDP:

| Fitur          | TCP (Transmission Control Protocol)        | UDP (User Datagram Protocol)                  |
| :------------- | :----------------------------------------- | :-------------------------------------------- |
| **Sifat**      | **Reliable** (Terjamin sampai)             | **Unreliable** (Cepat, tapi bisa hilang)      |
| **Koneksi**    | **Connection-oriented** (3-Way Handshake)  | **Connection-less** (Langsung kirim)          |
| **Overhead**   | **Tinggi (~60 Bytes)** (Header besar)      | **Rendah (~8 Bytes)** (Header minimal)        |
| **Penggunaan** | Chat, Email, Web (Data harus utuh)         | Streaming, Gaming, VoIP (Kecepatan prioritas) |
| **Di App Ini** | Digunakan untuk **Fitur Chat** (WebSocket) | Disimulasikan di dashboard untuk edukasi      |

---

## 🌟 Fitur Aplikasi

1.  **Sistem Autentikasi Hybrid**: Login menggunakan JWT (Access Token) + Remember Token (Session Persistence di Database).
2.  **Realtime Chat**: Kirim pesan instan global atau private tanpa refresh page.
3.  **Manajemen Teman**: Add friend, accept request, dan real-time friend status update.
4.  **Live Monitoring Dashboard (Admin)**: Pantau jumlah user online, throughput pesan per detik, dan latency jaringan.
5.  **Network Lab (Admin)**: Simulator interaktif untuk membandingkan performa TCP vs UDP.
6.  **Kernel Logs (Admin)**: Log aktivitas sistem realtime.

---

## 🛡️ Role & Hak Akses

Sistem membedakan akses berdasarkan `role` user:

### 1. User (Standard)

- **Akses**: Halaman Chat.
- **Kemampuan**:
  - Mengirim pesan global/private.
  - Menambah dan menerima teman.
  - Melihat status online/offline teman.

### 2. Admin (Administrator)

- **Akses**: Password default demo: `admin`
- **Kemampuan**:
  - **Semua fitur User**.
  - **Akses Dashboard Monitoring**: Melihat statistik server.
  - **Akses Network Lab**: Melakukan eksperimen protokol jaringan.
  - **Akses System Logs**: Melihat log aktivitas teknis.
  - **Broadcast Message**: Mengirim pesan sistem ke semua user.

Jawaban Singkat untuk Dosen/Laporan UTS:

Jika ditanya "Apa yang membuat JWT di sistem ini unik antar sesi login?", jawabannya adalah:

    "JWT digenerate dari kombinasi ID User, Role, dan Timestamp (Issued At). Karena waktu pembuatan (iat) selalu bergerak maju setiap detik, maka setiap kali user melakukan login ulang, string token yang dihasilkan akan selalu berbeda meskipun user-nya sama."
