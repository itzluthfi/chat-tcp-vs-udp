
import React, { useState, useEffect } from 'react';
import { User, Message, MetricPoint, ViewType, LogEntry, Friendship } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Dashboard from './components/Dashboard';
import NetworkLab from './components/NetworkLab';
import KernelLogs from './components/KernelLogs';
import Login from './components/Login';

const API_URL = 'http://localhost:3000/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const addLog = (method: LogEntry['method'], path: string, status: number | string, message: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method,
      path,
      status,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  // Sync dengan Backend Asli
  useEffect(() => {
    const initApp = async () => {
      addLog('GET', '/api/init', '...', 'Connecting to Nexus Engine...');
      try {
        const res = await fetch(`${API_URL}/init`);
        const data = await res.json();
        
        setUsers(data.users || []);
        setMessages(data.messages || []);
        setFriendships(data.friendships || []);
        
        addLog('GET', '/api/init', 200, 'Database synced. Realtime link established.');
      } catch (err) {
        setIsOnline(false);
        addLog('AUTH', '/db/status', 'FAIL', 'Could not reach backend. Check if node server.js is running.');
      }
    };

    initApp();
  }, []);

  // Simulasi Metrik Dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newPoint: MetricPoint = {
        time: timeStr,
        latency: isOnline ? (15 + Math.random() * 20) : 999,
        throughput: isOnline ? (5 + Math.random() * 50) : 0,
        activeUsers: users.filter(u => u.status === 'online').length,
        wsOverhead: 2.4,
        tcpOverhead: 60,
      };
      setMetrics(prev => [...prev.slice(-19), newPoint]);
    }, 2000);
    return () => clearInterval(interval);
  }, [users, isOnline]);

  const handleSendMessage = async (content: string, receiverId?: string) => {
    if (!currentUser) return;

    const messageData = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      content,
      timestamp: Date.now(),
      type: (!receiverId && currentUser.role === 'admin') ? 'broadcast' : 'text',
    };

    try {
      addLog('POST', '/api/messages/send', '...', 'Saving to MySQL...');
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      const savedMsg = await res.json();
      setMessages(prev => [...prev, savedMsg]);
      addLog('POST', '/api/messages/send', 201, 'Broadcasted & Saved.');
    } catch (err) {
      addLog('POST', '/api/messages/send', 500, 'Failed to store message.');
    }
  };

  const handleFriendAction = async (targetUserId: string, action: 'add' | 'accept' | 'reject') => {
    if (!currentUser) return;

    try {
      addLog('POST', '/api/friendships/action', '...', `Executing ${action} in DB...`);
      await fetch(`${API_URL}/friendships/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser.id, receiverId: targetUserId, action })
      });

      // Optimistic Update / Re-fetch could go here
      if (action === 'add') {
        setFriendships(prev => [...prev, { id: 'temp', senderId: currentUser.id, receiverId: targetUserId, status: 'pending' }]);
      } else if (action === 'accept') {
        setFriendships(prev => prev.map(f => (f.senderId === targetUserId && f.receiverId === currentUser.id) ? { ...f, status: 'accepted' } : f));
      }
      
      addLog('POST', '/api/friendships/action', 200, 'Relation updated.');
    } catch (err) {
      addLog('POST', '/api/friendships/action', 500, 'DB write failed.');
    }
  };

  const handleLogin = async (credentials: any) => {
    try {
      addLog('POST', '/api/auth/login', '...', 'Verifying MySQL credentials...');
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
      });
      
      if (!res.ok) throw new Error('Unauthorized');
      
      const user = await res.json();
      setCurrentUser(user);
      addLog('POST', '/api/auth/login', 200, `Welcome back, ${user.username}`);
    } catch (err) {
      addLog('POST', '/api/auth/login', 401, 'Access Denied.');
      alert('Login failed. Please check your MySQL data.');
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} availableUsers={users} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-100">
      <Sidebar 
        activeView={view} 
        setView={setView} 
        onLogout={() => setCurrentUser(null)} 
        user={currentUser}
        isOnline={isOnline}
        pendingRequests={friendships.filter(f => f.receiverId === currentUser.id && f.status === 'pending').length}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 bg-rose-600 text-white text-[10px] font-black py-1 text-center z-[100] tracking-[0.3em] uppercase animate-pulse">
            Connection Lost: Database Sync Paused
          </div>
        )}

        {view === 'chat' && (
          <ChatWindow 
            messages={messages} 
            users={users} 
            friendships={friendships}
            typingUser={null}
            onSendMessage={handleSendMessage} 
            onFriendAction={handleFriendAction}
            currentUser={currentUser}
            isOnline={isOnline}
          />
        )}
        {currentUser.role === 'admin' && (
          <>
            {view === 'monitoring' && <Dashboard metrics={metrics} />}
            {view === 'lab' && <NetworkLab metrics={metrics} />}
            {view === 'logs' && <KernelLogs logs={logs} />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
