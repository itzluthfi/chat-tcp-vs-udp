# 🚀 Nexus Realtime Hub: Documentation

Nexus adalah platform komunikasi realtime yang mengintegrasikan fitur chat multi-user dengan dashboard monitoring performa jaringan tingkat tinggi.

---

## 🧪 Panduan Demo: Cara Membuktikan TCP vs UDP

Jika ditanya: **"Mana buktinya ini TCP atau UDP?"**, arahkan audiens ke menu **Network Lab** dan tunjukkan 3 poin berikut:

### 1. Bukti Header (Overhead)
*   **TCP**: Tunjukkan angka **"Data Overhead"** (~60 Bytes). Jelaskan bahwa TCP butuh banyak informasi tambahan (Sequence Number, Acknowledgment, Window Size) untuk memastikan data tidak hilang.
*   **UDP**: Tunjukkan angka **"Data Overhead"** (~2-8 Bytes). Jelaskan bahwa UDP "Fire and Forget", tidak peduli data sampai atau tidak, sehingga paketnya sangat ringan.

### 2. Bukti Handshake & Latency
*   **Ganti ke TCP**: Grafik Latency akan naik dan berwarna **Indigo**. Ini karena ada proses "Three-Way Handshake" (SYN -> SYN-ACK -> ACK).
*   **Ganti ke UDP**: Grafik Latency akan turun drastis dan berwarna **Emerald**. Data dikirim langsung tanpa basa-basi.

### 3. Bukti Paket Hilang (Packet Loss)
*   **Mode UDP**: Perhatikan grafik **Stability**. Sesekali akan muncul spike merah (**Packet Loss**). Ini membuktikan UDP tidak melakukan pengiriman ulang jika data gagal sampai.
*   **Mode TCP**: Grafik akan selalu 100% stabil. Ini membuktikan TCP memiliki fitur *Retransmission* (kirim ulang data yang gagal).

---

## 📈 Parameter Performa: Semakin Tinggi = Baik atau Buruk?

| Parameter | Satuan | Arti | Nilai Tinggi = ? |
| :--- | :--- | :--- | :--- |
| **Latency / RTT** | ms | Waktu tunggu data sampai. | **BURUK** 🔴 (Makin tinggi = makin nge-lag) |
| **Throughput** | req/s | Kecepatan proses pesan. | **BAIK** 🟢 (Makin tinggi = makin bertenaga) |
| **Overhead** | Bytes | "Sampah" data tambahan. | **BURUK** 🔴 (Makin tinggi = boros kuota) |
| **Packet Loss** | % | Data yang hilang di jalan. | **BURUK** 🔴 (Makin tinggi = chat error/putus) |

---
*Nexus Engine v2.6 - Senior Engineering Team*