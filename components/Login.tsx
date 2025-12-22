
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  availableUsers: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, availableUsers }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoPanel, setShowDemoPanel] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const user = availableUsers.find(u => u.email === email && u.password === password);
      
      if (user) {
        onLogin({ ...user, status: 'online' });
      } else {
        setError('Login failed. Please check your email or password.');
        setIsLoading(false);
      }
    }, 1000);
  };

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div className={`flex transition-all duration-500 ease-in-out ${showDemoPanel ? 'max-w-4xl' : 'max-w-md'} w-full`}>
        
        <div className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 z-10 transition-all duration-500 ${showDemoPanel ? 'rounded-r-none border-r-0' : ''}`}>
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/40 mb-6 group">
              <i className="fas fa-comment-alt text-white text-4xl group-hover:scale-110 transition-transform"></i>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Welcome to Nexus</h2>
            <p className="text-slate-500 mt-2 font-medium">Please sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@nexus.io"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your secure password"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                 <p className="text-xs font-bold text-rose-400 text-center">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95"
            >
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
              {isLoading ? 'Connecting...' : 'Sign In'}
            </button>
          </form>

          <button 
            onClick={() => setShowDemoPanel(!showDemoPanel)}
            className={`mt-8 w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${
              showDemoPanel 
              ? 'bg-slate-800 border-slate-700 text-indigo-400' 
              : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <i className={`fas ${showDemoPanel ? 'fa-chevron-left' : 'fa-bolt'}`}></i>
            {showDemoPanel ? 'Hide Demo Access' : 'Demo Accounts Quick Access'}
          </button>
        </div>

        <div className={`overflow-hidden transition-all duration-500 ease-in-out bg-slate-900/50 border border-slate-800 border-l-0 rounded-r-3xl backdrop-blur-sm ${
          showDemoPanel ? 'w-80 opacity-100 p-8' : 'w-0 opacity-0 p-0 pointer-events-none'
        }`}>
          <div className="w-64">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <i className="fas fa-key text-indigo-500 text-xs"></i>
              </div>
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Master Credentials</h3>
            </div>
            
            <div className="space-y-4">
              <div 
                onClick={() => fillCredentials('admin@nexus.io', 'admin')}
                className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-tighter">System Admin</span>
                  <i className="fas fa-shield-alt text-[10px] text-slate-600 group-hover:text-indigo-400"></i>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">admin@nexus.io / admin</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 mb-1">Available Profiles</p>
                {['alex', 'sarah', 'jordan', 'dika'].map(name => (
                  <div 
                    key={name} 
                    onClick={() => fillCredentials(`${name}@nexus.io`, 'user')}
                    className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-300 capitalize group-hover:text-white transition-colors">{name}</p>
                      <p className="text-[9px] text-slate-500 font-mono">pw: user</p>
                    </div>
                    <i className="fas fa-user text-[10px] text-slate-700 group-hover:text-indigo-500/50"></i>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
              <p className="text-[10px] text-slate-500 italic leading-relaxed text-center">
                Click any profile above to auto-inject credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
