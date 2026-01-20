import React, { useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { MetricPoint } from "../types";

interface NetworkLabProps {
  metrics: MetricPoint[];
}

const NetworkLab: React.FC<NetworkLabProps> = ({ metrics }) => {
  const [protocol, setProtocol] = useState<"TCP" | "UDP">("UDP");

  const adjustedMetrics = metrics.map((m) => {
    const rawLatency = m.latency ?? 0;
    const rawLoss = m.loss ?? 0;

    if (protocol === "UDP") {
      return {
        ...m,
        latency: rawLatency,
        overhead: 9,
        loss: rawLoss,
      };
    } else {
      return {
        ...m,
        latency: rawLatency > 0 ? rawLatency + 40 : 10,
        overhead: 60,
        loss: 0,
      };
    }
  });

  // Ambil data terakhir, atau gunakan object default AMAN jika array kosong
  const currentStatus = adjustedMetrics[adjustedMetrics.length - 1] ?? {
    latency: 0,
    overhead: 0,
    loss: 0,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-8 space-y-8">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Network Protocol Testing
          </h2>
          <p className="text-slate-400 font-medium">
            Simulation & Header Analysis
          </p>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-700 shadow-inner">
          <button
            onClick={() => setProtocol("TCP")}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
              protocol === "TCP"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            TCP (Chat)
          </button>
          <button
            onClick={() => setProtocol("UDP")}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
              protocol === "UDP"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            UDP (streaming)
          </button>
        </div>
      </div>

      {/* Real-time Packet Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1: LATENCY */}
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Live Latency
              </p>
              <p
                className={`text-3xl font-black ${
                  protocol === "UDP" ? "text-emerald-400" : "text-indigo-400"
                }`}
              >
                {/* SAFEGUARD: Tambahkan || 0 di sini juga untuk keamanan ganda */}
                {(currentStatus.latency || 0).toFixed(1)}ms
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {protocol === "TCP"
                  ? "3-Way Handshake active"
                  : "Direct datagram stream"}
              </p>
            </div>

            {/* CARD 2: OVERHEAD */}
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Header Overhead
              </p>
              <p className="text-3xl font-black text-white">
                {(currentStatus.overhead || 0).toFixed(0)}{" "}
                <span className="text-sm font-medium text-slate-500">
                  Bytes
                </span>
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {protocol === "TCP"
                  ? "Large Control Headers"
                  : "Minimal Frame Headers"}
              </p>
            </div>

            {/* CARD 3: INTEGRITY */}
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Data Integrity
              </p>
              <p
                className={`text-3xl font-black ${
                  protocol === "TCP" ? "text-emerald-400" : "text-rose-500"
                }`}
              >
                {protocol === "TCP" ? "100%" : "94.2%"}
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {protocol === "TCP"
                  ? "Auto-Retransmit ON"
                  : "Best-Effort Delivery"}
              </p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">
                Latency Stability Analysis
              </h3>
              <div className="flex gap-4">
                <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>{" "}
                  Response Time
                </span>
                {protocol === "UDP" && (
                  <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>{" "}
                    Packet Loss
                  </span>
                )}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adjustedMetrics}>
                  <defs>
                    <linearGradient
                      id="colorLatLab"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={protocol === "TCP" ? "#818cf8" : "#10b981"}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={protocol === "TCP" ? "#818cf8" : "#10b981"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke={protocol === "TCP" ? "#818cf8" : "#10b981"}
                    strokeWidth={3}
                    fill="url(#colorLatLab)"
                    isAnimationActive={false}
                  />
                  {protocol === "UDP" && (
                    <Area
                      type="step"
                      dataKey="loss"
                      stroke="#f43f5e"
                      fill="#f43f5e"
                      fillOpacity={0.2}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">
                Speed Comparison (Delta)
              </h3>
              <div className="flex gap-2">
                {(() => {
                  let tcpLat, udpLat;

                  if (protocol === "TCP") {
                    tcpLat = currentStatus.latency;
                    udpLat = Math.max(5, tcpLat - 40);
                  } else {
                    udpLat = currentStatus.latency;
                    tcpLat = udpLat + 40;
                  }

                  const rawDiff = tcpLat - udpLat;
                  const isUdpView = protocol === "UDP";
                  const label = isUdpView ? "UDP Faster By" : "TCP Slower By";
                  const diffDisplay = isUdpView
                    ? `-${rawDiff.toFixed(1)}`
                    : `+${rawDiff.toFixed(1)}`;
                  const colorClass = isUdpView
                    ? "text-emerald-400"
                    : "text-rose-400";

                  // Speedup factor selalu sama (ratio), tapi label performance boost beda
                  const ratio = (tcpLat / (udpLat || 1)).toFixed(1);
                  const performanceLabel = isUdpView
                    ? "Performance Boost"
                    : "Latency Penalty";
                  const performanceValue = isUdpView
                    ? `${ratio}x Faster`
                    : `${ratio}x Slower`;

                  return (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-bold text-left">
                            {label}
                          </p>
                          <p className={`text-4xl font-black ${colorClass}`}>
                            {diffDisplay} ms
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-[10px] uppercase font-bold">
                            {performanceLabel}
                          </p>
                          <p className="text-xl font-bold text-white">
                            {performanceValue}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic text-left">
                        *Calculated based on current active metric.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Live Packet Breakdown */}
        <div className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
              Live Packet
            </h3>
          </div>
          <div className="p-6 font-mono text-[11px] flex-1 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <p className="text-indigo-400 font-bold tracking-tight">
                # PACKET HEADER BREAKDOWN
              </p>
              <p className="text-slate-500">
                Source: 192.168.1.
                {metrics.length > 0
                  ? metrics[0].throughput.toString().slice(-2)
                  : "10"}
              </p>
              <p className="text-slate-500">
                Destination: 104.21.55.2 (Server)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">Protocol</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    protocol === "TCP"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {protocol}
                </span>
              </div>

              {protocol === "TCP" ? (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Sequence Num</span>
                    <span className="text-emerald-500">0xAF321</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Ack Number</span>
                    <span className="text-emerald-500">0xAF322</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Window Size</span>
                    <span>64240</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Flags</span>
                    <span className="text-indigo-400">[ACK, PSH]</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-2">
                    <span>Total Overhead</span>
                    <span className="text-rose-400">60 Bytes</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Checksum</span>
                    <span className="text-emerald-500">0x42E1</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Length</span>
                    <span>1420</span>
                  </div>
                  <div className="flex justify-between text-slate-300 italic opacity-50">
                    <span>No Sequence Control</span>
                  </div>
                  <div className="flex justify-between text-slate-300 italic opacity-50">
                    <span>No Ack Handling</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-2">
                    <span>Total Overhead</span>
                    <span className="text-emerald-400">8 Bytes</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="text-slate-500 uppercase text-[9px] mb-2 font-black">
                Raw Payload Preview
              </p>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-600 break-all leading-tight">
                {protocol === "TCP"
                  ? "47 45 54 20 2f 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 6c 6f 63 61 6c 68 6f 73 74"
                  : "ff ff ff ff 54 53 6f 75 72 63 65 20 45 6e 67 69 6e 65 20 51 75 65 72 79 00"}
              </div>
            </div>
          </div>
          <div className="p-4 bg-indigo-600">
            <p className="text-[10px] font-black text-white text-center uppercase tracking-widest animate-pulse">
              {protocol === "TCP"
                ? "Reliability Engine Engaged"
                : "Direct Datagram Stream Active"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkLab;
