
import React, { useState, useEffect } from 'react';
import { User, Message, MetricPoint, ViewType, LogEntry, Friendship } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Dashboard from './components/Dashboard';
import NetworkLab from './components/NetworkLab';
import KernelLogs from './components/KernelLogs';
import Login from './components/Login';

const INITIAL_USERS: User[] = [
  { id: '1', username: 'Admin_Nexus', email: 'admin@nexus.io', password: 'admin', role: 'admin', status: 'online', lastPing: Date.now() },
  { id: '2', username: 'Alex_Net', email: 'alex@nexus.io', password: 'user', role: 'user', status: 'online', lastPing: Date.now() },
  { id: '3', username: 'Sarah_K', email: 'sarah@nexus.io', password: 'user', role: 'user', status: 'online', lastPing: Date.now() },
  { id: '4', username: 'Jordan_D', email: 'jordan@nexus.io', password: 'user', role: 'user', status: 'offline', lastPing: Date.now() - 3600000 },
  { id: '5', username: 'Dika_Tech', email: 'dika@nexus.io', password: 'user', role: 'user', status: 'offline', lastPing: Date.now() - 7200000 },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', senderId: '1', senderName: 'System', content: 'Halo! Selamat datang di Nexus. Silakan mulai obrolan di Lounge atau cari teman baru di daftar sebelah kanan.', timestamp: Date.now() - 10000, type: 'system', status: 'delivered' }
  ]);
  const [friendships, setFriendships] = useState<Friendship[]>([
    { id: 'f-init-1', senderId: '2', receiverId: '3', status: 'accepted' }, 
    { id: 'f-init-2', senderId: '1', receiverId: '2', status: 'accepted' },
  ]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
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

  // Efek untuk mendeteksi koneksi internet asli
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('AUTH', '/network/status', 'UP', 'Internet connection restored.');
      if (currentUser) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: 'Koneksi internet Anda sudah kembali normal. Selamat mengobrol!',
          timestamp: Date.now(),
          type: 'system',
          status: 'delivered'
        }]);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog('AUTH', '/network/status', 'DOWN', 'Internet connection lost.');
      if (currentUser) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: 'Ups, koneksi terputus. Anda sedang berada dalam mode offline.',
          timestamp: Date.now(),
          type: 'system',
          status: 'delivered'
        }]);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

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
    
    const isBroadcast = !receiverId && currentUser.role === 'admin';
    const path = receiverId ? `/chat/private/${receiverId}` : '/chat/global';
    addLog('WS', path, 'SENT', `Message sent by ${currentUser.username}`);

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.username,
      receiverId,
      content,
      timestamp: Date.now(),
      type: isBroadcast ? 'broadcast' : 'text',
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);
    
    if (receiverId) {
      setTypingUser(receiverId);
      setTimeout(() => setTypingUser(null), 2000);
    }

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
    }, 400);
  };

  const handleFriendAction = (targetUserId: string, action: 'add' | 'accept' | 'reject') => {
    if (!currentUser || !isOnline) return;

    if (action === 'add') {
      const newFriendship: Friendship = {
        id: `f-${Date.now()}`,
        senderId: currentUser.id,
        receiverId: targetUserId,
        status: 'pending'
      };
      setFriendships(prev => [...prev, newFriendship]);
      addLog('WS', '/friends/request', 'PENDING', `Friend request sent to ${targetUserId}`);
    } else if (action === 'accept') {
      setFriendships(prev => prev.map(f => 
        ((f.senderId === targetUserId && f.receiverId === currentUser.id)) 
        ? { ...f, status: 'accepted' } : f
      ));
      addLog('WS', '/friends/accept', 'OK', `New friend added: ${targetUserId}`);
    }
  };

  const handleLogin = (u: User) => {
    addLog('AUTH', '/login', 200, `${u.username} signed in.`);
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
        onLogout={() => {
          addLog('AUTH', '/logout', 200, 'User logged out.');
          setCurrentUser(null);
        }} 
        user={currentUser}
        isOnline={isOnline}
        pendingRequests={friendships.filter(f => f.receiverId === currentUser.id && f.status === 'pending').length}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 bg-rose-600 text-white text-[10px] font-black py-1 text-center z-[100] tracking-[0.3em] uppercase animate-pulse">
            <i className="fas fa-exclamation-triangle mr-2"></i> Offline Mode: Connection Lost <i className="fas fa-exclamation-triangle ml-2"></i>
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
