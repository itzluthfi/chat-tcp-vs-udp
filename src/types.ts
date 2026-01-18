export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: "admin" | "user";
  status: "online" | "offline";
  lastPing: number;
}

// UPDATE: Tambah roomId dan tipe video
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  roomId?: string; // Field Baru untuk Room Chat
  content: string;
  timestamp: number;
  // Update tipe pesan untuk mendukung WebRTC Signaling
  type:
    | "text"
    | "system"
    | "broadcast"
    | "video_offer"
    | "video_answer"
    | "ice_candidate";
  status: "sent" | "delivered";
}

// BARU: Interface untuk Room
export interface Room {
  id: string;
  name: string;
  creator_id: string;
  is_active: number; // 1 or 0
}

export interface Friendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted";
}

export interface MetricPoint {
  time: string;
  latency: number;
  throughput: number;
  activeUsers: number;
  wsOverhead?: number;
  tcpOverhead: number;
  loss?: number;
}

export type LogMethod = "GET" | "POST" | "PUT" | "DELETE" | "WS";

export interface LogEntry {
  id: string;
  timestamp: string;
  method: LogMethod;
  path: string;
  status: number | string;
  message: string;
}

export type ViewType = "chat" | "monitoring" | "lab" | "logs" | "rooms"; // Tambah 'rooms'
