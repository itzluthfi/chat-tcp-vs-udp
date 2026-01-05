const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

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

// === MIDDLEWARE AUTH ===
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

// === API ROUTES ===

app.get("/api/init", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, email, role, status FROM users"
    );


    const [messages] = await pool.query(`
      SELECT 
        m.id, 
        m.sender_id AS senderId,
        u.username AS senderName, 
        m.receiver_id AS receiverId, 
        m.content, 
        m.timestamp, 
        m.type, 
        m.status 
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      ORDER BY m.timestamp ASC 
      LIMIT 100
    `);

    const [friendships] = await pool.query("SELECT * FROM friendships");
    res.json({ users, messages, friendships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
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

      let rememberToken = null;
      if (rememberMe) {
        rememberToken = crypto.randomBytes(32).toString("hex");
        await pool.query('UPDATE users SET remember_token = ? WHERE id = ?', [rememberToken, user.id]);
      }

      const { password: _, remember_token: __, ...userSafe } = user;
      res.json({
        token,
        user: userSafe,
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
    const { rememberToken } = req.body;
    if (!rememberToken) return res.status(400).json({ error: "No token provided" });

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE remember_token = ?", [rememberToken]);
        if (rows.length > 0) {
            const user = rows[0];
            
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

app.post("/api/messages/send", async (req, res) => {
  // Ambil data
  const { id, senderId, senderName, receiverId, content, timestamp, type } =
    req.body;

  throughputCounter++;

  try {
    await pool.query(
      "INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, senderId, finalReceiverId, content, timestamp, type, "sent"] // Gunakan finalReceiverId
    );

    
    const messageData = {
      id,
      senderId,
      senderName,
      receiverId: finalReceiverId, // Kirim balik NULL ke frontend
      content,
      timestamp,
      type,
      status: "delivered",
    };

    io.emit("receive_message", messageData);

    res.status(201).json(messageData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

// === SOCKET.IO HANDLERS (TCP/WebSocket) ===
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("ping_check", (clientTimestamp) => {
    socket.emit("pong_check", clientTimestamp);
  });

  socket.on("disconnect", async () => {
    console.log(`❌ User Disconnected: ${socket.id}`);

    const userId = onlineUsers.get(socket.id);

    if (userId) {

      await pool.query('UPDATE users SET status = "offline" WHERE id = ?', [
        userId,
      ]);

      onlineUsers.delete(socket.id);

      const [users] = await pool.query(
        "SELECT id, username, email, role, status FROM users"
      );
      io.emit("user_status_update", users);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(
    `🚀 Nexus Engine (JWT + Monitoring Active) Running on port ${PORT}`
  );
});
