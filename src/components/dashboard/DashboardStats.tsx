import { Activity, TrendingUp, Globe, List } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

interface DashboardStatsProps {
  stats: {
    totalAPIs: number;
    totalCalls: number;
    activeAPIs: number;
  };
  limits: {
    apis: number;
    calls: number;
    activeApis: number;
  };
  rateLimitStatus: {
    limit: number;
    used: number;
    remaining: number;
    reset: number;
    plan: string;
  } | null;
  resetCountdown: string;
}

export const DashboardStats = ({ stats, limits, rateLimitStatus, resetCountdown }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total APIs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalAPIs}
                <span className="text-lg text-gray-500 dark:text-gray-400">/{limits.apis}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <List className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalCalls.toLocaleString()}
                <span className="text-lg text-gray-500 dark:text-gray-400">/{limits.calls.toLocaleString()}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active APIs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.activeAPIs}
                <span className="text-lg text-gray-500 dark:text-gray-400">/{limits.activeApis}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Limit</p>
              {rateLimitStatus ? (
                <>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {rateLimitStatus.remaining}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    of {rateLimitStatus.limit} remaining
                  </p>
                  {resetCountdown && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Resets in {resetCountdown}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
