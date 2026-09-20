import React from 'react';

export type MainNavRoute =
  | 'dashboard'
  | 'upload'
  | 'history'
  | 'reports'
  | 'profile';

interface SidebarProps {
  currentRoute: MainNavRoute;
  onNavigate: (route: MainNavRoute) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: MainNavRoute;
  label: string;
  icon: string;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpen,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'upload', label: 'Upload & Analyze', icon: '📤', badge: 'AI' },
    { id: 'history', label: 'Past Searches', icon: '🕘' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-950/95 border-r border-white/10 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
            <div
              onClick={() => {
                onNavigate('dashboard');
                onCloseMobile();
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/80 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.3)] group-hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-white text-base tracking-tight leading-none">
                  ForgeMind <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-1">
                  Quality Intelligence
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5 mt-2">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
              Platform Modules
            </div>

            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.15)] font-heading'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      </aside>
    </>
  );
};
