import React, { useState, useRef, useEffect } from 'react';
import { Sidebar, MainNavRoute } from './Sidebar';
import { UserProfile } from '../auth/AuthPage';
import { ModelKey } from '../../types/forgemind';
import {
  getNotifications,
  markNotificationsRead,
  AppNotification,
} from '../../services/inspectionStore';
import { FloatingChatbot } from '../common/FloatingChatbot';

interface AppLayoutProps {
  currentRoute: MainNavRoute;
  onNavigate: (route: MainNavRoute) => void;
  user: UserProfile;
  onSignOut: () => void;
  currentModel: ModelKey;
  onModelChange: (model: ModelKey) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  user,
  onSignOut,
  currentModel,
  onModelChange,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load real notifications
  useEffect(() => {
    setNotifications(getNotifications());
  }, [currentRoute]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen && unreadCount > 0) {
      markNotificationsRead();
      setNotifications(getNotifications());
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* 1. Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#080c14]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Left: Mobile hamburger & route breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest hidden sm:inline">
                FORGEMIND
              </span>
              <span className="text-slate-600 hidden sm:inline">&bull;</span>
              <h1 className="text-sm font-heading font-bold text-white tracking-tight capitalize truncate">
                {currentRoute === 'dashboard'
                  ? 'Industrial Quality Dashboard'
                  : currentRoute === 'upload'
                  ? 'Upload & Defect Analysis'
                  : currentRoute === 'history'
                  ? 'Past Inspection Searches'
                  : currentRoute}
              </h1>
            </div>
          </div>

          {/* Right: Active Model Selector, Notifications, & User Profile Menu */}
          <div className="flex items-center gap-3">
            
            {/* Active Line Model Selector */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase">LINE:</span>
              <select
                value={currentModel}
                onChange={(e) => onModelChange(e.target.value as ModelKey)}
                className="bg-transparent text-cyan-300 font-semibold text-xs outline-none cursor-pointer"
              >
                <option value="Model_1" className="bg-slate-950 text-white">Model 1 (3-Station)</option>
                <option value="Model_2" className="bg-slate-950 text-white">Model 2 (Dual-Part)</option>
              </select>
            </div>

            {/* Notification Bell with Real Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                id="notifications-bell-btn"
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.9)] p-3 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                      Notifications
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {notifications.length} Total
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 py-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-mono">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1 hover:border-cyan-500/30 transition"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-white">
                            <span>{n.title}</span>
                            <span className="text-[10px] font-mono text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Real Authenticated User Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                id="user-profile-menu-btn"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-400/50 transition cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="w-7 h-7 rounded-lg object-cover border border-cyan-400"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/40 border border-cyan-400/60 flex items-center justify-center text-cyan-300 text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left pr-1">
                  <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 uppercase">
                    {user.authProvider}
                  </span>
                </div>
                <span className="text-slate-400 text-xs pr-1">▾</span>
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950 border border-white/15 shadow-[0_15px_50px_rgba(0,0,0,0.95)] p-3 z-50 animate-fadeIn space-y-2">
                  <div className="px-2 py-2 border-b border-white/10 space-y-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{user.email}</p>
                    {user.facility && (
                      <p className="text-[10px] text-cyan-400 font-mono truncate">{user.facility}</p>
                    )}
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('profile');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-2"
                    >
                      <span>👤</span>
                      <span>Profile</span>
                    </button>

                    <div className="border-t border-white/10 my-1"></div>

                    <button
                      type="button"
                      id="logout-action-btn"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-2"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Main Body */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {children}
        </main>

        {/* Global Industrial Footer */}
        <footer className="mt-auto border-t border-white/5 p-4 text-center text-xs text-slate-500 font-mono text-[11px]">
          ForgeMind AI &bull; Autonomous Manufacturing Intelligence &bull; Production Architecture
        </footer>

        {/* Global Floating AI Assistant */}
        <FloatingChatbot />
      </div>
    </div>
  );
};
