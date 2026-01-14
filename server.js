const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // LIBRARY BARU: Untuk Hashing Password

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const SECRET_KEY = process.env.JWT_SECRET || "nexus_secret_key_uts_2025";

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nexus_realtime_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Map User Online
const onlineUsers = new Map();

// === MONITORING REALTIME ===
let throughputCounter = 0;

setInterval(() => {
  throughputCounter = 0;
}, 1000);

setInterval(() => {
  const activeSockets = io.engine.clientsCount;
  io.emit("server_stats", {
    activeUsers: activeSockets,
    throughput: throughputCounter,
    timestamp: Date.now(),
  });
}, 2000);

// === AUTH HELPER ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// === API ROUTES ===

// 1. REGISTER (BARU: Untuk User Public)
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Cek email duplikat
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0)
      return res.status(400).json({ error: "Email already exists" });

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = "u_" + Date.now();

    await pool.query(
      "INSERT INTO users (id, username, email, password, role, status) VALUES (?, ?, ?, ?, 'user', 'offline')",
      [newId, username, email, hashedPassword]
    );

    res.status(201).json({ message: "Registration successful. Please login." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LOGIN (UPDATED: Support Hash & Plain Text Seed)
app.post("/api/auth/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length > 0) {
      const user = rows[0];
      let isValid = false;

      // Cek: Apakah password di DB sudah ter-hash (panjang > 50)?
      if (user.password.length > 50) {
        // Cek pakai Bcrypt
        isValid = await bcrypt.compare(password, user.password);
      } else {
        // Fallback: Cek Plain Text (Khusus untuk Akun Seed 'admin')
        isValid = password === user.password;
      }

      if (isValid) {
        await pool.query('UPDATE users SET status = "online" WHERE id = ?', [
          user.id,
        ]);

        const token = jwt.sign(
          { id: user.id, role: user.role, username: user.username },
          SECRET_KEY,
          { expiresIn: "2h" }
        );

        let rememberToken = null;
        if (rememberMe) {
          rememberToken = crypto.randomBytes(32).toString("hex");
          await pool.query("UPDATE users SET remember_token = ? WHERE id = ?", [
            rememberToken,
            user.id,
          ]);
        }

        const { password: _, remember_token: __, ...userSafe } = user;
        res.json({ token, user: userSafe, rememberToken });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } else {
      res.status(401).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... (Endpoint Refresh, Verify, Logout SAMA SEPERTI SEBELUMNYA, Copy Paste saja jika mau) ...
// Agar tidak terlalu panjang, saya asumsikan Anda pakai kode logout/refresh dari file sebelumnya.
// TAPI pastikan endpoint /api/init di bawah ini di-update:

// 3. INIT DATA (UPDATED: Fetch Rooms juga)
app.get("/api/init", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, email, role, status FROM users"
    );

    // Ambil Pesan (Global Only atau User related)
    // Disini kita ambil pesan global dulu untuk init
    const [messages] = await pool.query(`
      SELECT m.*, u.username AS senderName, m.sender_id AS senderId, m.receiver_id AS receiverId, m.room_id AS roomId
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      ORDER BY m.timestamp ASC LIMIT 100
    `);

    const [friendships] = await pool.query("SELECT * FROM friendships");

    // Fetch Rooms Aktif
    const [rooms] = await pool.query("SELECT * FROM rooms WHERE is_active = 1");

    res.json({ users, messages, friendships, rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ROOMS API (BARU)
app.post("/api/rooms/create", async (req, res) => {
  const { name, creatorId } = req.body;
  const roomId = "room_" + Date.now();
  try {
    await pool.query(
      "INSERT INTO rooms (id, name, creator_id) VALUES (?, ?, ?)",
      [roomId, name, creatorId]
    );
    // Kembalikan data room baru
    const newRoom = { id: roomId, name, creator_id: creatorId, is_active: 1 };

    // Broadcast ke semua user bahwa ada room baru
    io.emit("room_created", newRoom);

    res.json(newRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 1. VERIFY TOKEN (Wajib untuk Auto Login saat Refresh)
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
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

// 2. REFRESH TOKEN (Untuk Remember Me)
app.post("/api/auth/refresh", async (req, res) => {
  const { rememberToken } = req.body;
  if (!rememberToken)
    return res.status(400).json({ error: "No token provided" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE remember_token = ?",
      [rememberToken]
    );
    if (rows.length > 0) {
      const user = rows[0];

      await pool.query('UPDATE users SET status = "online" WHERE id = ?', [
        user.id,
      ]);

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

// 3. LOGOUT (Untuk Hapus Sesi)
app.post("/api/auth/logout", async (req, res) => {
  const { rememberToken, userId } = req.body;
  try {
    if (rememberToken) {
      await pool.query(
        "UPDATE users SET remember_token = NULL WHERE remember_token = ?",
        [rememberToken]
      );
    }
    if (userId) {
      await pool.query('UPDATE users SET status = "offline" WHERE id = ?', [
        userId,
      ]);
      
      // Hapus dari map onlineUsers (Cari key berdasarkan value userId)
      for (const [socketId, uid] of onlineUsers.entries()) {
        if (uid === userId) {
            onlineUsers.delete(socketId);
            break;
        }
      }

      const [users] = await pool.query(
        "SELECT id, username, email, role, status FROM users"
      );
      io.emit("user_status_update", users);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. FRIENDSHIP ACTION (Juga Hilang di kode Anda)
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


// 5. SEND MESSAGE (UPDATED: Support Room ID)
app.post("/api/messages/send", async (req, res) => {
  const {
    id,
    senderId,
    senderName,
    receiverId,
    roomId,
    content,
    timestamp,
    type,
  } = req.body;

  // Logika Penentuan Tujuan
  const finalReceiverId = receiverId || null;
  const finalRoomId = roomId || null;

  throughputCounter++;

  try {
    await pool.query(
      "INSERT INTO messages (id, sender_id, receiver_id, room_id, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        senderId,
        finalReceiverId,
        finalRoomId,
        content,
        timestamp,
        type,
        "sent",
      ]
    );

    const messageData = {
      id,
      senderId,
      senderName,
      receiverId: finalReceiverId,
      roomId: finalRoomId,
      content,
      timestamp,
      type,
      status: "delivered",
    };

    // LOGIKA BROADCAST PENTING:
    if (finalRoomId) {
      // Kirim ke Room Spesifik
      io.to(finalRoomId).emit("receive_message", messageData);
    } else if (finalReceiverId) {
      // Kirim Private (ke Socket penerima)
      // Kita butuh cari socketId dari receiverId (Pakai Map onlineUsers terbalik atau broadcast global filter di front)
      // Cara simpel: Broadcast global, frontend filter. (Aman untuk skala kecil)
      io.emit("receive_message", messageData);
    } else {
      // Global Chat
      io.emit("receive_message", messageData);
    }

    res.status(201).json(messageData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ... (Friendship API sama seperti sebelumnya) ...

// === SOCKET.IO HANDLERS (TCP + HYBRID SIGNALING) ===
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("register_session", async (userId) => {
    console.log("✅ REQUEST REGISTER SESSION DARI:", userId);
    onlineUsers.set(socket.id, userId);
    await pool.query('UPDATE users SET status = "online" WHERE id = ?', [
      userId,
    ]);
    const [users] = await pool.query(
      "SELECT id, username, email, role, status FROM users"
    );

    console.log("📡 BROADCASTING STATUS UPDATE:", users.length, "users");
    io.emit("user_status_update", users);
  });

  // === FITUR ROOM (TCP) ===
  socket.on("join_room", async (roomId) => {
    socket.join(roomId);

    // CARI USERNAME DARI DATABASE/MEMORY BERDASARKAN ID
    // Kita ambil dari map onlineUsers yang sudah kita set saat register_session
    const userId = onlineUsers.get(socket.id);
    let username = "Guest";

    if (userId) {
      const [rows] = await pool.query(
        "SELECT username FROM users WHERE id = ?",
        [userId]
      );
      if (rows.length > 0) username = rows[0].username;
    }

    console.log(`User ${username} (${socket.id}) joined room ${roomId}`);

    // KIRIM SOCKET ID + USERNAME KE PENGHUNI LAMA
    socket.to(roomId).emit("user_joined_room", {
      socketId: socket.id,
      username: username,
    });
  });

  // HANDLER UNTUK SIGNALING (Update agar username terbawa)
  socket.on("webrtc_offer", (data) => {
    // Data: { sdp, roomId, targetSocketId, senderUsername }
    socket.to(data.roomId).emit("webrtc_offer", {
      sdp: data.sdp,
      senderId: socket.id,
      senderUsername: data.senderUsername, // <--- TERUSKAN USERNAME
    });
  });

  socket.on("webrtc_answer", (data) => {
    io.to(data.targetSocketId).emit("webrtc_answer", {
      sdp: data.sdp,
      senderId: socket.id,
      senderUsername: data.senderUsername, // <--- TERUSKAN USERNAME
    });
  });

  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user_left_room", socket.id);
  });

  socket.on("close_room", async (roomId) => {
    console.log(`Room ${roomId} closed by creator`);

    try {
      // 1. Update DB
      await pool.query("UPDATE rooms SET is_active = 0 WHERE id = ?", [roomId]);

      // 2. Tendang peserta DI DALAM room
      io.to(roomId).emit("room_destroyed");
      io.in(roomId).socketsLeave(roomId);

      // 3. (BARU) Beritahu SEMUA ORANG di Lobby untuk hapus room dari list
      io.emit("room_closed", roomId);
    } catch (err) {
      console.error(err);
    }
  });

  // === FITUR WEBRTC SIGNALING (Hybrid UDP Bridge) ===
  // Server hanya meneruskan pesan, tidak menyimpannya
  socket.on("webrtc_offer", (data) => {
    // Data mengandung: sdp, roomId
    socket.to(data.roomId).emit("webrtc_offer", {
      sdp: data.sdp,
      senderId: socket.id, // Supaya penerima tahu siapa yang kirim
    });
  });

  socket.on("webrtc_answer", (data) => {
    // Data mengandung: sdp, targetSocketId
    io.to(data.targetSocketId).emit("webrtc_answer", {
      sdp: data.sdp,
      senderId: socket.id,
    });
  });

  socket.on("webrtc_ice_candidate", (data) => {
    // Data mengandung: candidate, roomId
    socket.to(data.roomId).emit("webrtc_ice_candidate", {
      candidate: data.candidate,
      senderId: socket.id,
    });
  });

  socket.on("ping_check", (ts) => {
    socket.emit("pong_check", ts);
  });

  socket.on("disconnect", async () => {
    // 1. Ambil User ID dari socket yang putus
    const userId = onlineUsers.get(socket.id);

    // 2. Hapus socket ini dari map DULUAN
    if (userId) {
      onlineUsers.delete(socket.id);

      // === LOGIKA BARU: MULTI-DEVICE CHECK ===
      // Cek apakah User ID ini MASIH ADA di socket lain?
      // Kita cari di Map onlineUsers values
      const isUserStillOnline = [...onlineUsers.values()].includes(userId);

      if (isUserStillOnline) {
        console.log(
          `⚠️ User ${userId} putus satu koneksi, tapi masih online di device lain.`
        );
        // JANGAN update DB jadi offline
        // JANGAN broadcast status update (karena statusnya tidak berubah, tetap online)
      } else {
        // Jika benar-benar tidak ada koneksi tersisa, baru set Offline
        console.log(
          `🔴 User ${userId} benar-benar offline (semua device putus).`
        );

        await pool.query('UPDATE users SET status = "offline" WHERE id = ?', [
          userId,
        ]);

        const [users] = await pool.query(
          "SELECT id, username, email, role, status FROM users"
        );
        io.emit("user_status_update", users);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Nexus Engine V2 (Public + Rooms) Running on port ${PORT}`);
});
