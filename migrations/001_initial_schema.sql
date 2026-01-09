-- 1. Tabel Users (Mendukung Registrasi Publik)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('online', 'offline') DEFAULT 'offline',
    last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remember_token VARCHAR(255) NULL
) ENGINE=InnoDB;

-- 2. Tabel Rooms (BARU: Untuk Fitur Hybrid TCP/UDP)
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creator_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Tabel Messages (Updated: Mendukung Private, Global, DAN Room Chat)
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    
    -- Opsi 1: Chat Private (Isi receiver_id, Kosongkan room_id)
    receiver_id VARCHAR(50) NULL,
    
    -- Opsi 2: Chat Room (Isi room_id, Kosongkan receiver_id)
    room_id VARCHAR(50) NULL, 
    
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    type ENUM('text', 'system', 'broadcast', 'video_offer', 'video_answer', 'ice_candidate') DEFAULT 'text',
    status ENUM('sent', 'delivered') DEFAULT 'sent',
    
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Tabel Friendships (Tetap Sama)
CREATE TABLE IF NOT EXISTS friendships (
    id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50) NOT NULL,
    status ENUM('pending', 'accepted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Seed Data (Tetap ada untuk Admin, tapi User lain nanti Daftar Sendiri)
-- Password di sini masih plain text, nanti saat Register via API kita pakai Hash
INSERT IGNORE INTO users (id, username, email, password, role, status) VALUES 
('1', 'Admin_Nexus', 'admin@nexus.io', 'admin', 'admin', 'offline');
-- (User Alex, Sarah, dll bisa dihapus kalau mau murni Register sendiri, 
--  tapi saran saya biarkan 1-2 untuk testing).
INSERT IGNORE INTO users (id, username, email, password, role, status) VALUES 
('2', 'Alex_Net', 'alex@nexus.io', 'user', 'user', 'offline');