import React from "react";
import { LogEntry } from "../types";

interface KernelLogsProps {
  logs: LogEntry[];
}

const KernelLogs: React.FC<KernelLogsProps> = ({ logs }) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-4 md:p-6 overflow-hidden">
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-terminal text-indigo-400"></i>
            Nexus Kernel
          </h2>
          <p className="text-slate-500 font-mono text-xs md:text-sm">
            express@4.18.2 engine active
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-slate-800 rounded border border-slate-700 text-[10px] font-bold text-slate-400 uppercase">
            PID: 12404
          </span>
          <span className="px-3 py-1 bg-slate-800 rounded border border-slate-700 text-[10px] font-bold text-emerald-500 uppercase">
            OK
          </span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
        <div className="space-y-1">
          {logs.length === 0 && (
            <div className="text-slate-600 animate-pulse">
              Waiting for system events...
            </div>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 hover:bg-slate-800/50 py-2 md:py-1 transition-colors group border-b border-slate-800/50 md:border-none"
            >
              <span className="text-slate-600 shrink-0 text-[10px] md:text-xs">
                [{log.timestamp}]
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 font-bold w-12 ${
                    log.method === "GET"
                      ? "text-emerald-400"
                      : log.method === "POST"
                        ? "text-indigo-400"
                        : log.method === "WS"
                          ? "text-amber-400"
                          : "text-rose-400"
                  }`}
                >
                  {log.method}
                </span>
                <span className="text-slate-300 w-24 truncate">{log.path}</span>
              </div>

              <span className="text-slate-500 group-hover:text-slate-300 transition-colors break-words">
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* UPDATE GRID RESPONSIVE DISINI */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
              Memory
            </p>
            <div className="text-xl font-bold text-white">124 MB</div>
          </div>
          <div className="text-[10px] text-emerald-500">+2%</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
              CPU Load
            </p>
            <div className="text-xl font-bold text-white">4.2%</div>
          </div>
          <div className="text-[10px] text-rose-500">+0.1%</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
              DB Conn
            </p>
            <div className="text-xl font-bold text-white">8 Active</div>
          </div>
          <div className="text-[10px] text-emerald-500">Stable</div>
        </div>
      </div>
    </div>
  );
};

export default KernelLogs;
