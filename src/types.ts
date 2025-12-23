
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Only for simulation
  role: 'admin' | 'user';
  status: 'online' | 'offline';
  lastPing: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string; // If present, it's a private message
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'broadcast';
  status: 'sent' | 'delivered';
}

export interface Friendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted';
}

export interface MetricPoint {
  time: string;
  latency: number;
  throughput: number;
  activeUsers: number;
  wsOverhead: number;
  tcpOverhead: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  // Fix: Added 'PUT' and 'DELETE' to the allowed method types to support common HTTP verbs
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS' | 'AUTH';
  path: string;
  status: number | string;
  message: string;
}

export type ViewType = 'chat' | 'monitoring' | 'lab' | 'logs';