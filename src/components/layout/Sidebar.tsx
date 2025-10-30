import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Zap, LayoutDashboard, Store, CreditCard, LogOut, User, MessageSquare, Key, Activity, Code2, Shield, Terminal, FlaskConical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar = ({ onLogout }: SidebarProps) => {
  const location = useLocation();
  const { profile } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/generate', icon: Zap, label: 'Generate API' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/playground', icon: FlaskConical, label: 'API Playground' },
    { path: '/integration-helper', icon: Code2, label: 'Integrations' },
    { path: '/marketplace', icon: Store, label: 'Marketplace' },
  ];

  const bottomNavItems = [
    { path: '/monitoring', icon: Activity, label: 'Monitoring' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/api-keys', icon: Key, label: 'API Keys' },
    { path: '/billing', icon: CreditCard, label: 'Billing' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  if (profile?.is_admin) {
    bottomNavItems.unshift({ path: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <aside className="w-64 h-screen border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
            <Terminal className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">API-Creator</span>
            <span className="text-xs text-muted-foreground font-mono">v2.0</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group",
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-1 border-t">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};
