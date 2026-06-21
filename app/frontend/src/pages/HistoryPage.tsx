import React, { useState, useEffect } from 'react';
import { 
  Clock, Search, ShieldAlert, Check, X, 
  Download, Filter, RefreshCw, AlertTriangle, MapPin
} from 'lucide-react';
import { API_BASE_URL } from '../config';
export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stationStats, setStationStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gateFilter, setGateFilter] = useState('ALL');
  const [alertFilter, setAlertFilter] = useState('ALL'); // ALL, ACTIVE, RESOLVED

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [histRes, alertRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/history`),
        fetch(`${API_BASE_URL}/api/alerts`),
        fetch(`${API_BASE_URL}/api/analytics`)
      ]);

      if (!histRes.ok || !alertRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to synchronize with operations database.');
      }

      const histData = await histRes.json();
      const alertData = await alertRes.json();
      const analyticsData = await analyticsRes.json();

      setHistory(histData);
      setAlerts(alertData);
      setStationStats(analyticsData.stations || []);
    } catch (err: any) {
      setError(err.message || 'Could not connect to the railway service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolveAlert = async (alertId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/resolve/${alertId}`, {
        method: 'POST'
      });
      if (response.ok) {
        // Optimistically update local alert state
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleDownloadQRPack = () => {
    // Downloads all ticket QR codes in a zip file served by Vite from frontend/public/qr_tickets/all_tickets.zip
    window.open(`${API_BASE_URL}/api/export`, '_blank');
  };

  const handleDownloadTestingFolder = () => {
    // Point directly to the Vite public zip asset
    const link = document.createElement('a');
    link.href = '/qr_tickets/all_tickets.zip';
    link.setAttribute('download', 'railway_qr_tickets.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter scan history
  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      item.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.route.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'ALL' || 
      item.status === statusFilter;
      
    const matchesGate = 
      gateFilter === 'ALL' || 
      item.gate_id === gateFilter;

    return matchesSearch && matchesStatus && matchesGate;
  });

  // Filter fraud alerts
  const filteredAlerts = alerts.filter(alert => {
    if (alertFilter === 'ACTIVE') return !alert.resolved;
    if (alertFilter === 'RESOLVED') return alert.resolved;
    return true;
  });

  // Unique gates in scan logs for filter dropdown
  const uniqueGates = Array.from(new Set(history.map(item => item.gate_id)));

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-24">
        <RefreshCw className="w-12 h-12 text-railway-teal animate-spin mb-4" />
        <p className="text-sm text-gray-400">Loading central database audit records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-24 px-4 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="font-display font-bold text-xl text-white mb-2">Audit Synchronization Failed</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6">{error}</p>
        <button 
          onClick={fetchData}
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-railway-indigo to-railway-blue text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto flex-1 w-full flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-railway-teal" />
            Central Validation Log
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time audit history, AI security alerts, and downloadable scanning assets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTestingFolder}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-railway-indigo to-railway-blue text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md shadow-railway-indigo/20"
          >
            <Download className="w-4 h-4" />
            Download QR Test Tickets
          </button>
          <button
            onClick={handleDownloadQRPack}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 text-gray-200 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-railway-teal" />
            Export CSV Log
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Station Risks and Fraud Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Station Heatmap & Alerts */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Alerts */}
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex flex-col max-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                AI Fraud Alerts Feed
              </h3>
              
              <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-[9px] font-semibold">
                {['ALL', 'ACTIVE', 'RESOLVED'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAlertFilter(filter)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      alertFilter === filter 
                        ? 'bg-gradient-to-r from-railway-indigo to-railway-blue text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {filteredAlerts.length === 0 ? (
                <div className="text-gray-500 italic text-center text-xs my-auto">
                  No alerts match selected status.
                </div>
              ) : (
                filteredAlerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 relative transition-all ${
                      alert.resolved 
                        ? 'bg-emerald-500/5 border-emerald-500/10 opacity-55' 
                        : 'bg-rose-500/5 border-rose-500/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white tracking-wide">{alert.ticket_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
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
                    <div className="flex items-center justify-between mt-1 text-[9px] text-gray-500">
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      {alert.resolved && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Resolved
                        </span>
                      )}
                    </div>

                    {!alert.resolved && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="absolute bottom-3.5 right-3.5 p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all shadow-sm"
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

          {/* Station Violation list */}
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex flex-col">
            <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <MapPin className="w-4 h-4 text-railway-saffron" />
              Station Congestion & Risk Multipliers
            </h3>
            
            <div className="flex flex-col gap-3">
              {stationStats.slice(0, 4).map((st: any, idx: number) => {
                const riskPercent = Math.min((st.risk_multiplier - 0.5) * 100, 100);
                return (
                  <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{st.station}</span>
                      <span className={`font-semibold ${st.risk_multiplier > 1.15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {st.violations} violations logged (x{st.risk_multiplier.toFixed(2)} Risk)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${st.risk_multiplier > 1.15 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${riskPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Scan Logs Table */}
        <div className="lg:col-span-7 glass-panel border-white/5 rounded-3xl p-6 flex flex-col h-[670px]">
          
          {/* Filtering Controls */}
          <div className="flex flex-col gap-4 border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-white">
                Historical Scan Database
              </h3>
              <span className="text-[10px] text-gray-500 font-mono uppercase">
                {filteredHistory.length} logs found
              </span>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search */}
              <div className="sm:col-span-6 relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search passenger, ticket, station..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-railway-teal rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Status */}
              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-railway-teal"
                >
                  <option value="ALL" className="bg-railway-navy">All Decisions</option>
                  <option value="APPROVED" className="bg-railway-navy">Approved</option>
                  <option value="DENIED" className="bg-railway-navy">Denied</option>
                </select>
              </div>

              {/* Gate */}
              <div className="sm:col-span-3">
                <select
                  value={gateFilter}
                  onChange={(e) => setGateFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-railway-teal"
                >
                  <option value="ALL" className="bg-railway-navy">All Gates</option>
                  {uniqueGates.map((gate: any, idx) => (
                    <option key={idx} value={gate} className="bg-railway-navy">{gate}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto rounded-2xl border border-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider sticky top-0 z-10">
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">Passenger</th>
                  <th className="p-3">Route / Gate</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                      No logs matching query criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((hist, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-all">
                      <td className="p-3 font-semibold text-railway-saffron">{hist.ticket_id}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{hist.passenger_name}</div>
                        {hist.failure_reason && (
                          <div className="text-[10px] text-rose-400 font-medium mt-0.5 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {hist.failure_reason}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-gray-300">{hist.route}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5 font-mono">{hist.gate_id}</div>
                      </td>
                      <td className="p-3 text-gray-400 font-mono">
                        {new Date(hist.scan_time).toLocaleTimeString()}
                        <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                          {new Date(hist.scan_time).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                          hist.status === 'APPROVED' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {hist.status === 'APPROVED' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                          {hist.status === 'APPROVED' ? 'PASS' : 'FAIL'}
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
