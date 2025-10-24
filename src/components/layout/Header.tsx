import { Moon, Sun, User } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  userEmail?: string;
  userPlan?: string;
}

export const Header = ({ theme, toggleTheme, userEmail, userPlan }: HeaderProps) => {
  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          AI API Builder
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Build & monetize APIs with natural language
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>

        {userEmail && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">{userEmail}</p>
            </div>
            {userPlan && (
              <Badge variant={userPlan === 'free' ? 'neutral' : userPlan === 'pro' ? 'info' : 'success'}>
                {userPlan.toUpperCase()}
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
