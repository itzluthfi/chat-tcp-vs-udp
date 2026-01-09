import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  User,
  Message,
  MetricPoint,
  ViewType,
  LogEntry,
  Friendship,
  Room,
} from "./types";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Dashboard from "./components/Dashboard";
import NetworkLab from "./components/NetworkLab";
import KernelLogs from "./components/KernelLogs";
import Login from "./components/Login";
import Register from "./components/Register";
import RoomList from "./components/RoomList";
import VideoRoom from "./components/VideoRoom";

const API_URL = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // 1. State Loading Session
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // VIEW STATE
  const [view, setView] = useState<ViewType>("chat");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null); // State untuk Video Call

  // DATA STATE
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const [activeTab, setActiveTabState] = useState<"global" | string>(() => {
    return localStorage.getItem("nexus_active_tab") || "global";
  });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>(
    {}
  );

  // Ref untuk Socket agar stabil
  const socketRef = useRef<Socket | null>(null);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem("nexus_active_tab", tab);
    if (tab !== "global") {
      setUnreadCounts((prev) => ({ ...prev, [tab]: 0 }));
    }
  };

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

  // === EFFECT 1: AUTO LOGIN (Jalan Sekali saat Mount) ===
  useEffect(() => {
    const attemptAutoLogin = async () => {
      setIsCheckingSession(true);
      console.log("🔄 Memulai Auto Login...");

      const token = localStorage.getItem("nexus_token");
      const rememberToken = localStorage.getItem("nexus_remember_token");

      try {
        if (token) {
          const res = await fetch(`${API_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.valid) {
              console.log("✅ Token Valid!");
              setCurrentUser({ ...data.user, status: "online" });
              setIsCheckingSession(false);
              return;
            }
          } else {
            console.warn("⚠️ Token ditolak server. Menghapus token...");
            localStorage.removeItem("nexus_token");
          }
        }

        if (rememberToken) {
          const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rememberToken }),
          });

          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("nexus_token", data.token);
            setCurrentUser({ ...data.user, status: "online" });
          } else {
            localStorage.removeItem("nexus_remember_token");
            localStorage.removeItem("nexus_token");
          }
        }
      } catch (e) {
        console.error("❌ Auto login error:", e);
      } finally {
        setIsCheckingSession(false);
      }
    };

    attemptAutoLogin();
  }, []);

  // === EFFECT 2: SOCKET.IO (Jalan saat User Login/Logout) ===
  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsOnline(false);
      return;
    }

    if (socketRef.current && socketRef.current.connected) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      addLog("WS", "/socket.io", "CONNECTED", `Socket ID: ${socket.id}`);
      setIsOnline(true);
      socket.emit("register_session", currentUser.id);
    });

    socket.on("disconnect", () => {
      addLog("WS", "/socket.io", "DISCONNECT", "Lost connection");
      setIsOnline(false);
    });

    socket.on("user_status_update", (updatedUsers: User[]) =>
      setUsers(updatedUsers)
    );

    socket.on("receive_message", (newMessage: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      if (newMessage.senderId !== currentUser.id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
      }
    });

    socket.on("server_stats", (stats: any) => {
      setMetrics((prev) => {
        const currentLatency =
          prev.length > 0 ? prev[prev.length - 1].latency : 0;
        return [
          ...prev.slice(-19),
          {
            time: new Date(stats.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            latency: currentLatency,
            throughput: stats.throughput,
            activeUsers: stats.activeUsers,
            wsOverhead: 2.4,
            tcpOverhead: 60,
          },
        ];
      });
    });

    socket.on("pong_check", (ts: number) => {
      const latency = Date.now() - ts;
      setMetrics((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[updated.length - 1].latency = latency;
        return updated;
      });
    });

    const pingInterval = setInterval(() => {
      socket.emit("ping_check", Date.now());
    }, 2000);

    socket.on("friend_request", (data: any) => {
      if (data.receiverId === currentUser.id) {
        setFriendships((prev) => [...prev, data]);
        addLog("WS", "friend_request", 200, "Incoming req");
      }
    });

    socket.on("friend_accepted", (data: any) => {
      setFriendships((prev) =>
        prev.map((f) => {
          if (
            (f.senderId === data.senderId &&
              f.receiverId === data.receiverId) ||
            (f.senderId === data.receiverId && f.senderId === data.receiverId)
          ) {
            return { ...f, status: "accepted" };
          }
          return f;
        })
      );
    });

    // --- SOCKET ROOM EVENTS ---
    socket.on("room_created", (newRoom: Room) => {
      setRooms((prev) => [...prev, newRoom]);
      addLog("WS", "room_created", 200, `New room: ${newRoom.name}`);
    });

    // Jika room dihapus oleh creator
    // socket.on("room_destroyed", () => {
    //   // Logika force close ada di VideoRoom, tapi disini kita bisa update list
    //   // Sebenarnya idealnya fetch ulang list room atau filter out
    // });

    socket.on("room_closed", (closedRoomId: string) => {
      setRooms((prev) => prev.filter((r) => r.id !== closedRoomId));
      addLog("WS", "room_closed", 200, `Room removed: ${closedRoomId}`);

      // Jaga-jaga jika kita sedang memegang ID room yang baru saja dihapus
      if (activeRoomId === closedRoomId) {
        setActiveRoomId(null);
      }
    });

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  // === EFFECT 3: FETCH DATA AWAL ===
  useEffect(() => {
    if (!currentUser) return;
    const initApp = async () => {
      addLog("GET", "/api/init", "...", "Syncing...");
      try {
        const res = await fetch(`${API_URL}/init`);
        const data = await res.json();
        setUsers(data.users || []);
        setMessages(data.messages || []);
        setFriendships(data.friendships || []);
        setRooms(data.rooms || []); // Load Rooms
        addLog("GET", "/api/init", 200, "Synced.");
      } catch (err) {
        setIsOnline(false);
      }
    };
    initApp();
  }, [currentUser?.id]);

  // --- HANDLERS UTAMA ---

  const handleSendMessage = async (content: string, receiverId?: string) => {
    if (!currentUser) return;
    const messageData: Message = {
      id: "msg_" + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      content,
      timestamp: Date.now(),
      type: (!receiverId && currentUser.role === "admin"
        ? "broadcast"
        : "text") as any,
      status: "sent",
    };

    try {
      setMessages((prev) => [...prev, messageData]);
      await fetch(`${API_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- ROOM HANDLERS ---

  const handleCreateRoom = async (name: string) => {
    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, creatorId: currentUser.id }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  // --- RENDER LOGIC ---

  if (isCheckingSession) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-mono animate-pulse">
          RESTORING SESSION...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    if (showRegister)
      return <Register onSwitchToLogin={() => setShowRegister(false)} />;
    return (
      <Login
        onLogin={setCurrentUser}
        availableUsers={users}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  // --- MODE VIDEO CALL (FULL SCREEN) ---
  // Cari data room lengkap berdasarkan ID
  const currentRoomData = rooms.find((r) => r.id === activeRoomId);

  if (activeRoomId && socketRef.current && currentRoomData) {
    return (
      <VideoRoom
        activeRoom={currentRoomData} // PASS OBJECT ROOM
        currentUser={currentUser}
        socket={socketRef.current}
        onLeave={() => setActiveRoomId(null)}
      />
    );
  }

  // --- MODE DASHBOARD / CHAT BIASA ---
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-100">
      <Sidebar
        activeView={view}
        setView={setView}
        onLogout={async () => {
          const rememberToken = localStorage.getItem("nexus_remember_token");
          try {
            await fetch(`${API_URL}/auth/logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rememberToken, userId: currentUser.id }),
            });
          } catch (e) {}
          localStorage.removeItem("nexus_token");
          localStorage.removeItem("nexus_remember_token");
          localStorage.removeItem("nexus_active_tab");
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

        {view === "rooms" && (
          <RoomList
            rooms={rooms}
            currentUser={currentUser}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
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
