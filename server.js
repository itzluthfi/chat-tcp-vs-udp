
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexus_realtime_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- API ROUTES ---

// Initial Sync
app.get('/api/init', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, role, status FROM users');
    const [messages] = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC LIMIT 100');
    const [friendships] = await pool.query('SELECT * FROM friendships');
    res.json({ users, messages, friendships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length > 0) {
      const user = rows[0];
      await pool.query('UPDATE users SET status = "online" WHERE id = ?', [user.id]);
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Message
app.post('/api/messages/send', async (req, res) => {
  const { id, senderId, senderName, receiverId, content, timestamp, type } = req.body;
  try {
    await pool.query(
      'INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, senderId, receiverId || null, content, timestamp, type, 'sent']
    );
    
    const messageData = { id, senderId, senderName, receiverId, content, timestamp, type, status: 'delivered' };
    io.emit('receive_message', messageData);
    
    res.status(201).json(messageData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Friend Actions
app.post('/api/friendships/action', async (req, res) => {
  const { senderId, receiverId, action } = req.body;
  try {
    if (action === 'add') {
      const id = 'f' + Date.now();
      await pool.query('INSERT INTO friendships (id, sender_id, receiver_id, status) VALUES (?, ?, ?, ?)', [id, senderId, receiverId, 'pending']);
      io.emit('friend_request', { id, senderId, receiverId, status: 'pending' });
    } else if (action === 'accept') {
      await pool.query('UPDATE friendships SET status = "accepted" WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [senderId, receiverId, receiverId, senderId]);
      io.emit('friend_accepted', { senderId, receiverId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Nexus Engine Running on port ${PORT}`);
});
