import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ScannerPage from './pages/ScannerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Check if admin token is stored locally on load
  useEffect(() => {
    const token = localStorage.getItem('railway_admin_token');
    if (token) {
      setIsAdminLoggedIn(true);
      setAdminUser({
        name: "Superintendent Inspector",
        email: "admin@railway.com",
        role: "Chief Revenue Protection Officer"
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('railway_admin_token');
    setIsAdminLoggedIn(false);
    setAdminUser(null);
    setActiveTab('landing');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col relative font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-railway-indigo/10 to-transparent pointer-events-none z-0"></div>
      
      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"
      ></div>

      {/* Floating Glass Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col z-10 relative">
        {activeTab === 'landing' && <LandingPage setActiveTab={setActiveTab} />}
        {activeTab === 'scanner' && <ScannerPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'admin' && (
          <AdminPage 
            isAdminLoggedIn={isAdminLoggedIn}
            setIsAdminLoggedIn={setIsAdminLoggedIn}
            adminUser={adminUser}
            setAdminUser={setAdminUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="z-10 py-6 border-t border-white/5 bg-black/40 text-center text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
        © {new Date().getFullYear()} Centre for Railway Information Systems (CRIS) | AI Multi-Agent Platform
      </footer>
    </div>
  );
}

export default App;
