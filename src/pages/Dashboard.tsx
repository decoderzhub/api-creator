import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ExternalLink, Copy, Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { API } from '../lib/types';

export const Dashboard = () => {
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAPIs: 0,
    totalCalls: 0,
    activeAPIs: 0,
  });
  const { profile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    loadAPIs();
  }, [profile]);

  const loadAPIs = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApis(data || []);

      setStats({
        totalAPIs: data?.length || 0,
        totalCalls: data?.reduce((sum, api) => sum + api.usage_count, 0) || 0,
        activeAPIs: data?.filter(api => api.status === 'active').length || 0,
      });
    } catch (err: any) {
      addToast(err.message || 'Failed to load APIs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAPI = async (id: string) => {
    try {
      const { error } = await supabase.from('apis').delete().eq('id', id);
      if (error) throw error;

      addToast('API deleted successfully', 'success');
      loadAPIs();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete API', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your APIs and track usage
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total APIs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalAPIs}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCalls.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active APIs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.activeAPIs}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your APIs</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading APIs...</p>
            </div>
          ) : apis.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No APIs yet</p>
              <Button onClick={() => window.location.href = '/generate'}>
                Generate Your First API
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apis.map((api) => (
                <motion.div
                  key={api.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {api.name}
                        </h3>
                        <Badge variant={api.status === 'active' ? 'success' : api.status === 'paused' ? 'warning' : 'danger'}>
                          {api.status}
                        </Badge>
                      </div>
                      {api.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {api.description}
                        </p>
                      )}
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Endpoint</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono text-gray-900 dark:text-gray-100">
                              {api.endpoint_url}
                            </code>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(api.endpoint_url)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">API Key</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono text-gray-900 dark:text-gray-100">
                              {api.api_key}
                            </code>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(api.api_key)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteAPI(api.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span>Calls: {api.usage_count.toLocaleString()}</span>
                    <span>Created: {new Date(api.created_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
