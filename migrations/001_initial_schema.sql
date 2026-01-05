-- 1. Tabel Users
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

-- 2. Tabel Messages (Mendukung Chat Global & Private)
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50), -- NULL berarti chat publik/global
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    type ENUM('text', 'system', 'broadcast') DEFAULT 'text',
    status ENUM('sent', 'delivered') DEFAULT 'sent',
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Tabel Friendships (Sistem Koneksi Antar User)
CREATE TABLE IF NOT EXISTS friendships (
    id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50) NOT NULL,
    status ENUM('pending', 'accepted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Seed Data (Data Awal untuk Testing) - Using INSERT IGNORE to avoid duplicates on re-run if partial
INSERT IGNORE INTO users (id, username, email, password, role, status) VALUES 
('1', 'Admin_Nexus', 'admin@nexus.io', 'admin', 'admin', 'offline'),
('2', 'Alex_Net', 'alex@nexus.io', 'user', 'user', 'offline'),
('3', 'Sarah_K', 'sarah@nexus.io', 'user', 'user', 'offline'),
('4', 'Jordan_D', 'jordan@nexus.io', 'user', 'user', 'offline');

INSERT IGNORE INTO friendships (id, sender_id, receiver_id, status) VALUES 
('f1', '2', '3', 'accepted'),
('f2', '1', '2', 'accepted');
