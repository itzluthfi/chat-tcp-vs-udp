import React, { useState } from "react";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSwitchToLogin(); // Otomatis pindah ke login setelah 2 detik
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Create Account
          </h2>
          <p className="text-slate-500 mt-2">Join Nexus Network today</p>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center animate-in zoom-in">
            <i className="fas fa-check-circle text-4xl text-emerald-500 mb-3"></i>
            <h3 className="text-xl font-bold text-white">Success!</h3>
            <p className="text-slate-400 text-sm mt-2">
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
                placeholder="User_Nexus"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
                placeholder="you@example.com"
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
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-rose-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95"
            >
              {isLoading ? "Creating Account..." : "Register"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
              >
                Already have an account?{" "}
                <span className="text-indigo-400">Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
