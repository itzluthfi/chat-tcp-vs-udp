import React, { useState, useEffect } from "react";
import { io } from "socket.io-client"; // Socket Client
import {
  User,
  Message,
  MetricPoint,
  ViewType,
  LogEntry,
  Friendship,
} from "./types";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Dashboard from "./components/Dashboard";
import NetworkLab from "./components/NetworkLab";
import KernelLogs from "./components/KernelLogs";
import Login from "./components/Login";

const API_URL = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Helper Log
  const addLog = (
    method: LogEntry["method"],
    path: string,
    status: number | string,
    message: string
  ) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method,
      path,
      status,
      message,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50));
  };

  // --- 1. LOGIKA UTAMA: SOCKET.IO ---
  useEffect(() => {
    // Connect
    const socket = io(SOCKET_URL);

    // Event: Connect
    socket.on("connect", () => {
      addLog("WS", "/socket.io", "CONNECTED", `Socket ID: ${socket.id}`);
      setIsOnline(true);
    });

    // Event: Disconnect
    socket.on("disconnect", () => {
      addLog("WS", "/socket.io", "DISCONNECT", "Lost connection to server");
      setIsOnline(false);
    });

    // Event: Terima Pesan Chat
    socket.on("receive_message", (newMessage: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      addLog("WS", "receive_message", 200, `Msg from ${newMessage.senderName}`);
    });

    // Event: Terima Statistik Realtime (UNTUK DASHBOARD)
    socket.on("server_stats", (stats: any) => {
      setMetrics((prev) => {
        // Ambil latency terakhir (karena latency dihitung terpisah via Ping)
        const currentLatency =
          prev.length > 0 ? prev[prev.length - 1].latency : 0;

        const newPoint: MetricPoint = {
          time: new Date(stats.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          latency: currentLatency, // Ini akan diupdate oleh fungsi Ping di bawah
          throughput: stats.throughput, // DATA ASLI DARI SERVER
          activeUsers: stats.activeUsers, // DATA ASLI DARI SERVER
          wsOverhead: 2.4, // Konstan
          tcpOverhead: 60, // Konstan
        };
        return [...prev.slice(-19), newPoint];
      });
    });

    // Event: Hasil Ping Pong (UNTUK LATENCY ASLI)
    socket.on("pong_check", (sentTimestamp: number) => {
      const latency = Date.now() - sentTimestamp; // RTT (Round Trip Time)

      // Update data grafik terakhir dengan latency asli
      setMetrics((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        // Update titik terakhir
        updated[updated.length - 1].latency = latency;
        return updated;
      });
    });

    // --- INTERVAL PING (Setiap 2 Detik) ---
    const pingInterval = setInterval(() => {
      const start = Date.now();
      socket.emit("ping_check", start); // Kirim Ping ke Server
    }, 2000);

    // Teman Actions Listeners
    socket.on("friend_request", (data: any) => {
      if (currentUser && data.receiverId === currentUser.id) {
        setFriendships((prev) => [...prev, data]);
        addLog("WS", "friend_request", 200, "Incoming friend request");
      }
    });

    socket.on("friend_accepted", (data: any) => {
      setFriendships((prev) =>
        prev.map((f) => {
          if (
            (f.senderId === data.senderId &&
              f.receiverId === data.receiverId) ||
            (f.senderId === data.receiverId && f.receiverId === data.senderId)
          ) {
            return { ...f, status: "accepted" };
          }
          return f;
        })
      );
    });

    return () => {
      socket.disconnect();
      clearInterval(pingInterval);
    };
  }, [currentUser]);

  // --- 2. FETCH DATA AWAL ---
  useEffect(() => {
    const initApp = async () => {
      addLog("GET", "/api/init", "...", "Connecting to Nexus Engine...");
      try {
        const res = await fetch(`${API_URL}/init`);
        const data = await res.json();

        setUsers(data.users || []);
        setMessages(data.messages || []);
        setFriendships(data.friendships || []);

        addLog("GET", "/api/init", 200, "Database synced.");
      } catch (err) {
        setIsOnline(false);
        addLog("AUTH", "/db/status", "FAIL", "Could not reach backend.");
      }
    };
    initApp();
  }, []);

  // --- 3. HANDLERS ---
  const handleSendMessage = async (content: string, receiverId?: string) => {
    if (!currentUser) return;
    const messageData = {
      id: "msg_" + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      content,
      timestamp: Date.now(),
      type: !receiverId && currentUser.role === "admin" ? "broadcast" : "text",
    };

    try {
      addLog("POST", "/api/messages/send", "...", "Sending...");
      const res = await fetch(`${API_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      const savedMsg = await res.json();
      // Optimistic UI update
      setMessages((prev) => [...prev, savedMsg]);
      addLog("POST", "/api/messages/send", 201, "Sent & Counted.");
    } catch (err) {
      addLog("POST", "/api/messages/send", 500, "Failed.");
    }
  };

  const handleFriendAction = async (
    targetUserId: string,
    action: "add" | "accept" | "reject"
  ) => {
    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/friendships/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: targetUserId,
          action,
        }),
      });
      if (action === "add") {
        setFriendships((prev) => [
          ...prev,
          {
            id: "temp",
            senderId: currentUser.id,
            receiverId: targetUserId,
            status: "pending",
          },
        ]);
      } else if (action === "accept") {
        setFriendships((prev) =>
          prev.map((f) =>
            f.senderId === targetUserId && f.receiverId === currentUser.id
              ? { ...f, status: "accepted" }
              : f
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} availableUsers={users} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-100">
      <Sidebar
        activeView={view}
        setView={setView}
        onLogout={() => {
          localStorage.removeItem("nexus_token"); // Hapus Token saat logout
          setCurrentUser(null);
        }}
        user={currentUser}
        isOnline={isOnline}
        pendingRequests={
          friendships.filter(
            (f) => f.receiverId === currentUser.id && f.status === "pending"
          ).length
        }
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 bg-rose-600 text-white text-[10px] font-black py-1 text-center z-[100] tracking-[0.3em] uppercase animate-pulse">
            Connection Lost
          </div>
        )}
        {view === "chat" && (
          <ChatWindow
            messages={messages}
            users={users}
            friendships={friendships}
            typingUser={null}
            onSendMessage={handleSendMessage}
            onFriendAction={handleFriendAction}
            currentUser={currentUser}
            isOnline={isOnline}
          />
        )}
        {currentUser.role === "admin" && (
          <>
            {view === "monitoring" && <Dashboard metrics={metrics} />}
            {view === "lab" && <NetworkLab metrics={metrics} />}
            {view === "logs" && <KernelLogs logs={logs} />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
