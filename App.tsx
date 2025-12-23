
import React, { useState, useEffect } from 'react';
import { User, Message, MetricPoint, ViewType, LogEntry, Friendship } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Dashboard from './components/Dashboard';
import NetworkLab from './components/NetworkLab';
import KernelLogs from './components/KernelLogs';
import Login from './components/Login';

// Dalam produksi, data ini akan diambil dari MySQL via API
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Simulasi Fetch Data dari MySQL saat aplikasi dimuat
  useEffect(() => {
    const fetchDataFromMySQL = async () => {
      addLog('GET', '/api/init', 200, 'Fetching initial state from MySQL...');
      
      // Simulasi delay koneksi DB
      setTimeout(() => {
        // Data ini seharusnya datang dari: SELECT * FROM users
        setUsers([
          { id: '1', username: 'Admin_Nexus', email: 'admin@nexus.io', password: 'admin', role: 'admin', status: 'online', lastPing: Date.now() },
          { id: '2', username: 'Alex_Net', email: 'alex@nexus.io', password: 'user', role: 'user', status: 'online', lastPing: Date.now() },
          { id: '3', username: 'Sarah_K', email: 'sarah@nexus.io', password: 'user', role: 'user', status: 'online', lastPing: Date.now() },
          { id: '4', username: 'Jordan_D', email: 'jordan@nexus.io', password: 'user', role: 'user', status: 'offline', lastPing: Date.now() - 3600000 },
        ]);

        // Data dari: SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50
        setMessages([
          { id: 'm1', senderId: '1', senderName: 'System', content: 'Database MySQL Connected. All systems nominal.', timestamp: Date.now() - 10000, type: 'system', status: 'delivered' }
        ]);

        // Data dari: SELECT * FROM friendships WHERE status = 'accepted'
        setFriendships([
          { id: 'f1', senderId: '2', receiverId: '3', status: 'accepted' },
          { id: 'f2', senderId: '1', receiverId: '2', status: 'accepted' }
        ]);

        addLog('AUTH', '/db/status', 'OK', 'MySQL Connection Pool initialized.');
      }, 1000);
    };

    fetchDataFromMySQL();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('AUTH', '/network/status', 'UP', 'Reconnected to Gateway.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog('AUTH', '/network/status', 'DOWN', 'Local node disconnected.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newPoint: MetricPoint = {
        time: timeStr,
        latency: isOnline ? (15 + Math.random() * 40) : 999,
        throughput: isOnline ? (10 + Math.random() * 100) : 0,
        activeUsers: isOnline ? users.filter(u => u.status === 'online').length : 0,
        wsOverhead: 2 + Math.random() * 5,
        tcpOverhead: 60,
      };
      setMetrics(prev => [...prev.slice(-19), newPoint]);
    }, 2000);
    return () => clearInterval(interval);
  }, [users, isOnline]);

  const handleSendMessage = (content: string, receiverId?: string) => {
    if (!currentUser || !isOnline) return;
    
    // Logika MySQL: INSERT INTO messages (...)
    addLog('POST', '/api/messages/send', 201, `Storing message to MySQL...`);

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      content,
      timestamp: Date.now(),
      type: (!receiverId && currentUser.role === 'admin') ? 'broadcast' : 'text',
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);
    
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
      addLog('WS', '/chat/broadcast', 'OK', `Broadcasted message ID: ${newMessage.id}`);
    }, 400);
  };

  const handleFriendAction = (targetUserId: string, action: 'add' | 'accept' | 'reject') => {
    if (!currentUser || !isOnline) return;

    if (action === 'add') {
      addLog('POST', '/api/friendships/request', 201, `Inserting pending relation to MySQL`);
      setFriendships(prev => [...prev, {
        id: `f-${Date.now()}`,
        senderId: currentUser.id,
        receiverId: targetUserId,
        status: 'pending'
      }]);
    } else if (action === 'accept') {
      addLog('PUT', '/api/friendships/update', 200, `Updating relation status in MySQL`);
      setFriendships(prev => prev.map(f => 
        ((f.senderId === targetUserId && f.receiverId === currentUser.id)) 
        ? { ...f, status: 'accepted' } : f
      ));
    }
  };

  const handleLogin = (u: User) => {
    addLog('POST', '/api/auth/login', 200, `Authenticated via MySQL: ${u.email}`);
    setCurrentUser(u);
    if (u.role === 'user') setView('chat');
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
            typingUser={typingUser}
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
