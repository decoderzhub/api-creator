import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertTriangle, Clock, Database, Server } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StreamingDynamicTestUI } from '../components/dashboard/StreamingDynamicTestUI';
import { ContainerTroubleshooter } from '../components/dashboard/ContainerTroubleshooter';
import { ContainerControls } from '../components/dashboard/ContainerControls';
import { ManualTroubleshoot } from '../components/dashboard/ManualTroubleshoot';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../lib/endpoints';

interface APIData {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  code_snapshot: string;
  endpoint_url: string;
  status: string;
  requirements: string | null;
  user_id: string;
  api_key?: string;
}

interface DiagnosticsData {
  api_id: string;
  is_deployed: boolean;
  container_status?: string;
  port?: number;
  recent_logs?: string[];
  api_info?: {
    name: string;
    status: string;
    requirements: string | null;
    created_at: string;
  };
  message?: string;
  timestamp: string;
}

export default function APIPlayground() {
  const { apiId } = useParams<{ apiId: string }>();
  const navigate = useNavigate();
  const [apiData, setApiData] = useState<APIData | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState('');

  useEffect(() => {
    fetchAPIData();
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 30000);
    return () => clearInterval(interval);
  }, [apiId]);

  const fetchAPIData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .eq('id', apiId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setApiData(data);
      setOriginalPrompt(data.prompt || data.description || '');

      // API key is already stored in the data
      if (data.api_key) {
        setApiKey(data.api_key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/diagnostics/${apiId}`);
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading API Playground...</p>
        </div>
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading API</h2>
            <p className="text-gray-400 mb-4">{error || 'API not found'}</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Use the actual endpoint URL from the database
  const apiUrl = apiData.endpoint_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {refreshing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Refreshing API data...</span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{apiData.name}</h1>
              <p className="text-gray-400">{apiData.description || 'API Testing Playground'}</p>
            </div>

            <div className="flex items-center gap-3">
              {diagnostics?.is_deployed && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Live</span>
                </div>
              )}
              {!diagnostics?.is_deployed && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-400">Deploying</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Testing Area - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Container Troubleshooter - Shows when there are errors */}
            <ContainerTroubleshooter
              apiId={apiData.id}
              apiName={apiData.name}
              originalCode={apiData.code_snapshot}
              originalPrompt={originalPrompt}
              containerStatus={diagnostics?.container_status}
              onFixApplied={() => {
                fetchAPIData(true);
                fetchDiagnostics();
              }}
            />

            {/* Manual Troubleshoot - Always visible for user-described errors */}
            <ManualTroubleshoot
              apiId={apiData.id}
              apiName={apiData.name}
              originalCode={apiData.code_snapshot}
              originalPrompt={originalPrompt}
              onFixApplied={() => {
                fetchAPIData(true);
                fetchDiagnostics();
              }}
            />

            <StreamingDynamicTestUI
              apiId={apiData.id}
              apiName={apiData.name}
              apiUrl={apiUrl}
              apiKey={apiKey}
              code={apiData.code_snapshot}
            />
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Container Controls Card */}
            <ContainerControls
              apiId={apiData.id}
              containerStatus={diagnostics?.container_status}
              onContainerUpdate={() => {
                fetchAPIData(true);
                fetchDiagnostics();
              }}
            />

            {/* API Info Card */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                API Information
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-gray-500 mb-1">Endpoint</div>
                  <code className="block px-2 py-1.5 bg-gray-800 rounded text-pink-400 break-all">
                    {apiUrl}
                  </code>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-1 rounded ${
                      apiData.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {apiData.status}
                    </span>
                  </div>
                </div>
                {apiData.requirements && (
                  <div>
                    <div className="text-gray-500 mb-1">Dependencies</div>
                    <code className="block px-2 py-1.5 bg-gray-800 rounded text-gray-400 text-[10px]">
                      {apiData.requirements}
                    </code>
                  </div>
                )}
              </div>
            </Card>

            {/* Diagnostics Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Diagnostics
                </h3>
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="text-xs text-pink-400 hover:text-pink-300"
                >
                  {showDiagnostics ? 'Hide' : 'Show'}
                </button>
              </div>

              {diagnostics && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Server className="w-3 h-3" />
                      Container
                    </span>
                    <span className={`font-medium ${
                      diagnostics.is_deployed ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {diagnostics.container_status || 'Not deployed'}
                    </span>
                  </div>
                  {diagnostics.port && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-500">Port</span>
                      <span className="text-gray-300 font-mono">{diagnostics.port}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Updated
                    </span>
                    <span className="text-gray-400">
                      {new Date(diagnostics.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}

              {showDiagnostics && diagnostics?.recent_logs && (
                <div className="mt-4">
                  <div className="text-gray-500 mb-2 text-xs">Recent Logs</div>
                  <div className="bg-black/40 rounded p-2 max-h-48 overflow-y-auto">
                    {diagnostics.recent_logs.map((log, idx) => (
                      <div key={idx} className="text-[10px] text-gray-400 font-mono leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Actions Card */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={fetchDiagnostics}
                >
                  <Activity className="w-3 h-3 mr-2" />
                  Refresh Diagnostics
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={() => navigate(`/dashboard`)}
                >
                  <Database className="w-3 h-3 mr-2" />
                  View in Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
