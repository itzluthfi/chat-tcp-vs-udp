
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MetricPoint } from '../types';

interface NetworkLabProps {
  metrics: MetricPoint[];
}

const NetworkLab: React.FC<NetworkLabProps> = ({ metrics }) => {
  const [protocol, setProtocol] = useState<'TCP' | 'UDP'>('TCP');

  const adjustedMetrics = metrics.map(m => {
    if (protocol === 'UDP') {
      return {
        ...m,
        latency: m.latency * 0.4,
        overhead: 8 + (Math.random() * 4), 
        loss: Math.random() > 0.85 ? 20 : 0
      };
    } else {
      return {
        ...m,
        latency: m.latency + 25,
        overhead: 60,
        loss: 0
      };
    }
  });

  const currentStatus = adjustedMetrics[adjustedMetrics.length - 1] || { latency: 0, overhead: 0, loss: 0 };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-8 space-y-8">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Experimental Network Lab</h2>
          <p className="text-slate-400 font-medium">Protocol Switching & Header Analysis</p>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-700 shadow-inner">
          <button 
            onClick={() => setProtocol('TCP')}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${protocol === 'TCP' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            TCP (Reliable)
          </button>
          <button 
            onClick={() => setProtocol('UDP')}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${protocol === 'UDP' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            UDP (Fast)
          </button>
        </div>
      </div>

      {/* Real-time Packet Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Latency</p>
              <p className={`text-3xl font-black ${protocol === 'UDP' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {currentStatus.latency.toFixed(1)}ms
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">{protocol === 'TCP' ? '3-Way Handshake active' : 'Direct datagram stream'}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Header Overhead</p>
              <p className="text-3xl font-black text-white">
                {currentStatus.overhead.toFixed(0)} <span className="text-sm font-medium text-slate-500">Bytes</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">{protocol === 'TCP' ? 'Large Control Headers' : 'Minimal Frame Headers'}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Data Integrity</p>
              <p className={`text-3xl font-black ${protocol === 'TCP' ? 'text-emerald-400' : 'text-rose-500'}`}>
                {protocol === 'TCP' ? '100%' : '94.2%'}
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">{protocol === 'TCP' ? 'Auto-Retransmit ON' : 'Best-Effort Delivery'}</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">Latency Stability Analysis</h3>
              <div className="flex gap-4">
                <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Response Time</span>
                {protocol === 'UDP' && <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Packet Loss</span>}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adjustedMetrics}>
                  <defs>
                    <linearGradient id="colorLatLab" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={protocol === 'TCP' ? '#818cf8' : '#10b981'} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={protocol === 'TCP' ? '#818cf8' : '#10b981'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="latency" stroke={protocol === 'TCP' ? '#818cf8' : '#10b981'} strokeWidth={3} fill="url(#colorLatLab)" isAnimationActive={false} />
                  {protocol === 'UDP' && <Area type="step" dataKey="loss" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} isAnimationActive={false} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expert Tip for Presentation */}
          <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
             <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/20">
                   <i className="fas fa-graduation-cap text-white text-xl"></i>
                </div>
                <div>
                   <h4 className="font-bold text-white mb-1">Presentation Tip: TCP vs UDP Realtime?</h4>
                   <p className="text-sm text-slate-400 leading-relaxed">
                     Jangan salah! <strong>Keduanya tetap realtime.</strong> Bedanya adalah TCP menjamin pesan chat 100% sampai (Reliable) meskipun sedikit lebih berat, sementara UDP mengejar kecepatan murni (Fast) tapi berisiko kehilangan data. Di aplikasi ini, kita menggunakan WebSocket (TCP) untuk chat agar pesan Anda tidak pernah hilang di tengah jalan.
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Live Packet Breakdown */}
        <div className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
             <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Packet Inspector</h3>
          </div>
          <div className="p-6 font-mono text-[11px] flex-1 space-y-4 overflow-y-auto">
             <div className="space-y-1">
               <p className="text-indigo-400 font-bold tracking-tight"># PACKET HEADER BREAKDOWN</p>
               <p className="text-slate-500">Source: 192.168.1.104</p>
               <p className="text-slate-500">Destination: 0.0.0.0 (Global)</p>
             </div>

             <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Protocol</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${protocol === 'TCP' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>{protocol}</span>
                </div>
                
                {protocol === 'TCP' ? (
                  <>
                    <div className="flex justify-between text-slate-300"><span>Sequence Num</span><span className="text-emerald-500">0xAF321</span></div>
                    <div className="flex justify-between text-slate-300"><span>Ack Number</span><span className="text-emerald-500">0xAF322</span></div>
                    <div className="flex justify-between text-slate-300"><span>Window Size</span><span>64240</span></div>
                    <div className="flex justify-between text-slate-300"><span>Flags</span><span className="text-indigo-400">[ACK, PSH]</span></div>
                    <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-2">
                      <span>Total Overhead</span>
                      <span className="text-rose-400">60 Bytes</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-300"><span>Checksum</span><span className="text-emerald-500">0x42E1</span></div>
                    <div className="flex justify-between text-slate-300"><span>Length</span><span>1420</span></div>
                    <div className="flex justify-between text-slate-300 italic opacity-50"><span>No Sequence Control</span></div>
                    <div className="flex justify-between text-slate-300 italic opacity-50"><span>No Ack Handling</span></div>
                    <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-2">
                      <span>Total Overhead</span>
                      <span className="text-emerald-400">8 Bytes</span>
                    </div>
                  </>
                )}
             </div>

             <div className="pt-4 mt-4 border-t border-slate-800">
                <p className="text-slate-500 uppercase text-[9px] mb-2 font-black">Raw Payload Preview</p>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-600 break-all leading-tight">
                   {protocol === 'TCP' 
                    ? '47 45 54 20 2f 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 6c 6f 63 61 6c 68 6f 73 74' 
                    : 'ff ff ff ff 54 53 6f 75 72 63 65 20 45 6e 67 69 6e 65 20 51 75 65 72 79 00'}
                </div>
             </div>
          </div>
          <div className="p-4 bg-indigo-600">
             <p className="text-[10px] font-black text-white text-center uppercase tracking-widest animate-pulse">
                {protocol === 'TCP' ? 'Reliability Engine Engaged' : 'Direct Datagram Stream Active'}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkLab;
