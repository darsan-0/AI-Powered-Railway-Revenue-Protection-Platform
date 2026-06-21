import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanQrCode, Keyboard, Play, RefreshCw, ShieldCheck, 
  ShieldAlert, BarChart3, Users, Send, Activity, 
  AlertTriangle, Check, X, ShieldAlert as AlertIcon, Camera,
  Clock, ArrowRight, Download, Volume2, ShieldAlert as WarningIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import { API_BASE_URL } from '../config';

interface PassengerSample {
  ticket_id: string;
  name: string;
  type: string;
  description: string;
}

interface AgentProgressState {
  verification: 'idle' | 'processing' | 'completed';
  fraud: 'idle' | 'processing' | 'completed';
  revenue: 'idle' | 'processing' | 'completed';
  crowd: 'idle' | 'processing' | 'completed';
  enforcement: 'idle' | 'processing' | 'completed';
}

export default function ScannerPage() {
  const [ticketId, setTicketId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [gateId, setGateId] = useState('Gate A1');
  
  // Streaming states for UI
  const [streamedLogs, setStreamedLogs] = useState<string[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentProgress, setAgentProgress] = useState<AgentProgressState>({
    verification: 'idle',
    fraud: 'idle',
    revenue: 'idle',
    crowd: 'idle',
    enforcement: 'idle'
  });
  const [timeline, setTimeline] = useState<{ event: string; time: string; status: 'pending' | 'active' | 'completed' }[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // List of demo templates to make scanning tests easy
  const demoSamples: PassengerSample[] = [
    { ticket_id: 'TKT001', name: 'Rahul Kumar', type: 'Valid Ticket', description: 'Standard active ticket for travel today.' },
    { ticket_id: 'TKT006', name: 'Arjun Reddy', type: 'Expired Ticket', description: 'Journey date was 2 days ago.' },
    { ticket_id: 'TKT008', name: 'Ramesh Babu', type: 'Cancelled Ticket', description: 'Ticket was cancelled by passenger.' },
    { ticket_id: 'TKT010', name: 'Rajesh Verma', type: 'Duplicate (Gate 1)', description: 'Simulate duplicate scanning within 30 mins.' },
    { ticket_id: 'TKT012', name: 'Sandeep Gupta', type: 'Route Violation', description: 'Train does not route through Vijayawada.' },
    { ticket_id: 'TKT999', name: 'Unknown Passenger', type: 'Invalid ID', description: 'Ticket does not exist in backend.' }
  ];

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamedLogs]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    setIsCameraActive(true);
    setError(null);
    setResult(null);
    setStreamedLogs([]);
    setLogs([]);
    
    // Reset agent status indicators
    setAgentProgress({
      verification: 'idle',
      fraud: 'idle',
      revenue: 'idle',
      crowd: 'idle',
      enforcement: 'idle'
    });
    setTimeline([]);

    // Brief timeout to ensure the #qr-reader DOM container is rendered
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Failure callback (ignored to avoid flooding)
          }
        );
      } catch (err: any) {
        console.error(err);
        setError("Camera permission denied or video hardware unavailable.");
        setIsCameraActive(false);
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop camera scanner", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    // Stop camera first
    await stopScanner();

    // Check if QR code matches structured pipeline string or raw ID
    let ticketIdToValidate = decodedText;
    if (decodedText.includes('|')) {
      const parts = decodedText.split('|');
      ticketIdToValidate = parts[0]; // Take first token (Ticket ID)
    }

    const cleanId = ticketIdToValidate.trim().toUpperCase();
    setTicketId(cleanId);
    handleValidate(cleanId);
  };

  const handleValidate = async (idToValidate: string) => {
    if (!idToValidate.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStreamedLogs([]);
    setActiveAgent('coordinator');
    setAgentProgress({
      verification: 'idle',
      fraud: 'idle',
      revenue: 'idle',
      crowd: 'idle',
      enforcement: 'idle'
    });

    const initTime = new Date().toLocaleTimeString();
    setTimeline([
      { event: 'Ticket Scanned', time: initTime, status: 'completed' },
      { event: 'Verification Started', time: '', status: 'pending' },
      { event: 'Verification Completed', time: '', status: 'pending' },
      { event: 'Fraud Analysis Started', time: '', status: 'pending' },
      { event: 'Fraud Analysis Completed', time: '', status: 'pending' },
      { event: 'Revenue Audit Completed', time: '', status: 'pending' },
      { event: 'Final Decision Compiled', time: '', status: 'pending' },
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: idToValidate.trim(), gate_id: gateId })
      });

      if (!response.ok) {
        let errorMessage = 'Validation server returned an error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch (textErr) {}
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const rawLogs = data.thinking_logs;

      // Stream thinking logs dynamically to simulate live agent negotiation
      let currentLogIndex = 0;
      const logInterval = setInterval(() => {
        if (currentLogIndex < rawLogs.length) {
          const logLine = rawLogs[currentLogIndex];
          setStreamedLogs(prev => [...prev, logLine]);

          // Update active agent highlights and validation timeline dynamically
          const timestamp = new Date().toLocaleTimeString();
          if (logLine.includes('[Verification Agent]')) {
            setActiveAgent('verification');
            setAgentProgress(prev => ({ ...prev, verification: 'processing' }));
            
            if (logLine.includes('Searching')) {
              setTimeline(t => t.map((ev, idx) => idx === 1 ? { ...ev, time: timestamp, status: 'completed' } : ev));
            } else {
              setTimeline(t => t.map((ev, idx) => idx === 2 ? { ...ev, time: timestamp, status: 'completed' } : ev));
              setAgentProgress(prev => ({ ...prev, verification: 'completed' }));
            }
          } 
          else if (logLine.includes('[Fraud Detection Agent]')) {
            setActiveAgent('fraud');
            setAgentProgress(prev => ({ ...prev, verification: 'completed', fraud: 'processing' }));
            
            if (logLine.includes('Checking')) {
              setTimeline(t => t.map((ev, idx) => idx === 3 ? { ...ev, time: timestamp, status: 'completed' } : ev));
            } else {
              setTimeline(t => t.map((ev, idx) => idx === 4 ? { ...ev, time: timestamp, status: 'completed' } : ev));
              setAgentProgress(prev => ({ ...prev, fraud: 'completed' }));
            }
          } 
          else if (logLine.includes('[Revenue Analytics Agent]')) {
            setActiveAgent('revenue');
            setAgentProgress(prev => ({ ...prev, fraud: 'completed', revenue: 'processing' }));
            setTimeline(t => t.map((ev, idx) => idx === 5 ? { ...ev, time: timestamp, status: 'completed' } : ev));
            setAgentProgress(prev => ({ ...prev, revenue: 'completed' }));
          } 
          else if (logLine.includes('[Crowd Intelligence Agent]')) {
            setActiveAgent('crowd');
            setAgentProgress(prev => ({ ...prev, revenue: 'completed', crowd: 'processing' }));
            setAgentProgress(prev => ({ ...prev, crowd: 'completed' }));
          } 
          else if (logLine.includes('[Enforcement Agent]')) {
            setActiveAgent('enforcement');
            setAgentProgress(prev => ({ ...prev, crowd: 'completed', enforcement: 'processing' }));
            setAgentProgress(prev => ({ ...prev, enforcement: 'completed' }));
          } 
          else if (logLine.includes('[Coordinator Agent]')) {
            setActiveAgent('coordinator');
            if (logLine.includes('decision')) {
              setTimeline(t => t.map((ev, idx) => idx === 6 ? { ...ev, time: timestamp, status: 'completed' } : ev));
              setAgentProgress(prev => ({ ...prev, enforcement: 'completed' }));
            }
          }

          currentLogIndex++;
        } else {
          clearInterval(logInterval);
          setResult(data);
          setIsLoading(false);
          setActiveAgent(null);

          // Confetti for ACCESS APPROVED!
          if (data.final_decision === "ACCESS APPROVED") {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.65 }
            });
            // Play a success sound if supported
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
              osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
              osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
              gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.4);
            } catch (e) {}
          } else {
            // Denied sound
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(150.0, audioCtx.currentTime);
              osc.frequency.setValueAtTime(100.0, audioCtx.currentTime + 0.15);
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.35);
            } catch (e) {}
          }
        }
      }, 250);

    } catch (err: any) {
      setError(err.message || 'Connection to backend failed. Make sure FastAPI server is running on port 8000.');
      setIsLoading(false);
      setActiveAgent(null);
    }
  };

  const handleSimulateScan = (id: string) => {
    setTicketId(id);
    handleValidate(id);
  };

  const handleDownloadQRs = () => {
    const link = document.createElement('a');
    link.href = '/qr_tickets/all_tickets.zip';
    link.setAttribute('download', 'railway_qr_tickets.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column: QR Scanner, Manual Entry, and Testing Package */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* Scanner Panel */}
        <div className="glass-panel border-white/5 rounded-3xl p-6 relative overflow-hidden flex-1 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <ScanQrCode className="w-5 h-5 text-railway-teal animate-pulse" />
              Railway Entry Validation
            </h2>
            <div className="flex gap-2">
              <select 
                value={gateId}
                onChange={(e) => setGateId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 px-3 py-1 outline-none focus:border-railway-teal"
              >
                <option value="Gate A1" className="bg-railway-navy">Gate A1</option>
                <option value="Gate A2" className="bg-railway-navy">Gate A2</option>
                <option value="Gate B1" className="bg-railway-navy">Gate B1</option>
                <option value="Gate C3" className="bg-railway-navy">Gate C3</option>
              </select>
            </div>
          </div>

          {/* Camera View Area */}
          <div className="flex-1 rounded-2xl border border-white/10 bg-black/40 relative flex flex-col items-center justify-center overflow-hidden min-h-[260px]">
            {isCameraActive ? (
              <div className="absolute inset-0 flex flex-col bg-black/80 z-20">
                
                {/* Active scan frame overlay */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                  
                  {/* Neon laser line animation */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-railway-teal to-transparent shadow-[0_0_8px_#14b8a6] absolute top-1/2 -translate-y-1/2 animate-bounce"></div>
                  </div>
                  
                  <div className="w-full h-full max-w-[320px] max-h-[320px] relative rounded-2xl border-2 border-dashed border-railway-teal/40 overflow-hidden flex items-center justify-center bg-black/60 shadow-inner">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-railway-teal"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-railway-teal"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-railway-teal"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-railway-teal"></div>
                    
                    {/* Mounting node for html5-qrcode video */}
                    <div id="qr-reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>video]:rounded-2xl"></div>
                  </div>
                </div>
                
                <div className="p-4 bg-black/80 flex items-center justify-between border-t border-white/5">
                  <span className="text-[10px] text-railway-teal font-semibold tracking-wider animate-pulse uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-railway-teal animate-ping"></span>
                    Webcam QR Scanner Online
                  </span>
                  <button
                    onClick={stopScanner}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Close Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Point Ticket QR Code</p>
                <p className="text-xs text-gray-400 max-w-sm mb-5 leading-relaxed">
                  Start the webcam validation system. Hold your digital or printed railway ticket QR code directly in front of the lens.
                </p>
                <button
                  onClick={startScanner}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-railway-indigo to-railway-blue text-white hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-md shadow-railway-indigo/25"
                >
                  <Camera className="w-4 h-4 text-railway-teal" />
                  Open Camera Scanner
                </button>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter Ticket ID manually (e.g. TKT001)"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white/5 border border-white/10 focus:border-railway-teal rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-gray-500"
              />
            </div>
            <button
              onClick={() => handleValidate(ticketId)}
              disabled={isLoading || !ticketId.trim()}
              className="px-6 rounded-xl bg-gradient-to-r from-railway-indigo to-railway-blue text-white text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2"
            >
              Validate
            </button>
          </div>
        </div>

        {/* Demo Simulator Toolbar */}
        <div className="glass-panel border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-railway-saffron" />
              Demo Simulator Toolbar
            </h3>
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Capstone Quick Test</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {demoSamples.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleSimulateScan(sample.ticket_id)}
                disabled={isLoading}
                className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 active:scale-98 transition-all flex flex-col text-left group"
              >
                <span className="text-[10px] font-semibold text-railway-saffron mb-1 group-hover:underline">
                  {sample.ticket_id} ({sample.type})
                </span>
                <span className="text-xs font-bold text-white truncate w-full">{sample.name}</span>
                <span className="text-[9px] text-gray-400 mt-1 line-clamp-2 leading-tight">{sample.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Test Kit download folder */}
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-railway-teal/10 border border-railway-teal/20 text-railway-teal rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Downloadable QR Test Kit</span>
              <span className="text-[10px] text-gray-400 block leading-tight mt-0.5">Includes QR ticket image codes generated dynamically from passenger DB.</span>
            </div>
          </div>
          <button 
            onClick={handleDownloadQRs}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            Download ZIP
          </button>
        </div>
      </div>

      {/* Right Column: AI Live Reasoning, Status Grid, and Post-Scan experience */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* Real-time Agent Thinking Logs */}
        <div className="glass-panel border-white/5 rounded-3xl p-6 flex flex-col h-[240px]">
          <h3 className="font-display font-bold text-sm text-white mb-3 flex items-center justify-between border-b border-white/5 pb-2">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-railway-teal animate-pulse" />
              Live Agent Reasoning Feed
            </span>
            {activeAgent && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-railway-blue/10 text-railway-blue animate-pulse">
                Agent Active: {activeAgent}
              </span>
            )}
          </h3>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-gray-300 flex flex-col gap-2.5 pr-2">
            {streamedLogs.length === 0 ? (
              <div className="text-gray-500 italic text-center my-auto">
                {isLoading ? 'System initializing Multi-Agent protection gateway...' : 'Waiting for scan input to trace agent negotiation...'}
              </div>
            ) : (
              streamedLogs.map((log, idx) => {
                let color = "text-gray-300";
                if (log.includes("[Coordinator Agent]")) color = "text-railway-indigo font-bold";
                else if (log.includes("[Verification Agent]")) color = "text-teal-400";
                else if (log.includes("[Fraud Detection Agent]")) color = "text-rose-400";
                else if (log.includes("[Revenue Analytics Agent]")) color = "text-blue-400";
                else if (log.includes("[Crowd Intelligence Agent]")) color = "text-amber-400 font-medium";
                else if (log.includes("[Enforcement Agent]")) color = "text-purple-400";
                
                // Print formatted line
                return (
                  <div key={idx} className={`${color} bg-white/5 p-2 rounded-lg border border-white/5 leading-relaxed whitespace-pre-line`}>
                    {log}
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Dynamic Display Area: Shows Loading/Timeline OR Results & AI panels */}
        {isLoading && streamedLogs.length > 0 && (
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex flex-col gap-6 justify-between flex-1">
            
            {/* Live Progress loading bar */}
            <div className="flex flex-col items-center justify-center py-6">
              <RefreshCw className="w-10 h-10 text-railway-teal animate-spin mb-4" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Sequential Multi-Agent Audit Running</span>
              <p className="text-[10px] text-gray-400 mt-1">Orchestrating Verification, Fraud, and Analytics MCPs...</p>
            </div>

            {/* Validation Timeline */}
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Validation Timeline</h4>
              <div className="flex flex-col gap-2">
                {timeline.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border font-mono text-[9px] ${
                      step.status === 'completed' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'border-white/10 text-gray-500 bg-white/5'
                    }`}>
                      {step.status === 'completed' ? '✓' : idx + 1}
                    </div>
                    <span className={step.status === 'completed' ? 'text-gray-200' : 'text-gray-500'}>
                      {step.event}
                    </span>
                    {step.time && (
                      <span className="ml-auto text-[9px] text-gray-500 font-mono">
                        {step.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agent Status Visualization Grid */}
        {!result && !isLoading && (
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-500">
            <Activity className="w-10 h-10 text-gray-600 mb-2 animate-pulse" />
            <span className="text-xs">Submit or scan a ticket to trigger operations panel.</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="glass-panel border-white/5 rounded-3xl p-6 flex-1 flex flex-col items-center justify-center text-center text-rose-400">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-2 animate-bounce" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        )}

        {/* Post-Scan Results Panel */}
        {result && !isLoading && (
          <div className="flex flex-col gap-6 flex-1">
            
            {/* Success or Rejection Banner */}
            {result.final_decision === "ACCESS APPROVED" ? (
              <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-4 relative overflow-hidden shadow-lg shadow-emerald-500/5 animate-pulse-slow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px] opacity-40"></div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Platform Command</div>
                    <div className="font-display font-black text-xl text-white tracking-wide">ACCESS APPROVED</div>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-[9px] text-gray-400 uppercase block font-semibold">Confidence Score</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{result.agent_reasoning.verification.confidence}%</span>
                  </div>
                </div>
                
                {/* Info Card */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Passenger Name</span>
                    <span className="font-bold text-white text-sm">{result.passenger_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Ticket ID</span>
                    <span className="font-bold text-white text-sm">{result.ticket_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Journey Route & Train</span>
                    <span className="font-semibold text-gray-200">{result.route} (Train {result.train_number})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Revenue Protected</span>
                    <span className="font-bold text-emerald-400 text-sm font-mono">₹{result.agent_reasoning.revenue.revenue_saved.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-xs text-emerald-300 font-medium flex items-center gap-1 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
                  <Volume2 className="w-4 h-4 flex-shrink-0" />
                  Gate recommendation: {result.agent_reasoning.enforcement.recommendation}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/25 flex flex-col gap-4 relative overflow-hidden shadow-lg shadow-rose-500/5 animate-pulse-slow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/20 to-transparent rounded-bl-[100px] opacity-40"></div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                    <WarningIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-rose-400">Platform Command</div>
                    <div className="font-display font-black text-xl text-white tracking-wide">ACCESS DENIED</div>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-[9px] text-gray-400 uppercase block font-semibold">AI Fraud Risk</span>
                    <span className="text-sm font-black text-rose-400 font-mono">{result.agent_reasoning.fraud.risk_score} / 100</span>
                  </div>
                </div>

                {/* Info Card */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Detected Violation</span>
                    <span className="font-bold text-rose-400 text-sm">{result.explanation.split('.').slice(1).join('.').replace('inspector alerted', '').trim() || 'Ticket Verification Failure'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Fraud Risk Level</span>
                    <span className="font-black text-rose-500 uppercase tracking-widest text-xs mt-0.5 block">{result.agent_reasoning.fraud.risk_level} Risk</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Ticket ID & Name</span>
                    <span className="font-semibold text-gray-200">{result.ticket_id} ({result.passenger_name})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Leakage Prevented</span>
                    <span className="font-bold text-rose-400 text-sm font-mono">₹{result.agent_reasoning.revenue.revenue_saved.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10">
                  <Volume2 className="w-4 h-4 flex-shrink-0" />
                  Inspector recommended: {result.agent_reasoning.enforcement.recommendation}
                </div>
              </div>
            )}

            {/* Agent Status Visualization Grid */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agent Performance Registry</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { key: 'verification', name: 'Verification', agent: result.agent_reasoning.verification, icon: ShieldCheck, task: 'Checking Passenger Db' },
                  { key: 'fraud', name: 'Fraud Detect', agent: result.agent_reasoning.fraud, icon: ShieldAlert, task: 'Checking Scan Logs' },
                  { key: 'revenue', name: 'Revenue', agent: result.agent_reasoning.revenue, icon: BarChart3, task: 'Auditing Fare Value' },
                  { key: 'crowd', name: 'Crowd Intel', agent: result.agent_reasoning.crowd, icon: Users, task: 'Analyzing Congestion' },
                  { key: 'enforcement', name: 'Enforcement', agent: result.agent_reasoning.enforcement, icon: Send, task: 'Directing Patrols' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  const isDenied = (item.key === 'verification' && !item.agent.valid) || (item.key === 'fraud' && item.agent.risk_level !== 'Low');
                  return (
                    <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between min-h-[110px] text-xs relative overflow-hidden">
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-gray-300 text-[10px]">{item.name}</span>
                        <Icon className={`w-3.5 h-3.5 ${isDenied ? 'text-rose-400' : 'text-railway-teal'}`} />
                      </div>
                      
                      <div className="mt-2.5">
                        <span className="text-[9px] text-gray-500 block truncate">{item.task}</span>
                        <span className="font-bold text-white text-[10px] block mt-0.5 font-mono">
                          {item.key === 'verification' ? `Conf: ${item.agent.confidence}%` :
                           item.key === 'fraud' ? `Risk: ${item.agent.risk_score}` :
                           item.key === 'revenue' ? `Fares: ₹${item.agent.revenue_saved}` :
                           item.key === 'crowd' ? `Inc: ${item.agent.violation_risk_increase}` :
                           `Deploy TTE`}
                        </span>
                      </div>

                      <div className="mt-2 border-t border-white/5 pt-1.5 flex justify-between items-center text-[8px] text-gray-500 font-mono">
                        <span>Latency</span>
                        <span className="text-gray-300 font-bold">{item.agent.latency_ms || 100}ms</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Explanation panel */}
            <div className="glass-panel border-white/5 rounded-3xl p-6 flex flex-col gap-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
                AI Agent Explanation & Audits
              </h4>
              
              <div className="flex flex-col gap-3.5">
                {[
                  { label: 'Verification Agent Auditing', text: result.agent_reasoning.verification.explanation, icon: ShieldCheck, color: result.agent_reasoning.verification.valid ? 'text-teal-400' : 'text-rose-400' },
                  { label: 'Fraud Detection Analytics', text: result.agent_reasoning.fraud.explanation, icon: ShieldAlert, color: result.agent_reasoning.fraud.risk_level === 'Low' ? 'text-teal-400' : 'text-rose-400' },
                  { label: 'Financial Revenue Safeguard', text: result.agent_reasoning.revenue.explanation, icon: BarChart3, color: 'text-blue-400' },
                  { label: 'Crowd Congestion Insights', text: result.agent_reasoning.crowd.explanation, icon: Users, color: 'text-amber-400' },
                  { label: 'Smart TTE Patrol Deployments', text: `${result.agent_reasoning.enforcement.recommendation} | ${result.agent_reasoning.enforcement.inspector_deployment}`, icon: Send, color: 'text-purple-400' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <Icon className={`w-4.5 h-4.5 mt-0.5 flex-shrink-0 ${item.color}`} />
                      <div className="text-xs">
                        <span className="font-bold text-white block">{item.label}</span>
                        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
