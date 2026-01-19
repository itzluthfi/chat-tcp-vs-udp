import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import Dashboard from "../components/Dashboard";
import NetworkLab from "../components/NetworkLab";
import KernelLogs from "../components/KernelLogs";
// UPDATE: Import LogMethod agar tidak error saat passing tipe method
import { MetricPoint, LogEntry, LogMethod } from "../types";

interface AdminPageProps {
  socket: Socket;
  onLogout: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ socket, onLogout }) => {
  // State untuk Navigasi Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "lab" | "logs">(
    "dashboard",
  );

  // State Data (Single Source of Truth)
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // === 1. DENGARKAN DATA DARI SERVER (server.js) ===
    socket.on("server_stats", (data) => {
      setMetrics((prev) => {
        const newPoint: MetricPoint = {
          time: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),

          latency:
            data.video.count > 0 ? data.video.latency : data.chat.latency,

          // Throughput adalah gabungan aktivitas Chat + Video
          throughput: data.chat.count + (data.video.count > 0 ? 10 : 0),

          activeUsers: data.activeUsers,
          tcpOverhead: 60,
          wsOverhead: 8,

          loss: data.video.loss,
        };

        const newHistory = [...prev, newPoint];
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
    });

    // === 2. DENGARKAN LOG REALTIME ===

    // UPDATE PENTING: Ubah tipe 'method' menjadi 'LogMethod' agar TypeScript tidak protes
    const handleLog = (
      method: LogMethod,
      path: string,
      status: number,
      msg: string,
    ) => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        method, // Sekarang aman karena tipenya sudah cocok
        path,
        status,
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 50));
    };

    // Event Listeners untuk Log
    socket.on("receive_message", (d) =>
      handleLog(
        "POST",
        "/api/messages",
        201,
        `Msg Size: ${d.content?.length || 0}b`,
      ),
    );

    socket.on("user_joined_room", (d) =>
      handleLog("WS", "JOIN_ROOM", 101, `User: ${d.username}`),
    );

    socket.on("room_created", (d) =>
      handleLog("POST", "/api/rooms", 201, `Room: ${d.name}`),
    );

    // Cleanup saat unmount
    return () => {
      socket.off("server_stats");
      socket.off("receive_message");
      socket.off("user_joined_room");
      socket.off("room_created");
    };
  }, [socket]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* === SIDEBAR === */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
        <h1 className="text-2xl font-black text-indigo-500 mb-10 tracking-tighter">
          NEXUS<span className="text-white">ADMIN</span>
        </h1>

        <nav className="space-y-2 flex-1">
          <MenuButton
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
            icon="fa-chart-line"
            label="Monitor"
          />
          <MenuButton
            active={activeTab === "lab"}
            onClick={() => setActiveTab("lab")}
            icon="fa-flask"
            label="Network Lab"
          />
          <MenuButton
            active={activeTab === "logs"}
            onClick={() => setActiveTab("logs")}
            icon="fa-terminal"
            label="Kernel Logs"
          />
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto flex items-center gap-3 text-slate-500 hover:text-white transition-colors text-sm font-bold"
        >
          <i className="fas fa-sign-out-alt"></i> Logout Admin
        </button>
      </div>

      {/* === MAIN CONTENT (Dinamis berubah sesuai Tab) === */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "dashboard" && <Dashboard metrics={metrics} />}
        {activeTab === "lab" && <NetworkLab metrics={metrics} />}
        {activeTab === "logs" && <KernelLogs logs={logs} />}
      </div>
    </div>
  );
};

// Interface untuk Props MenuButton agar lebih strict
interface MenuButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

const MenuButton: React.FC<MenuButtonProps> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
      active
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
        : "text-slate-500 hover:bg-slate-800"
    }`}
  >
    <i className={`fas ${icon} mr-3`}></i> {label}
  </button>
);

export default AdminPage;
