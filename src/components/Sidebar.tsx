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
    // MENU UMUM (Semua Bisa Akses)
    { id: "chat", icon: "fa-comments", label: "Chats", show: true },
    { id: "rooms", icon: "fa-users", label: "Rooms", show: true },

    // MENU KHUSUS ADMIN (Hanya muncul jika isAdmin = true)
    {
      id: "monitoring",
      icon: "fa-chart-line",
      label: "Monitor",
      show: isAdmin,
    },
    { id: "lab", icon: "fa-flask", label: "Net Lab", show: isAdmin },
    { id: "logs", icon: "fa-terminal", label: "Logs", show: isAdmin },
  ];

  return (
    <>
      {/* === DESKTOP SIDEBAR === */}
      <div className="hidden md:flex w-64 bg-slate-800 border-r border-slate-700 flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <i className="fas fa-network-wired text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
              NEXUS
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest italic">
              {isAdmin ? "Admin Console" : "User Client"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeView === item.id
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                }`}
              >
                <i className={`fas ${item.icon} text-lg w-6 text-center`}></i>
                <span className="font-medium">{item.label}</span>

                {/* Badge Chat */}
                {item.id === "chat" && pendingRequests > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {pendingRequests}
                  </span>
                )}
              </button>
            ))}
        </nav>

        {/* Footer Profile */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-700">
          <div className="flex items-center gap-3 p-2 mb-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <div className="relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? "bg-amber-500/20 text-amber-500" : "bg-indigo-500/20 text-indigo-500"}`}
              >
                <i
                  className={`fas ${isAdmin ? "fa-user-shield" : "fa-user"} text-xs`}
                ></i>
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`}
              ></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">
                {user.username}
              </p>
              <p className="text-[9px] text-slate-500 uppercase font-black">
                {isAdmin ? "Administrator" : "Member"}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg hover:bg-rose-500/10 transition-colors uppercase tracking-widest"
          >
            <i className="fas fa-power-off"></i> Logout
          </button>
        </div>
      </div>

      {/* === MOBILE BOTTOM NAV === */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-around px-2 z-50 pb-safe">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${
                activeView === item.id ? "text-indigo-500" : "text-slate-500"
              }`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="text-[9px] font-bold truncate max-w-[50px]">
                {item.label}
              </span>
            </button>
          ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center w-14 h-full space-y-1 text-slate-500 hover:text-rose-500"
        >
          <i className="fas fa-sign-out-alt text-lg"></i>
          <span className="text-[9px] font-bold">Exit</span>
        </button>
      </div>
    </>
  );
};

export default Sidebar;
