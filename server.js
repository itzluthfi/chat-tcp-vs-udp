const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const jwt = require("jsonwebtoken"); // Library wajib untuk UTS

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Kunci Rahasia untuk enkripsi token (Harus ada untuk keamanan)
const SECRET_KEY = process.env.JWT_SECRET || "nexus_secret_key_uts_2025";

app.use(cors());
app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nexus_realtime_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- LOGIKA MONITORING REALTIME (Syarat UTS) ---
let throughputCounter = 0; // Menghitung pesan yang masuk per detik

// 1. Reset throughput counter setiap 1 detik
setInterval(() => {
  throughputCounter = 0;
}, 1000);

// 2. Broadcast Data Statistik ke Dashboard (Frontend) setiap 2 detik
setInterval(() => {
  // Menghitung jumlah koneksi socket yang aktif
  const activeSockets = io.engine.clientsCount;

  // Kirim data asli ke dashboard
  io.emit("server_stats", {
    activeUsers: activeSockets,
    throughput: throughputCounter, // Data asli, bukan Math.random()
    timestamp: Date.now(),
  });
}, 2000);

// --- MIDDLEWARE AUTH ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};


// --- API ROUTES ---

// Initial Sync
app.get("/api/init", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, email, role, status FROM users"
    );
    const [messages] = await pool.query(
      "SELECT * FROM messages ORDER BY timestamp ASC LIMIT 100"
    );
    const [friendships] = await pool.query("SELECT * FROM friendships");
    res.json({ users, messages, friendships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Auth (DENGAN JWT & REMEMBER ME)
app.post("/api/auth/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length > 0) {
      const user = rows[0];

      // Update status di database jadi online
      await pool.query('UPDATE users SET status = "online" WHERE id = ?', [
        user.id,
      ]);

      // --- GENERATE TOKEN JWT (Security) ---
      const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        SECRET_KEY,
        { expiresIn: "2h" } // Token kadaluarsa dalam 2 jam
      );

      let rememberToken = null;
      if (rememberMe) {
        rememberToken = crypto.randomBytes(32).toString("hex");
        await pool.query('UPDATE users SET remember_token = ? WHERE id = ?', [rememberToken, user.id]);
      }

      // Kirim Token + User Info (Password jangan dikirim balik!)
      const { password: _, remember_token: __, ...userSafe } = user;
      res.json({
        token,
        rememberToken,
        user: userSafe,
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh Token (Auto Login via Remember Token)
app.post("/api/auth/refresh", async (req, res) => {
    const { rememberToken } = req.body;
    if (!rememberToken) return res.status(400).json({ error: "No token provided" });

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE remember_token = ?", [rememberToken]);
        if (rows.length > 0) {
            const user = rows[0];
            
             // Update status di database jadi online
            await pool.query('UPDATE users SET status = "online" WHERE id = ?', [user.id]);

            const token = jwt.sign(
                { id: user.id, role: user.role, username: user.username },
                SECRET_KEY,
                { expiresIn: "2h" }
            );
            
            const { password: _, remember_token: __, ...userSafe } = user;
            res.json({ token, user: userSafe });
        } else {
            res.status(401).json({ error: "Invalid remember token" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify Token (Cek apakah JWT masih valid)
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
        if (rows.length > 0) {
             const user = rows[0];
             const { password: _, remember_token: __, ...userSafe } = user;
             res.json({ valid: true, user: userSafe });
        } else {
             res.status(401).json({ valid: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout
app.post("/api/auth/logout", async (req, res) => {
    const { rememberToken, userId } = req.body;
    try {
        if (rememberToken) {
            await pool.query("UPDATE users SET remember_token = NULL WHERE remember_token = ?", [rememberToken]);
        }
        if (userId) {
             await pool.query('UPDATE users SET status = "offline" WHERE id = ?', [userId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Send Message (DENGAN TRACKING METRIK)
app.post("/api/messages/send", async (req, res) => {
  const { id, senderId, senderName, receiverId, content, timestamp, type } =
    req.body;

  // Naikkan counter throughput (Untuk grafik dashboard)
  throughputCounter++;

  try {
    await pool.query(
      "INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, senderId, receiverId || null, content, timestamp, type, "sent"]
    );

    const messageData = {
      id,
      senderId,
      senderName,
      receiverId,
      content,
      timestamp,
      type,
      status: "delivered",
    };

    // Broadcast via Socket
    io.emit("receive_message", messageData);

    res.status(201).json(messageData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Friend Actions
app.post("/api/friendships/action", async (req, res) => {
  const { senderId, receiverId, action } = req.body;
  try {
    if (action === "add") {
      const id = "f" + Date.now();
      await pool.query(
        "INSERT INTO friendships (id, sender_id, receiver_id, status) VALUES (?, ?, ?, ?)",
        [id, senderId, receiverId, "pending"]
      );
      io.emit("friend_request", {
        id,
        senderId,
        receiverId,
        status: "pending",
      });
    } else if (action === "accept") {
      await pool.query(
        'UPDATE friendships SET status = "accepted" WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
        [senderId, receiverId, receiverId, senderId]
      );
      io.emit("friend_accepted", { senderId, receiverId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SOCKET.IO HANDLERS ---
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // LOGIKA PING-PONG (Untuk menghitung Latency di Frontend)
  socket.on("ping_check", (clientTimestamp) => {
    // Server langsung membalas "Pong" agar client bisa hitung selisih waktu
    socket.emit("pong_check", clientTimestamp);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(
    `🚀 Nexus Engine (JWT + Monitoring Active) Running on port ${PORT}`
  );
});
