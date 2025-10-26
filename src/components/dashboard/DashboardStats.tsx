import { Activity, TrendingUp, Globe, List, Zap } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

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
    is_custom?: boolean;
  } | null;
  resetCountdown: string;
}

export const DashboardStats = ({ stats, limits, rateLimitStatus, resetCountdown }: DashboardStatsProps) => {
  const percentage = (value: number, max: number) => Math.min((value / max) * 100, 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total APIs</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">
                  {stats.totalAPIs}
                </p>
                <span className="text-sm text-muted-foreground font-mono">/{limits.apis}</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
              <List className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage(stats.totalAPIs, limits.apis)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Calls</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">
                  {stats.totalCalls.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Limit: {limits.calls.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage(stats.totalCalls, limits.calls)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Active APIs</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">
                  {stats.activeAPIs}
                </p>
                <span className="text-sm text-muted-foreground font-mono">/{limits.activeApis}</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage(stats.activeAPIs, limits.activeApis)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-muted-foreground">Rate Limit</p>
                {rateLimitStatus?.is_custom && (
                  <Badge variant="outline" className="text-xs font-mono">
                    CUSTOM
                  </Badge>
                )}
              </div>
              {rateLimitStatus ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      {rateLimitStatus.remaining.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    of {rateLimitStatus.limit.toLocaleString()}
                  </p>
                  {resetCountdown && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Zap className="w-3 h-3" />
                      {resetCountdown}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </div>
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20">
              <Globe className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          {rateLimitStatus && (
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  rateLimitStatus.remaining < rateLimitStatus.limit * 0.2 ? "bg-red-500" : "bg-orange-500"
                )}
                style={{ width: `${percentage(rateLimitStatus.remaining, rateLimitStatus.limit)}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
