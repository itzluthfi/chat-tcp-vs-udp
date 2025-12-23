import React, { useState } from "react";
import { User } from "../types";

interface LoginProps {
  onLogin: (user: User) => void;
  availableUsers: User[]; // Prop ini jadi tidak terpakai, tapi biarkan agar tidak error di App.tsx
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoPanel, setShowDemoPanel] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // HIT API LOGIN KE BACKEND
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login gagal.");
      }

      // SIMPAN JWT TOKEN (PENTING UNTUK SYARAT UTS)
      localStorage.setItem("nexus_token", data.token);

      // Masuk ke aplikasi dengan data user asli dari DB
      onLogin({ ...data.user, status: "online" });
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div
        className={`flex transition-all duration-500 ease-in-out ${
          showDemoPanel ? "max-w-4xl" : "max-w-md"
        } w-full`}
      >
        <div
          className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 z-10 transition-all duration-500 ${
            showDemoPanel ? "rounded-r-none border-r-0" : ""
          }`}
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/40 mb-6 group">
              <i className="fas fa-comment-alt text-white text-4xl group-hover:scale-110 transition-transform"></i>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Nexus Secure Login
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              Protected by JWT & SHA-256
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nexus.io"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                <p className="text-xs font-bold text-rose-400 text-center">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95"
            >
              {isLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-sign-in-alt"></i>
              )}
              {isLoading ? "Verifying..." : "Sign In"}
            </button>
          </form>

          <button
            onClick={() => setShowDemoPanel(!showDemoPanel)}
            className={`mt-8 w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${
              showDemoPanel
                ? "bg-slate-800 border-slate-700 text-indigo-400"
                : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
            }`}
          >
            <i
              className={`fas ${showDemoPanel ? "fa-chevron-left" : "fa-bolt"}`}
            ></i>
            {showDemoPanel ? "Hide Demo Access" : "Demo Accounts Quick Access"}
          </button>
        </div>

        {/* DEMO PANEL (Sama seperti sebelumnya, hanya UI helper) */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out bg-slate-900/50 border border-slate-800 border-l-0 rounded-r-3xl backdrop-blur-sm ${
            showDemoPanel
              ? "w-80 opacity-100 p-8"
              : "w-0 opacity-0 p-0 pointer-events-none"
          }`}
        >
          <div className="w-64">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <i className="fas fa-key text-indigo-500 text-xs"></i>
              </div>
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                Master Credentials
              </h3>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => fillCredentials("admin@nexus.io", "admin")}
                className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-tighter">
                    System Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  admin@nexus.io / admin
                </p>
              </div>
              <div
                onClick={() => fillCredentials("alex@nexus.io", "user")}
                className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all cursor-pointer group"
              >
                <p className="text-xs font-bold text-slate-300">Alex</p>
                <p className="text-[9px] text-slate-500 font-mono">
                  alex@nexus.io / user
                </p>
              </div>
              <div
                onClick={() => fillCredentials("sarah@nexus.io", "user")}
                className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all cursor-pointer group"
              >
                <p className="text-xs font-bold text-slate-300">Sarah</p>
                <p className="text-[9px] text-slate-500 font-mono">
                  sarah@nexus.io / user
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
