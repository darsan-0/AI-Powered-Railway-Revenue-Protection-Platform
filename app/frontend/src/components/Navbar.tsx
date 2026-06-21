import React from 'react';
import { ShieldAlert, BarChart3, ScanQrCode, LayoutDashboard, ShieldCheck, Clock } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navbar({ activeTab, setActiveTab, isAdminLoggedIn, onLogout }: NavbarProps) {
  const navItems = [
    { id: 'landing', label: 'Home', icon: ShieldCheck },
    { id: 'scanner', label: 'Entry Validation', icon: ScanQrCode },
    { id: 'analytics', label: 'Operations Center', icon: LayoutDashboard },
    { id: 'history', label: 'Audit Trail', icon: Clock },
    { id: 'admin', label: 'Admin Portal', icon: ShieldAlert },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl px-4 py-2 rounded-full glass-panel flex items-center justify-between border border-white/10 shadow-lg shadow-black/40">
      <div 
        onClick={() => setActiveTab('landing')} 
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-railway-saffron to-railway-blue flex items-center justify-center font-display font-bold text-white text-sm shadow-inner group-hover:scale-105 transition-transform duration-300">
          IR
        </div>
        <span className="hidden md:inline font-display font-semibold text-sm tracking-wide text-white group-hover:text-railway-blue transition-colors duration-200">
          CRIS Revenue Shield
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-railway-indigo to-railway-blue text-white shadow-md shadow-railway-indigo/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center">
        {isAdminLoggedIn ? (
          <button 
            onClick={onLogout}
            className="px-3 py-1 text-xs rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all duration-300"
          >
            Logout
          </button>
        ) : (
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" title="System Online"></div>
        )}
      </div>
    </nav>
  );
}
