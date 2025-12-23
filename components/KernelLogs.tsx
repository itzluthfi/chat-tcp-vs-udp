
import React from 'react';
import { LogEntry } from '../types';

interface KernelLogsProps {
  logs: LogEntry[];
}

const KernelLogs: React.FC<KernelLogsProps> = ({ logs }) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-6 overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-terminal text-indigo-400"></i>
            Nexus Kernel console
          </h2>
          <p className="text-slate-500 font-mono text-sm">express@4.18.2 engine active / stream: socket.io</p>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-slate-800 rounded border border-slate-700 text-[10px] font-bold text-slate-400 uppercase">Process: 12404</span>
           <span className="px-3 py-1 bg-slate-800 rounded border border-slate-700 text-[10px] font-bold text-emerald-500 uppercase">Status: OK</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
        <div className="space-y-1">
          {logs.length === 0 && (
            <div className="text-slate-600 animate-pulse">Waiting for system events...</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 hover:bg-slate-800/50 py-1 transition-colors group">
              <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
              <span className={`shrink-0 font-bold w-12 ${
                // Added color mapping for PUT and DELETE to ensure visual consistency
                log.method === 'GET' ? 'text-emerald-400' :
                log.method === 'POST' ? 'text-indigo-400' :
                log.method === 'PUT' ? 'text-sky-400' :
                log.method === 'DELETE' ? 'text-rose-500' :
                log.method === 'WS' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {log.method}
              </span>
              <span className="text-slate-300 w-24 truncate">{log.path}</span>
              <span className={`shrink-0 font-bold ${
                typeof log.status === 'number' && log.status < 300 ? 'text-emerald-500' : 'text-indigo-400'
              }`}>
                {log.status}
              </span>
              <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
                {log.message}
              </span>
            </div>
          ))}
          <div className="pt-2 text-indigo-500/50 flex items-center gap-2">
             <span className="w-1.5 h-3 bg-indigo-500 animate-pulse"></span>
             <span>listening on port 3000...</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4">
         <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Memory Usage</p>
            <div className="flex items-center gap-3">
               <div className="text-xl font-bold text-white">124 MB</div>
               <div className="text-[10px] text-emerald-500">+2%</div>
            </div>
         </div>
         <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">CPU Load</p>
            <div className="flex items-center gap-3">
               <div className="text-xl font-bold text-white">4.2%</div>
               <div className="text-[10px] text-rose-500">+0.1%</div>
            </div>
         </div>
         <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">DB Connections</p>
            <div className="flex items-center gap-3">
               <div className="text-xl font-bold text-white">8 Active</div>
               <div className="text-[10px] text-emerald-500">Stable</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default KernelLogs;