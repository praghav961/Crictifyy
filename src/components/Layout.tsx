
import React, { Suspense, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, Trophy, Users, Bell, User, LogOut, Sun, Moon, Laptop, WifiOff, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
}

export function Layout() {
  const { user, profile } = useAuth();
  const isOnline = useOnlineStatus();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Live Matches', path: '/matches', icon: Activity },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Players', path: '/players', icon: Users },
    { name: 'Settings', path: '/profile', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans transition-colors duration-200">
      
      {/* Desktop Sidebar (matching the image) */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border fixed h-full top-0 left-0 z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-black text-xl leading-none">C</span>
          </div>
          <span className="text-foreground font-bold text-xl tracking-tight">CrickHQ</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-hover"
                )}
              >
                <item.icon className={cn("h-5 w-5 mr-3 transition-colors", isActive ? "text-primary" : "text-foreground-muted group-hover:text-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          {user ? (
            <button onClick={handleSignOut} className="flex items-center w-full px-4 py-3 text-foreground-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors">
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          ) : (
            <Link to="/login" className="flex items-center w-full px-4 py-3 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-xl transition-colors">
              <User className="h-5 w-5 mr-3" />
              Login
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 w-full min-w-0">
        
        {/* Mobile Top Header */}
        <header className="md:hidden bg-surface border-b border-border sticky top-0 z-30">
          <div className="px-4 py-3 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary p-1 rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm leading-none">C</span>
              </div>
              <span className="text-foreground font-bold text-lg">CrickHQ</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/settings/notifications" className="text-foreground-muted">
                <Bell className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Desktop Top Nav (For search, notifications, profile as seen in image) */}
        <header className="hidden md:flex bg-background border-b border-border h-16 items-center justify-end px-8 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-surface rounded-full p-1 border border-border">
                <button onClick={() => setTheme('light')} className={cn("p-1.5 rounded-full transition-colors", theme === 'light' ? "bg-surface-hover text-foreground" : "text-foreground-muted hover:text-foreground")}><Sun className="h-4 w-4" /></button>
                <button onClick={() => setTheme('system')} className={cn("p-1.5 rounded-full transition-colors", theme === 'system' ? "bg-surface-hover text-foreground" : "text-foreground-muted hover:text-foreground")}><Laptop className="h-4 w-4" /></button>
                <button onClick={() => setTheme('dark')} className={cn("p-1.5 rounded-full transition-colors", theme === 'dark' ? "bg-surface-hover text-foreground" : "text-foreground-muted hover:text-foreground")}><Moon className="h-4 w-4" /></button>
            </div>
            {user && (
              <>
                <Link to="/settings/notifications" className="relative text-foreground-muted hover:text-foreground transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full border border-background"></span>
                </Link>
                <Link to="/profile" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden">
                    <User className="w-4 h-4 text-foreground-muted" />
                  </div>
                </Link>
              </>
            )}
          </div>
        </header>

        {!isOnline && (
          <div className="bg-warning text-background px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            You are currently offline.
          </div>
        )}

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 flex flex-col">
          <Suspense fallback={<div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e676]"></div></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation (matching image) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)] flex justify-between items-center shadow-lg">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full py-2 px-1 space-y-1 transition-colors rounded-lg",
                isActive ? "text-primary" : "text-foreground-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
