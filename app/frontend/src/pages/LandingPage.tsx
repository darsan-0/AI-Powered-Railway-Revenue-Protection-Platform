import React from 'react';
import { 
  ShieldCheck, ShieldAlert, BarChart3, Users, Send, 
  ArrowRight, Activity, TrainFront, Server, Database, CheckCircle, XCircle 
} from 'lucide-react';

interface LandingPageProps {
  setActiveTab: (tab: string) => void;
}

export default function LandingPage({ setActiveTab }: LandingPageProps) {
  const agents = [
    {
      name: "Ticket Verification Agent",
      description: "Uses database endpoints to cross-reference ticket IDs, check travel date constraints, verify station paths, and validate passenger details.",
      status: "Active",
      icon: ShieldCheck,
      color: "from-teal-500/20 to-teal-400/5",
      borderColor: "border-teal-500/30",
      textColor: "text-teal-400"
    },
    {
      name: "Fraud Detection Agent",
      description: "Identifies anomalies in transaction history. Analyzes duplicate scans (pass sharing) within 30-minute windows, expired usage, and refund tampering.",
      status: "Active",
      icon: ShieldAlert,
      color: "from-rose-500/20 to-rose-400/5",
      borderColor: "border-rose-500/30",
      textColor: "text-rose-400"
    },
    {
      name: "Revenue Analytics Agent",
      description: "Computes direct protection counts. Logs ticket values, calculates estimated revenue saved from blocked violations, and audits fare statistics.",
      status: "Active",
      icon: BarChart3,
      color: "from-blue-500/20 to-blue-400/5",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400"
    },
    {
      name: "Crowd Intelligence Agent",
      description: "Simulates station boarding counts. Computes passenger density risk factors to predict congestion-related violation rates.",
      status: "Simulated",
      icon: Users,
      color: "from-saffron/20 to-saffron/5",
      borderColor: "border-saffron/30",
      textColor: "text-saffron"
    },
    {
      name: "Enforcement Agent",
      description: "Prescribes ticket examiner (TTE) deployments. Prioritizes gates and platforms experiencing elevated fraud attempts or high crowds.",
      status: "Active",
      icon: Send,
      color: "from-indigo-500/20 to-indigo-400/5",
      borderColor: "border-indigo-500/30",
      textColor: "text-indigo-400"
    }
  ];

  return (
    <div className="pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto flex-1 flex flex-col justify-center">
      {/* Hero Section */}
      <div className="text-center mb-16 relative">
        {/* Glow behind */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-railway-indigo/10 blur-[100px] pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-xs text-railway-saffron tracking-wider font-semibold uppercase mb-6 animate-pulse-slow">
          <TrainFront className="w-4 h-4" /> Indian Railways Smart Shield
        </div>

        <h1 className="font-display font-extrabold text-4xl md:text-6xl text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          AI-Powered Railway <br />
          <span className="bg-gradient-to-r from-railway-saffron via-white to-railway-teal bg-clip-text text-transparent">
            Revenue Protection Platform
          </span>
        </h1>

        <p className="font-sans text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
          A Multi-Agent Intelligence System for Ticket Validation, Fraud Detection, Revenue Analytics, and Smart Railway Enforcement.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setActiveTab('scanner')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-semibold text-sm bg-gradient-to-r from-railway-indigo to-railway-blue text-white shadow-lg shadow-railway-indigo/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            Launch Entry Validator
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-semibold text-sm border border-white/10 hover:bg-white/5 text-white transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Activity className="w-4 h-4 text-railway-teal" />
            Operations Dashboard
          </button>
        </div>
      </div>

      {/* Agents Section */}
      <div className="mb-20">
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white">
            Autonomous Inspection Agents
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Five specialized sub-agents coordinate to evaluate passenger scan requests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, idx) => {
            const Icon = agent.icon;
            return (
              <div 
                key={idx}
                className={`glass-panel p-6 rounded-2xl border ${agent.borderColor} relative group hover:scale-[1.01] transition-transform duration-300`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${agent.color} rounded-tr-2xl rounded-bl-[100px] pointer-events-none opacity-20`}></div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${agent.textColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-white/5 font-semibold tracking-wider uppercase ${
                    agent.status === "Active" 
                      ? 'border-emerald-500/30 text-emerald-400' 
                      : 'border-yellow-500/30 text-yellow-400'
                  }`}>
                    {agent.status}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-white mb-2 group-hover:text-railway-teal transition-colors">
                  {agent.name}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {agent.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture Flow Section */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-railway-indigo/5 to-transparent pointer-events-none"></div>
        
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white">
            Multi-Agent Orchestration Diagram
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Every passenger scan passes through the Coordinator to trigger concurrent sub-agent audits.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-black/30 border border-white/5">
          {/* Step 1: Scanner */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 w-44 text-center">
            <Server className="w-8 h-8 text-railway-saffron mb-2 animate-bounce" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Passenger Scan</span>
            <span className="text-[10px] text-gray-400 mt-1">QR / Barcode / Ticket ID</span>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-600 rotate-90 lg:rotate-0" />

          {/* Step 2: Coordinator */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-railway-indigo/20 border border-railway-indigo/40 w-44 text-center shadow-lg shadow-railway-indigo/10">
            <Activity className="w-8 h-8 text-railway-indigo mb-2 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Coordinator Agent</span>
            <span className="text-[10px] text-gray-400 mt-1">Delegation Router</span>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-600 rotate-90 lg:rotate-0" />

          {/* Step 3: Sub Agents Grid */}
          <div className="flex flex-col gap-2 w-full lg:w-56">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-teal-500/20 text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span className="text-gray-300">Ticket Verification Agent</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-rose-500/20 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="text-gray-300">Fraud Detection Agent</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-blue-500/20 text-xs">
              <BarChart3 className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-gray-300">Revenue Analytics Agent</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-yellow-500/20 text-xs">
              <Users className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">Crowd Intelligence Agent</span>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-600 rotate-90 lg:rotate-0" />

          {/* Step 4: Decision Engine */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-railway-teal/20 border border-railway-teal/40 w-44 text-center">
            <Database className="w-8 h-8 text-railway-teal mb-2" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Enforcement Agent</span>
            <span className="text-[10px] text-gray-400 mt-1">Actions & Analytics</span>
          </div>

          <ArrowRight className="w-5 h-5 text-gray-600 rotate-90 lg:rotate-0" />

          {/* Step 5: Output */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 w-44 text-center">
            <div className="flex gap-2 mb-2">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <XCircle className="w-6 h-6 text-rose-500" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Gate Decision</span>
            <span className="text-[10px] text-gray-400 mt-1">APPROVED / DENIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
