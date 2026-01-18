import React, { useState, useRef, useEffect } from "react";
import { Message, User, Friendship } from "../types";

interface ChatWindowProps {
  messages: Message[];
  users: User[];
  friendships: Friendship[];
  typingUser: string | null;
  onSendMessage: (content: string, receiverId?: string) => void;
  onFriendAction: (
    targetUserId: string,
    action: "add" | "accept" | "reject",
  ) => void;
  currentUser: User;
  isOnline: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCounts: { [key: string]: number };
}

const SignalIndicator: React.FC<{ active: boolean }> = ({ active }) => {
  const [latency, setLatency] = useState(
    active ? Math.floor(20 + Math.random() * 30) : 0,
  );

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setLatency((prev) => {
        const jitter = Math.floor(Math.random() * 5) - 2;
        const next = prev + jitter;
        return next < 15 ? 15 : next > 80 ? 80 : next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex items-center gap-2">
      {active && (
        <span className="text-[9px] font-mono font-bold text-slate-500 animate-in fade-in">
          {latency}ms
        </span>
      )}
      <div className="flex items-end gap-0.5 h-3">
        <div
          className={`w-1 rounded-t-sm transition-all duration-500 ${active ? "h-1.5 bg-emerald-500 animate-[pulse_1.5s_infinite]" : "h-1 bg-slate-700"}`}
        ></div>
        <div
          className={`w-1 rounded-t-sm transition-all duration-500 ${active ? "h-2.5 bg-emerald-500 animate-[pulse_1.8s_infinite]" : "h-1 bg-slate-700"}`}
        ></div>
        <div
          className={`w-1 rounded-t-sm transition-all duration-500 ${active ? "h-3.5 bg-emerald-500 animate-[pulse_1.2s_infinite]" : "h-1 bg-slate-700"}`}
        ></div>
      </div>
    </div>
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  users,
  friendships,
  typingUser,
  onSendMessage,
  onFriendAction,
  currentUser,
  isOnline,
  activeTab,
  setActiveTab,
  unreadCounts,
}) => {
  const [input, setInput] = useState("");
  // STATE BARU: Untuk toggle sidebar user di mobile
  const [showMobileUsers, setShowMobileUsers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab, typingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isOnline) {
      onSendMessage(input, activeTab === "global" ? undefined : activeTab);
      setInput("");
    }
  };

  const filteredMessages = messages.filter((m) => {
    const rawReceiver = m.receiverId;
    const isGlobalMessage =
      rawReceiver === null ||
      rawReceiver === undefined ||
      rawReceiver === "" ||
      rawReceiver === "null";

    if (activeTab === "global") return isGlobalMessage;
    if (isGlobalMessage) return false;

    return (
      (m.senderId === currentUser.id && m.receiverId === activeTab) ||
      (m.senderId === activeTab && m.receiverId === currentUser.id)
    );
  });

  const selectedUser = users.find((u) => u.id === activeTab);
  const friendRequests = friendships.filter(
    (f) => f.receiverId === currentUser.id && f.status === "pending",
  );

  const friendsIds = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => (f.senderId === currentUser.id ? f.receiverId : f.senderId));

  // Fungsi Helper untuk menutup sidebar mobile saat memilih user
  const handleUserSelect = (userId: string) => {
    setActiveTab(userId);
    setShowMobileUsers(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* --- KIRI: AREA CHAT UTAMA --- */}
      <div className="flex-1 flex flex-col bg-slate-900 w-full min-w-0">
        <header className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800 flex items-center justify-between z-10 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg shrink-0 ${activeTab === "global" ? "bg-indigo-600 text-white shadow-indigo-600/20" : "bg-slate-800 text-slate-300"}`}
            >
              <i
                className={`fas ${activeTab === "global" ? "fa-comments" : "fa-user-circle"} text-lg md:text-xl`}
              ></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                {activeTab === "global"
                  ? "Public Lounge"
                  : selectedUser?.username}
                {isOnline && activeTab === "global" && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                )}
              </h2>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium tracking-wide uppercase truncate">
                {activeTab === "global" ? "• Server is Live" : "Private Chat"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TOMBOL TOGGLE USER LIST (HANYA MUNCUL DI MOBILE) */}
            <button
              onClick={() => setShowMobileUsers(!showMobileUsers)}
              className="lg:hidden w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl text-slate-400 border border-slate-700 active:scale-95 transition-transform"
            >
              <i className="fas fa-users"></i>
              {friendRequests.length > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>

            {activeTab !== "global" && (
              <button
                onClick={() => setActiveTab("global")}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-2 md:py-1.5 bg-slate-800 rounded-lg border border-slate-700"
              >
                <i className="fas fa-arrow-left"></i>{" "}
                <span className="hidden md:inline">Back to Lounge</span>
              </button>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar chat-wallpaper"
        >
          {filteredMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-700">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <i className="far fa-comment-dots text-2xl"></i>
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-600">
                Conversation started
              </p>
            </div>
          )}
          {filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isBroadcast = msg.type === "broadcast";
            const isSystem = msg.type === "system";

            if (isSystem)
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <span className="bg-slate-800/80 backdrop-blur-sm text-slate-400 text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest font-black border border-slate-700/50 shadow-sm text-center">
                    {msg.content}
                  </span>
                </div>
              );

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2`}
              >
                <div
                  className={`flex items-end gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isMe && (
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-lg">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderName}`}
                        alt=""
                      />
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 md:px-4 md:py-2.5 rounded-2xl shadow-xl border ${isMe ? "bg-indigo-600 border-indigo-400 text-white rounded-br-none" : isBroadcast ? "bg-amber-500 border-amber-400 text-slate-900 font-bold rounded-bl-none" : "glass-panel text-slate-100 rounded-bl-none"}`}
                  >
                    {!isMe && (
                      <p
                        className={`text-[9px] md:text-[10px] font-black mb-1 uppercase tracking-tighter ${isBroadcast ? "text-amber-900" : "text-indigo-400"}`}
                      >
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tighter ${isMe ? "mr-1" : "ml-10 md:ml-12"}`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                  {isMe && (
                    <i className="fas fa-check-double ml-1 text-emerald-500"></i>
                  )}
                </span>
              </div>
            );
          })}
          {typingUser === activeTab && activeTab !== "global" && isOnline && (
            <div className="flex items-center gap-2 text-indigo-400 ml-12 animate-pulse">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              <span className="text-[10px] font-bold italic tracking-wider uppercase">
                typing...
              </span>
            </div>
          )}
        </div>

        <div className="p-3 md:p-4 bg-slate-900 border-t border-slate-800/80">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 md:gap-3"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                disabled={!isOnline}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={!isOnline ? "Wait..." : "Message..."}
                className={`w-full bg-slate-800 text-slate-200 pl-4 md:pl-5 pr-10 md:pr-12 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all text-sm shadow-inner ${!isOnline ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-600">
                <i
                  className={`fas ${isOnline ? "fa-keyboard" : "fa-wifi-slash text-rose-500"}`}
                ></i>
              </div>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || !isOnline}
              className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${input.trim() && isOnline ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 active:scale-95" : "bg-slate-800 text-slate-600 border border-slate-700"}`}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>

      {/* --- KANAN: SIDEBAR USER LIST (RESPONSIVE) --- */}
      {/* Di Mobile: Overlay Absolut. Di Desktop: Static Block */}
      <div
        className={`
        fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-sm transition-opacity lg:static lg:bg-transparent lg:w-72 lg:flex lg:flex-col lg:border-l lg:border-slate-800
        ${showMobileUsers ? "flex flex-col opacity-100" : "hidden opacity-0 lg:opacity-100 lg:flex"}
      `}
      >
        {/* Header Mobile Only */}
        <div className="lg:hidden p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900">
          <h3 className="font-bold text-white uppercase tracking-widest">
            User List
          </h3>
          <button
            onClick={() => setShowMobileUsers(false)}
            className="w-8 h-8 rounded-full bg-slate-800 text-rose-500 flex items-center justify-center"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar w-full max-w-sm lg:max-w-none ml-auto bg-slate-950 lg:bg-transparent h-full border-l border-slate-800 shadow-2xl lg:shadow-none">
          {friendRequests.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">
                New Invitations
              </h3>
              <div className="space-y-3">
                {friendRequests.map((fr) => {
                  const requester = users.find((u) => u.id === fr.senderId);
                  return (
                    <div
                      key={fr.id}
                      className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-500/20 group"
                    >
                      <p className="text-sm font-bold text-white mb-3 text-center tracking-tight">
                        {requester?.username}
                      </p>
                      <button
                        onClick={() => onFriendAction(fr.senderId, "accept")}
                        className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/10"
                      >
                        Accept Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
              Active Chats
            </h3>
            <div className="space-y-2">
              {users
                .filter((u) => friendsIds.includes(u.id))
                .map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${activeTab === user.id ? "bg-indigo-600/10 border-indigo-500/30 shadow-lg" : "hover:bg-slate-900 border-transparent"}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-slate-700">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                            alt=""
                          />
                        </div>
                        {user.status === "online" && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
                        )}
                      </div>
                      <div className="text-left overflow-hidden flex-1">
                        <div className="flex justify-between items-center">
                          <p
                            className={`text-sm font-bold truncate tracking-tight ${activeTab === user.id ? "text-indigo-400" : "text-slate-400"}`}
                          >
                            {user.username}
                          </p>
                          {unreadCounts[user.id] > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center animate-in zoom-in">
                              {unreadCounts[user.id]}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-tighter opacity-60 text-slate-500">
                          {user.status === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                    <SignalIndicator
                      active={user.status === "online" && isOnline}
                    />
                  </button>
                ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
              Nexus Community
            </h3>
            <div className="space-y-4">
              {users
                .filter(
                  (u) => u.id !== currentUser.id && !friendsIds.includes(u.id),
                )
                .map((user) => {
                  const isPendingFromMe = friendships.find(
                    (f) =>
                      f.senderId === currentUser.id &&
                      f.receiverId === user.id &&
                      f.status === "pending",
                  );

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between group px-2"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 overflow-hidden group-hover:border-indigo-500/50 transition-colors">
                            <img
                              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                              alt=""
                            />
                          </div>
                          <div
                            className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                              user.status === "online"
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-rose-500"
                            }`}
                          ></div>
                        </div>

                        <span className="text-sm font-medium text-slate-500 group-hover:text-slate-200 transition-colors truncate max-w-[80px]">
                          {user.username}
                        </span>
                      </div>

                      {!isPendingFromMe ? (
                        <button
                          onClick={() => onFriendAction(user.id, "add")}
                          className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest bg-indigo-500/5 px-2 py-1 rounded-md border border-indigo-500/10"
                        >
                          Add
                        </button>
                      ) : (
                        <span className="text-[8px] font-black text-amber-500 bg-amber-500/5 px-2 py-1 rounded uppercase tracking-tighter border border-amber-500/10">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
