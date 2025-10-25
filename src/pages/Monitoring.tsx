import { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, Cpu, Database, HardDrive, Server, TrendingUp, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';

interface SystemMetrics {
  uptime_seconds: number;
  uptime_formatted: string;
  total_requests: number;
  total_errors: number;
  error_rate: number;
  avg_response_time_ms: number;
  memory_usage_mb: number;
  cpu_percent: number;
  timestamp: string;
}

interface GatewayHealth {
  status: string;
  loaded_apis: number;
  database: string;
  sentry_enabled: boolean;
  timestamp: string;
}

interface RecentUsage {
  total_requests_today: number;
  total_requests_hour: number;
  avg_response_time: number;
  error_count: number;
  top_apis: Array<{ api_id: string; api_name: string; request_count: number }>;
}

export default function Monitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [usage, setUsage] = useState<RecentUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      await Promise.all([
        fetchSystemMetrics(),
        fetchHealthCheck(),
        fetchUsageStats()
      ]);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const gatewayUrl = import.meta.env.VITE_FASTAPI_GATEWAY_URL;
      const adminKey = import.meta.env.VITE_ADMIN_API_KEY;

      if (!adminKey) {
        console.warn('Admin API key not configured');
        return;
      }

      const response = await fetch(`${gatewayUrl}/metrics`, {
        headers: {
          'Authorization': `Bearer ${adminKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  };

  const fetchHealthCheck = async () => {
    try {
      const gatewayUrl = import.meta.env.VITE_FASTAPI_GATEWAY_URL;
      const response = await fetch(`${gatewayUrl}/health`);

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Error fetching health check:', error);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const { data: dailyData } = await supabase
        .from('api_usage')
        .select('*')
        .gte('created_at', oneDayAgo.toISOString());

      const { data: hourlyData } = await supabase
        .from('api_usage')
        .select('*')
        .gte('created_at', oneHourAgo.toISOString());

      const { data: topApisData } = await supabase
        .from('api_usage')
        .select('api_id, apis(name)')
        .gte('created_at', oneDayAgo.toISOString());

      const apiCounts: Record<string, { name: string; count: number }> = {};
      topApisData?.forEach((item: any) => {
        const apiId = item.api_id;
        const apiName = item.apis?.name || 'Unknown API';
        if (!apiCounts[apiId]) {
          apiCounts[apiId] = { name: apiName, count: 0 };
        }
        apiCounts[apiId].count++;
      });

      const topApis = Object.entries(apiCounts)
        .map(([api_id, { name, count }]) => ({
          api_id,
          api_name: name,
          request_count: count
        }))
        .sort((a, b) => b.request_count - a.request_count)
        .slice(0, 5);

      const avgResponseTime = dailyData && dailyData.length > 0
        ? dailyData.reduce((sum: number, item: any) => sum + (item.response_time_ms || 0), 0) / dailyData.length
        : 0;

      const errorCount = dailyData?.filter((item: any) => item.status_code >= 400).length || 0;

      setUsage({
        total_requests_today: dailyData?.length || 0,
        total_requests_hour: hourlyData?.length || 0,
        avg_response_time: Math.round(avgResponseTime),
        error_count: errorCount,
        top_apis: topApis
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'text-green-600';
    if (status === 'degraded') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle className="w-6 h-6" />;
    if (status === 'degraded') return <AlertCircle className="w-6 h-6" />;
    return <AlertCircle className="w-6 h-6" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
        <p className="mt-2 text-gray-600">Real-time system health and performance metrics</p>
      </div>

      {health && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={getStatusColor(health.status)}>
                {getStatusIcon(health.status)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Gateway Status</h2>
                <p className="text-sm text-gray-600">Last updated: {new Date(health.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(health.status)} bg-opacity-10`}>
              {health.status.toUpperCase()}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics && (
          <>
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.uptime_formatted}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_requests.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.avg_response_time_ms}ms</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{(metrics.error_rate * 100).toFixed(2)}%</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <HardDrive className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.memory_usage_mb} MB</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Cpu className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">CPU Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.cpu_percent}%</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {health && (
          <>
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Server className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Loaded APIs</p>
                  <p className="text-2xl font-bold text-gray-900">{health.loaded_apis}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${health.database === 'connected' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Database className={`w-6 h-6 ${health.database === 'connected' ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Database</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{health.database}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {usage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Last 24 Hours</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Requests</span>
                  <span className="font-semibold">{usage.total_requests_today.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-semibold">{usage.avg_response_time}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Errors</span>
                  <span className="font-semibold text-red-600">{usage.error_count}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Last Hour</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Requests</span>
                  <span className="font-semibold">{usage.total_requests_hour.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requests/min</span>
                  <span className="font-semibold">{Math.round(usage.total_requests_hour / 60)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-gray-900">Monitoring</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sentry</span>
                  <span className={`font-semibold ${health?.sentry_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {health?.sentry_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auto Refresh</span>
                  <span className="font-semibold text-green-600">30s</span>
                </div>
              </div>
            </Card>
          </div>

          {usage.top_apis.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top APIs (24h)</h3>
              <div className="space-y-3">
                {usage.top_apis.map((api, index) => (
                  <div key={api.api_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{api.api_name}</p>
                        <p className="text-sm text-gray-500">{api.api_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{api.request_count.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">requests</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
