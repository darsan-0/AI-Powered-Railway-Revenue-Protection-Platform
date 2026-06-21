import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, RefreshCw, Trash2, Download, Search, Check, 
  X, LogIn, Lock, Users, Clock, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { API_BASE_URL } from '../config';
interface AdminPageProps {
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (val: boolean) => void;
  adminUser: any;
  setAdminUser: (user: any) => void;
}

export default function AdminPage({ isAdminLoggedIn, setIsAdminLoggedIn, adminUser, setAdminUser }: AdminPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin dashboard states
  const [passengers, setPassengers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchAdminData = async () => {
    if (!isAdminLoggedIn) return;
    setIsLoadingData(true);
    try {
      const [passRes, histRes, alertRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/passengers`),
        fetch(`${API_BASE_URL}/api/history`),
        fetch(`${API_BASE_URL}/api/alerts`)
      ]);

      if (passRes.ok && histRes.ok && alertRes.ok) {
        const passData = await passRes.json();
        const histData = await histRes.json();
        const alertData = await alertRes.json();
        setPassengers(passData);
        setHistory(histData);
        setAlerts(alertData);
      }
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [isAdminLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      setIsAdminLoggedIn(true);
      setAdminUser(data.user);
      localStorage.setItem('railway_admin_token', data.token);
    } catch (err: any) {
      setLoginError(err.message === 'Failed to fetch' 
        ? 'Connection to auth service failed. The backend service may be cold-starting (Render free tier spin-up can take up to 1 minute). Please wait and try again.'
        : (err.message || 'Invalid credentials'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/resolve/${alertId}`, {
        method: 'POST'
      });
      if (response.ok) {
        // Optimistically update
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to reset all passenger records, scan history, and fraud alerts to their default state?")) {
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' });
      if (response.ok) {
        alert("Database re-seeded successfully!");
        fetchAdminData();
      }
    } catch (err) {
      console.error("Error resetting database:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`${API_BASE_URL}/api/export`, '_blank');
  };

  // Filter passengers by search term
  const filteredPassengers = passengers.filter(p => 
    p.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.train_number.includes(searchQuery)
  );

  // Login view if not logged in
  if (!isAdminLoggedIn) {
    return (
      <div className="pt-24 pb-16 px-4 flex-1 flex items-center justify-center">
        <div className="glass-panel border-white/5 rounded-3xl p-8 w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-railway-saffron/20 to-transparent rounded-tr-3xl rounded-bl-[100px] opacity-10"></div>
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-railway-saffron" />
            </div>
            <h1 className="font-display font-bold text-xl text-white">Admin Authentication</h1>
            <p className="text-xs text-gray-400 mt-1">Chief Inspector & Auditor Portal</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Email Address</label>
              <input
                type="email"
                required
                placeholder="admin@railway.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-railway-saffron transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-railway-saffron transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-2 w-full py-2.5 bg-gradient-to-r from-railway-saffron to-orange-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </button>
          </form>

          <div className="text-[10px] text-gray-500 text-center mt-6">
            Default credentials: <span className="text-gray-400 font-bold">admin@railway.com</span> / <span className="text-gray-400 font-bold">password123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto flex-1 w-full flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-railway-saffron" />
            Admin Operations Panel
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Auditing credentials: {adminUser?.name} ({adminUser?.role})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-railway-teal" />
            Export CSV
          </button>
          <button
            onClick={handleResetDatabase}
            disabled={isResetting}
            className="px-4 py-2 rounded-xl border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/10 text-rose-400 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isResetting ? 'Resetting...' : 'Reset DB'}
          </button>
        </div>
      </div>

      {/* Main Admin Contents Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Live Alerts & System Logs */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Fraud Alerts Feed */}
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex-1 flex flex-col max-h-[350px]">
            <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              Active AI Fraud Alerts
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {alerts.length === 0 ? (
                <div className="text-gray-500 italic text-center text-xs my-auto">
                  No active fraud alerts detected in database.
                </div>
              ) : (
                alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border text-xs flex flex-col gap-2 relative ${
                      alert.resolved 
                        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' 
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{alert.ticket_id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        alert.risk_level === 'Critical' 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : alert.risk_level === 'High' 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-yellow-500 text-black'
                      }`}>
                        {alert.risk_level} ({alert.risk_score})
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed pr-8">{alert.explanation}</p>
                    <span className="text-[9px] text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>

                    {!alert.resolved && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="absolute bottom-3 right-3 p-1 rounded bg-white/5 border border-white/10 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Mark as Resolved"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Validation Logs history */}
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex-1 flex flex-col max-h-[350px]">
            <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Live Validation Scan History
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
              {history.length === 0 ? (
                <div className="text-gray-500 italic text-center text-xs my-auto">
                  No scan logs present in SQLite.
                </div>
              ) : (
                history.map((hist, idx) => (
                  <div key={idx} className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-[11px] flex items-center justify-between gap-3">
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{hist.ticket_id}</span>
                        <span className="text-[10px] text-gray-400">({hist.passenger_name})</span>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5 truncate">
                        {hist.route} | {hist.gate_id} | {new Date(hist.scan_time).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] flex-shrink-0 flex items-center gap-0.5 ${
                      hist.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {hist.status === 'APPROVED' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                      {hist.status === 'APPROVED' ? 'PASS' : 'FAIL'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Passengers Datatable */}
        <div className="lg:col-span-7 glass-panel border-white/5 rounded-3xl p-6 flex flex-col h-[724px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-railway-teal" />
              Railway Passenger Registry
            </h3>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, ticket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-railway-teal"
              />
            </div>
          </div>

          {/* Passenger Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">Passenger</th>
                  <th className="p-3">Route / Train</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPassengers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                      No passengers found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredPassengers.map((pass, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-semibold text-railway-saffron">{pass.ticket_id}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{pass.passenger_name}</div>
                        <div className="text-[10px] text-gray-400">Age: {pass.age} | {pass.ticket_type}</div>
                      </td>
                      <td className="p-3">
                        <div>{pass.source_station} ➔ {pass.destination_station}</div>
                        <div className="text-[10px] text-gray-400">Train: {pass.train_number}</div>
                      </td>
                      <td className="p-3 text-gray-300 font-mono">{pass.journey_date}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pass.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {pass.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
