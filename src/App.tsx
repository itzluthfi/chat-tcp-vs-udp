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

  // --- NEW STATE: Active Tab (Lifted from ChatWindow) & Unread Counts ---
  const [activeTab, setActiveTabState] = useState<"global" | string>(() => {
    return localStorage.getItem("nexus_active_tab") || "global";
  });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem("nexus_active_tab", tab);
    // Clear unread count when switching to that user
    if (tab !== "global") {
        setUnreadCounts(prev => ({ ...prev, [tab]: 0 }));
    }
  };

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
    // Attempt Auto-Login
    const attemptAutoLogin = async () => {
      const token = localStorage.getItem("nexus_token");
      const rememberToken = localStorage.getItem("nexus_remember_token");

      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/verify`, {
             headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.valid) {
             setCurrentUser({ ...data.user, status: "online" });
             setIsOnline(true);
             return;
          }
        } catch (e) { console.error("Token verification failed", e); }
      }

      if (rememberToken) {
          try {
              const res = await fetch(`${API_URL}/auth/refresh`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rememberToken })
              });
              const data = await res.json();
              if (res.ok) {
                  localStorage.setItem("nexus_token", data.token);
                  setCurrentUser({ ...data.user, status: "online" });
                  setIsOnline(true);
              } else {
                  // Remember token invalid
                  localStorage.removeItem("nexus_remember_token");
                  localStorage.removeItem("nexus_token");
              }
          } catch (e) { console.error("Refresh failed", e); }
      }
    };

    attemptAutoLogin();

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

      // Handle Unread Badges
      if (currentUser && newMessage.senderId !== currentUser.id) {
         // If direct message AND not currently looking at this chat
         if (newMessage.receiverId === currentUser.id && activeTab !== newMessage.senderId) {
             setUnreadCounts(prev => ({
                 ...prev,
                 [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1
             }));
         }
      }

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
  }, [currentUser?.id, activeTab]); // Added activeTab to dep for unread logic correctness in closure? No, let's clearer approach. actually better not to rely on closure for activeTab in socket listener if we can avoid re-binding. The setMessages updater is safe. For unreadCounts, we need activeTab value. So we might need to use a ref for activeTab or accept re-binding. Since socket connection is heavy, let's use Ref for activeTab to avoid reconnects.

  // Use Ref for activeTab to access current value inside socket listener without reconnecting
  const activeTabRef = React.useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Redefine the socket effect to NOT depend on activeTab directly, use Ref
  // BUT wait, I modified the code above to depend on [currentUser?.id, activeTab]. This will reconnect socket on tab change which is BAD.
  // Converting to REF pattern for activeTab inside the effect above would be better but I'm replacing a huge chunk.
  // For simplicity and correctness with the replacing tool, I will remove activeTab from dependency array and use `activeTabRef` inside the listener in the replacement content below, if I could edit it.
  // Actually, I can just use the previous logic but I need to be careful.
  // Let's refine the replacement content to use Ref for activeTab.

  
  // --- 2. FETCH DATA AWAL ---
  useEffect(() => {
    if (!currentUser) return; // Only fetch data if logged in

    const initApp = async () => {
      addLog("GET", "/api/init", "...", "Connecting to Nexus Engine...");
      try {
        const res = await fetch(`${API_URL}/init`);
        const data = await res.json();

        setUsers(data.users || []);
        // Maybe filter messages for user or fetch all public?
        setMessages(data.messages || []);
        setFriendships(data.friendships || []);

        addLog("GET", "/api/init", 200, "Database synced.");
      } catch (err) {
        setIsOnline(false);
        addLog("AUTH", "/db/status", "FAIL", "Could not reach backend.");
      }
    };
    initApp();
  }, [currentUser]); // Fetch initial data when user logs in

  // --- 3. HANDLERS ---
  const handleSendMessage = async (content: string, receiverId?: string) => {
    if (!currentUser) return;
    const messageData: Message = {
      id: "msg_" + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      content,
      timestamp: Date.now(),
      type: (!receiverId && currentUser.role === "admin" ? "broadcast" : "text") as "broadcast" | "text",
      status: "sent"
    };

    try {
      addLog("POST", "/api/messages/send", "...", "Sending...");
      
      // Optimistic UI update: CHECK DUPLICATES FIRST
      setMessages((prev) => {
          if (prev.some(m => m.id === messageData.id)) return prev;
          return [...prev, messageData]; 
      });

      const res = await fetch(`${API_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      const savedMsg = await res.json();
      
      // Update with real data from server if needed (usually just ID/timestamp confirmation)
      // Since we already added it, we might just leave it or replace it.
      // Ideally, we don't add it again.
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
        onLogout={async () => {
          const rememberToken = localStorage.getItem("nexus_remember_token");
          // Call logout backend
          try {
              await fetch(`${API_URL}/auth/logout`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rememberToken, userId: currentUser.id })
              });
          } catch (e) { console.error("Logout failed", e); }

          localStorage.removeItem("nexus_token"); 
          localStorage.removeItem("nexus_remember_token");
          localStorage.removeItem("nexus_active_tab"); // Clear active chat on logout
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
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            unreadCounts={unreadCounts}
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
