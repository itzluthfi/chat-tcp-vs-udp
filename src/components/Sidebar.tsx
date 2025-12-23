import React from "react";
import { User, ViewType } from "../types";

interface SidebarProps {
  activeView: ViewType;
  setView: (v: ViewType) => void;
  onLogout: () => void;
  user: User;
  isOnline: boolean;
  pendingRequests: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setView,
  onLogout,
  user,
  isOnline,
  pendingRequests,
}) => {
  const isAdmin = user.role === "admin";

  const menuItems = [
    { id: "chat", icon: "fa-comments", label: "Chat", show: true },
    {
      id: "monitoring",
      icon: "fa-chart-line",
      label: "Monitor",
      show: isAdmin,
    },
    { id: "lab", icon: "fa-flask", label: "Network Lab", show: isAdmin },
    { id: "logs", icon: "fa-terminal", label: "Kernel Logs", show: isAdmin },
  ];

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i className="fas fa-network-wired text-white text-xl"></i>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
            NEXUS
          </h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest italic">
            Nexus v2.4
          </p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeView === item.id
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <i className={`fas ${item.icon} text-lg w-6`}></i>
                <span className="font-medium">{item.label}</span>
              </div>
              {item.id === "chat" && pendingRequests > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingRequests}
                </span>
              )}
            </button>
          ))}
      </nav>

      <div className="p-4 bg-slate-800/50 border-t border-slate-700">
        <div className="flex items-center gap-3 p-2 mb-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <div className="relative">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isAdmin
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-indigo-500/20 text-indigo-500"
              }`}
            >
              <i
                className={`fas ${
                  isAdmin ? "fa-user-shield" : "fa-user"
                } text-xs`}
              ></i>
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                isOnline ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate">
              {user.username}
            </p>
            <p
              className={`text-[9px] uppercase font-black tracking-tighter ${
                isOnline ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {isOnline ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg hover:bg-rose-500/10 transition-colors uppercase tracking-widest"
        >
          <i className="fas fa-power-off"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
