import React, { useState } from "react";
import { Room, User } from "../types";

interface RoomListProps {
  rooms: Room[];
  currentUser: User;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomId: string) => void;
}

const RoomList: React.FC<RoomListProps> = ({
  rooms,
  currentUser,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName);
      setNewRoomName("");
      setIsCreating(false);
    }
  };

  return (
    // pb-24: Memberi ruang di bawah agar tidak tertutup Bottom Nav di HP.
    <div className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Public Rooms
          </h2>
          <p className="text-slate-400 font-medium text-sm md:text-base">
            Hybrid TCP/UDP Channels
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className={`px-5 py-3 md:px-6 md:py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
            isCreating
              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
          }`}
        >
          <i className={`fas ${isCreating ? "fa-times" : "fa-plus"}`}></i>
          {isCreating ? "Cancel" : "Create Room"}
        </button>
      </div>

      {/* Form Create Room */}
      {isCreating && (
        <div className="mb-8 p-5 md:p-6 bg-slate-800/50 rounded-2xl border border-indigo-500/30 animate-in slide-in-from-top-4 backdrop-blur-sm">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
            <i className="fas fa-satellite-dish text-indigo-400"></i> Setup New
            Channel
          </h3>
          <form
            onSubmit={handleCreate}
            className="flex flex-col sm:flex-row gap-3 md:gap-4"
          >
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 transition-all text-sm md:text-base"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-sm md:text-base"
            >
              Launch
            </button>
          </form>
        </div>
      )}

      {/* Grid Daftar Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-16 md:py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-wind text-3xl md:text-4xl opacity-50"></i>
            </div>
            <p className="text-base md:text-lg font-medium">No active rooms.</p>
            <p className="text-xs md:text-sm">
              Create a channel to start streaming.
            </p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="bg-slate-800 border border-slate-700 p-5 md:p-6 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group relative overflow-hidden flex flex-col"
            >
              <div className="absolute -top-6 -right-6 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12">
                <i className="fas fa-users text-8xl md:text-9xl text-white"></i>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 md:p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <i className="fas fa-video text-lg md:text-xl"></i>
                  </div>
                  {room.is_active ? (
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] text-slate-400 uppercase">
                      Offline
                    </span>
                  )}
                </div>

                <h3
                  className="text-lg md:text-xl font-bold text-white mb-1 truncate"
                  title={room.name}
                >
                  {room.name}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-500 font-mono mb-6 truncate">
                  ID: {room.id}
                </p>
              </div>

              <button
                onClick={() => onJoinRoom(room.id)}
                className="w-full py-3 bg-slate-700 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-indigo-600/20 text-sm md:text-base active:scale-95"
              >
                Join Channel
                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoomList;
