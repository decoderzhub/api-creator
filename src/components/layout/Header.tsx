import { Moon, Sun, User, Cpu } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  userEmail?: string;
  userPlan?: string;
}

export const Header = ({ theme, toggleTheme, userEmail, userPlan }: HeaderProps) => {
  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Cpu className="w-6 h-6 text-primary relative animate-pulse" />
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-sm font-semibold text-foreground">System Status</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-mono">All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className={cn(
            "relative p-2.5 rounded-md transition-all duration-200",
            "hover:bg-accent hover:scale-110",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
        >
          <div className="relative">
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-foreground" />
            )}
          </div>
        </button>

        {userEmail && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-accent border">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">{userEmail}</p>
              <p className="text-xs text-muted-foreground font-mono">ID: {userEmail.slice(0, 8)}</p>
            </div>
            {userPlan && (
              <Badge
                variant={userPlan === 'free' ? 'outline' : 'default'}
                className={cn(
                  "font-mono text-xs",
                  userPlan === 'enterprise' && "bg-gradient-to-r from-purple-500 to-pink-500 border-0"
                )}
              >
                {userPlan.toUpperCase()}
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
