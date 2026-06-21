import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, BadgeIndianRupee, Percent, 
  ShieldCheck, RefreshCw, AlertCircle, FileSpreadsheet, MapPin
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics`);
      if (!response.ok) {
        throw new Error('Failed to load analytics details');
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-24">
        <RefreshCw className="w-12 h-12 text-railway-teal animate-spin mb-4" />
        <p className="text-sm text-gray-400">Compiling multi-agent operations metrics...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-24 px-4 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="font-display font-bold text-xl text-white mb-2">Failed to Sync Analytics</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6">{error || 'Connection to operations service failed. The backend service may be cold-starting (Render free tier spin-up can take up to 1 minute) or is currently offline.'}</p>
        <button 
          onClick={fetchAnalytics}
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-railway-indigo to-railway-blue text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  const { stats, stations, daily_validations } = analyticsData;

  // Pie chart coloring
  const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f97316', '#a855f7'];

  return (
    <div className="pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto flex-1 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-railway-teal" />
            AI Operations Center
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time analytics and enforcement insights processed by the multi-agent system.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="self-start px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Total Decisions */}
        <div className="glass-panel border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-railway-blue/20 to-transparent rounded-tr-2xl rounded-bl-[50px] opacity-30"></div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Scans Audited</span>
          <div className="font-display font-black text-2xl md:text-3xl text-white mt-2">
            {stats.total_scans}
          </div>
          <p className="text-[10px] text-emerald-400 font-semibold mt-1">
            {stats.valid_scans} approved entries
          </p>
        </div>

        {/* Fraud Attempts Prevented */}
        <div className="glass-panel border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-rose-500/20 to-transparent rounded-tr-2xl rounded-bl-[50px] opacity-30"></div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fraud Alerts</span>
          <div className="font-display font-black text-2xl md:text-3xl text-rose-400 mt-2">
            {stats.fraud_attempts}
          </div>
          <p className="text-[10px] text-rose-500 font-semibold mt-1">
            {stats.invalid_scans} unauthorized entries
          </p>
        </div>

        {/* Revenue Saved */}
        <div className="glass-panel border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-tr-2xl rounded-bl-[50px] opacity-30"></div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Revenue Protected</span>
          <div className="font-display font-black text-2xl md:text-3xl text-emerald-400 mt-2">
            ₹{stats.revenue_saved.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Fares of approved passengers
          </p>
        </div>

        {/* Leakage Prevented */}
        <div className="glass-panel border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-railway-saffron/20 to-transparent rounded-tr-2xl rounded-bl-[50px] opacity-30"></div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Leakage Prevented</span>
          <div className="font-display font-black text-2xl md:text-3xl text-railway-saffron mt-2">
            ₹{(stats.revenue_leakage_prevented || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Fines & fare leaks blocked
          </p>
        </div>
      </div>

      {/* Chart Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Line Chart: Daily Validations */}
        <div className="lg:col-span-8 glass-panel border-white/5 rounded-3xl p-6 min-h-[350px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-white">Daily Passenger Scans</h3>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Real-time Trend</span>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_validations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInvalid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" name="Approved Scan" dataKey="valid" stroke="#10b981" fillOpacity={1} fill="url(#colorValid)" />
                <Area type="monotone" name="Blocked Scan" dataKey="invalid" stroke="#f43f5e" fillOpacity={1} fill="url(#colorInvalid)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Violation Distribution */}
        <div className="lg:col-span-4 glass-panel border-white/5 rounded-3xl p-6 min-h-[350px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-white">Violations Distribution</h3>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Classification</span>
          </div>
          <div className="flex-1 w-full flex items-center justify-center min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.violation_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(analyticsData.violation_distribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', color: '#fff' }} />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '9px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Station Congestion Heatmap & Agent Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Station Violations Risk Metrics */}
        <div className="lg:col-span-6 glass-panel border-white/5 rounded-3xl p-6">
          <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-railway-saffron" />
            Station Violation Congestion Risks
          </h3>
          <div className="flex flex-col gap-3">
            {stations.map((st: any, idx: number) => {
              const riskPercent = Math.min((st.risk_multiplier - 0.5) * 100, 100);
              return (
                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{st.station}</span>
                    <span className={`font-semibold ${st.risk_multiplier > 1.15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {st.violations} violations logged (x{st.risk_multiplier} Risk)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
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

        {/* AI Agent Enforcement Recommendations */}
        <div className="lg:col-span-6 glass-panel border-white/5 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-railway-teal animate-pulse" />
              AI Enforcement Action Plan
            </h3>
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-white/5 border-l-4 border-rose-500 rounded-r-xl">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block">Critical High-Risk Action</span>
                <span className="text-xs font-semibold text-white block mt-1">Vijayawada Platform 3 Gates</span>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  The Enforcement Recommendation Agent suggests deploying 2 additional ticket inspectors due to high congestion and elevated duplicate ticket scans.
                </p>
              </div>

              <div className="p-4 bg-white/5 border-l-4 border-railway-saffron rounded-r-xl">
                <span className="text-[10px] font-bold text-railway-saffron uppercase tracking-widest block">Proactive Prevention Check</span>
                <span className="text-xs font-semibold text-white block mt-1">New Delhi Platform 1 Gate C</span>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  The Crowd Intelligence Agent predicts an 18% increase in ticketless travel risk on Delhi incoming trains during the evening peak rush hour.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 italic mt-6 border-t border-white/5 pt-4 text-center">
            Enforcement action plans are recalculated in real time by the Coordinator Agent.
          </div>
        </div>
      </div>
    </div>
  );
}
