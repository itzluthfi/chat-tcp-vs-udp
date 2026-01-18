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
  LogMethod,
} from "./types";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

// --- KITA PANGGIL KEMBALI KOMPONEN ADMIN ---
import Dashboard from "./components/Dashboard";
import NetworkLab from "./components/NetworkLab";
import KernelLogs from "./components/KernelLogs";

import Login from "./components/Login";
import Register from "./components/Register";
import RoomList from "./components/RoomList";
import VideoRoom from "./components/VideoRoom";

import { API_URL, SOCKET_URL } from "./config";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // VIEW STATE
  const [view, setView] = useState<ViewType>("chat");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // DATA STATE
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  // STATE ADMIN (Sekarang hidup di App.tsx)
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [activeTab, setActiveTabState] = useState<"global" | string>(() => {
    return localStorage.getItem("nexus_active_tab") || "global";
  });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>(
    {},
  );

  const socketRef = useRef<Socket | null>(null);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem("nexus_active_tab", tab);
    if (tab !== "global") {
      setUnreadCounts((prev) => ({ ...prev, [tab]: 0 }));
    }
  };

  // Helper untuk log
  const addLog = (
    method: LogMethod,
    path: string,
    status: number,
    msg: string,
  ) => {
    // Hanya simpan log jika user adalah admin (untuk hemat memori user biasa)
    if (currentUser?.role !== "admin") return;

    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      method,
      path,
      status,
      message: msg,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50));
  };

  // === EFFECT: AUTO LOGIN ===
  useEffect(() => {
    const attemptAutoLogin = async () => {
      setIsCheckingSession(true);
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
              setCurrentUser({ ...data.user, status: "online" });
              setIsCheckingSession(false);
              return;
            }
          } else {
            localStorage.removeItem("nexus_token");
          }
        }
        // Logic Refresh Token sederhana...
        setIsCheckingSession(false);
      } catch (e) {
        setIsCheckingSession(false);
      }
    };
    attemptAutoLogin();
  }, []);

  // === EFFECT: SOCKET.IO ===
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
      setIsOnline(true);
      socket.emit("register_session", currentUser.id);
      addLog("WS", "CONNECT", 200, `Socket ID: ${socket.id}`);
    });

    socket.on("disconnect", () => setIsOnline(false));

    socket.on("user_status_update", (updatedUsers: User[]) =>
      setUsers(updatedUsers),
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
      addLog("POST", "/api/messages", 201, `Msg from ${newMessage.senderName}`);
    });

    // === LISTENER MONITORING (HANYA AKTIF JIKA ADMIN) ===
    // Tapi kita pasang saja, kalau bukan admin UI-nya gak muncul kok
    socket.on("server_stats", (data: any) => {
      if (currentUser.role !== "admin") return; // Hemat resource client user

      setMetrics((prev) => {
        const newPoint: MetricPoint = {
          time: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          latency: data.video.udpLatency,
          throughput: data.chat.count,
          activeUsers: data.activeUsers,
          tcpOverhead: 60,
          wsOverhead: 8,
          loss: 0,
        };
        const newHistory = [...prev, newPoint];
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
    });

    socket.on("room_created", (newRoom: Room) => {
      setRooms((prev) => [...prev, newRoom]);
      addLog("POST", "/api/rooms", 201, `Room Created: ${newRoom.name}`);
    });

    socket.on("room_closed", (closedRoomId: string) => {
      setRooms((prev) => prev.filter((r) => r.id !== closedRoomId));
      if (activeRoomId === closedRoomId) setActiveRoomId(null);
      addLog("DELETE", "/api/rooms", 200, `Room Closed: ${closedRoomId}`);
    });

    socket.on("user_joined_room", (d: any) => {
      addLog("WS", "JOIN_ROOM", 101, `User joined room`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  // === EFFECT: FETCH INITIAL DATA ===
  useEffect(() => {
    if (!currentUser) return;
    const initApp = async () => {
      try {
        const res = await fetch(`${API_URL}/init`);
        const data = await res.json();
        setUsers(data.users || []);
        setMessages(data.messages || []);
        setFriendships(data.friendships || []);
        setRooms(data.rooms || []);
      } catch (err) {
        setIsOnline(false);
      }
    };
    initApp();
  }, [currentUser?.id]);

  // === HANDLERS ===
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
    setMessages((prev) => [...prev, messageData]);
    await fetch(`${API_URL}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    });
  };

  const handleFriendAction = async (
    targetUserId: string,
    action: "add" | "accept" | "reject",
  ) => {
    // ... Copy logic friend action Anda yang lama ...
    // Agar singkat saya skip detail implementasi fetch-nya, pakai yang lama saja
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
        // Optimistic UI update
        setFriendships((prev) => [
          ...prev,
          {
            id: "tmp",
            senderId: currentUser.id,
            receiverId: targetUserId,
            status: "pending",
          },
        ]);
      }
    } catch (e) {}
  };

  const handleCreateRoom = async (name: string) => {
    if (!currentUser) return;
    await fetch(`${API_URL}/rooms/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, creatorId: currentUser.id }),
    });
  };

  const handleJoinRoom = (roomId: string) => {
    localStorage.setItem("nexus_active_room", roomId);
    setActiveRoomId(roomId);
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (e) {}
    }
    localStorage.clear();
    setCurrentUser(null);
  };

  // === RENDER ===
  if (isCheckingSession) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center text-slate-500">
        Loading...
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

  const currentRoomData = rooms.find((r) => r.id === activeRoomId);
  if (activeRoomId && socketRef.current && currentRoomData) {
    return (
      <VideoRoom
        activeRoom={currentRoomData}
        currentUser={currentUser}
        socket={socketRef.current}
        onLeave={() => {
          localStorage.removeItem("nexus_active_room");
          setActiveRoomId(null);
        }}
      />
    );
  }

  // --- UNIFIED LAYOUT (ADMIN & USER PAKE INI) ---
  return (
    <div className="flex h-[100dvh] bg-slate-900 overflow-hidden text-slate-100">
      <Sidebar
        activeView={view}
        setView={setView}
        onLogout={handleLogout}
        user={currentUser}
        isOnline={isOnline}
        pendingRequests={
          friendships.filter(
            (f) => f.receiverId === currentUser.id && f.status === "pending",
          ).length
        }
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-20 md:pb-0">
        {!isOnline && (
          <div className="absolute top-0 w-full bg-rose-600 text-center text-[10px] font-bold z-50">
            CONNECTION LOST
          </div>
        )}

        {/* VIEW: CHAT */}
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

        {/* VIEW: ROOMS */}
        {view === "rooms" && (
          <RoomList
            rooms={rooms}
            currentUser={currentUser}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {/* VIEW: ADMIN TOOLS (Hanya Render Jika Admin) */}
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
