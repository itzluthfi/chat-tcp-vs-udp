import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import { MetricPoint } from "../types";

interface DashboardProps {
  metrics: MetricPoint[];
}

const Dashboard: React.FC<DashboardProps> = ({ metrics }) => {
  const currentMetric = metrics[metrics.length - 1] || {
    latency: 0,
    throughput: 0,
    activeUsers: 0,
    tcpOverhead: 60,
    wsOverhead: 4,
  };

  // Comparative data for the bar chart
  const protocolComparison = [
    {
      name: "TCP Header",
      value: currentMetric.tcpOverhead,
      color: "#818cf8",
      desc: "Reliable Connection",
    },
    {
      name: "UDP Header",
      value: currentMetric.wsOverhead,
      color: "#f59e0b",
      desc: "Fast Streaming",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            System Performance
          </h2>
          <p className="text-slate-400 font-medium">
            Real-time metrics from Central Cluster #01-SEA
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
              Core Engine Active
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Network Latency",
            value: `${currentMetric.latency.toFixed(1)}ms`,
            icon: "fa-bolt",
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
          },
          {
            label: "Active Sessions",
            value: currentMetric.activeUsers,
            icon: "fa-users",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            label: "Data Throughput",
            value: `${currentMetric.throughput.toFixed(1)} req/s`,
            icon: "fa-tachometer-alt",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Packet Integrity",
            value: "99.98%",
            icon: "fa-shield-halved",
            color: "text-rose-400",
            bg: "bg-rose-500/10",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl hover:border-slate-600 transition-colors"
          >
            <div
              className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center mb-4`}
            >
              <i className={`fas ${stat.icon} text-xl`}></i>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-white tracking-tighter">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latency History (Wide) */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Live Latency (RTT)</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>{" "}
                Current Load
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#818cf8"
                  fillOpacity={1}
                  fill="url(#colorLatency)"
                  strokeWidth={3}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol Efficiency Comparison (NEW) */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Protocol Overhead</h3>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded">
              Bytes
            </span>
          </div>

          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={protocolComparison}
                layout="vertical"
                margin={{ left: 0, right: 30, top: 20, bottom: 20 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={80}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                  {protocolComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                Efficiency Gap
              </span>
              <span className="text-xs font-bold text-emerald-400">
                ~15x Savings
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              UDP (Websocket Stream) significantly reduces headers compared to
              full TCP handshakes for every packet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Throughput Bar Chart */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Message Throughput</h3>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">
                Requests / Sec
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                  cursor={{ fill: "#334155", opacity: 0.4 }}
                />
                <Bar
                  dataKey="throughput"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Connection Health */}
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl flex flex-col justify-center items-center text-center">
          <div className="relative mb-6">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-700"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="364"
                strokeDashoffset="36"
                className="text-indigo-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">94%</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Stability
              </span>
            </div>
          </div>
          <h4 className="text-xl font-bold text-white mb-2">
            Network Health Optimal
          </h4>
          <p className="text-sm text-slate-400 max-w-xs mb-6 font-medium">
            System is operating within target parameters. All nodes are
            reporting nominal status.
          </p>
          <div className="flex gap-2">
            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              Uptime: 99.9%
            </span>
            <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
              SSL: Valid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
