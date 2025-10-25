import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ExternalLink, Copy, Activity, TrendingUp, Globe, X, List, ChevronDown, ChevronUp, Edit2, Check, Code, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CodeViewer } from '../components/ui/CodeViewer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { API } from '../lib/types';
import { parseEndpointsFromCode, formatCurlExample, ParsedEndpoint } from '../lib/endpoints';
import { apiService } from '../lib/api';

export const Dashboard = () => {
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAPIs: 0,
    totalCalls: 0,
    activeAPIs: 0,
  });
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    limit: number;
    used: number;
    remaining: number;
    reset: number;
    plan: string;
  } | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [expandedApiId, setExpandedApiId] = useState<string | null>(null);
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [viewingCode, setViewingCode] = useState<{ name: string; code: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const { profile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    loadAPIs();
    loadRateLimitStatus();

    // Refresh rate limit status every 30 seconds
    const rateLimitInterval = setInterval(() => {
      loadRateLimitStatus();
    }, 30000);

    return () => clearInterval(rateLimitInterval);
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

  const loadRateLimitStatus = async () => {
    if (!profile) return;

    try {
      const response = await apiService.getRateLimitStatus(profile.id);
      if (response.success) {
        setRateLimitStatus(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load rate limit status:', err);
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

  const startEditing = (api: API) => {
    setEditingApiId(api.id);
    setEditName(api.name);
    setEditAbout(api.about || '');
  };

  const cancelEditing = () => {
    setEditingApiId(null);
    setEditName('');
    setEditAbout('');
  };

  const saveEdits = async (apiId: string) => {
    if (!editName.trim()) {
      addToast('API name cannot be empty', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('apis')
        .update({
          name: editName.trim(),
          about: editAbout.trim() || null,
        })
        .eq('id', apiId);

      if (error) throw error;

      setApis(apis.map(api =>
        api.id === apiId
          ? { ...api, name: editName.trim(), about: editAbout.trim() || null }
          : api
      ));

      addToast('API updated successfully!', 'success');
      cancelEditing();
    } catch (error) {
      console.error('Error updating API:', error);
      addToast('Failed to update API', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePublishClick = (api: API) => {
    setSelectedApi(api);
    setPublishModalOpen(true);
  };

  const handlePublishToMarketplace = async () => {
    if (!selectedApi) return;

    if (!selectedApi.about || selectedApi.about.trim() === '') {
      addToast('Please add an about section to your API before publishing', 'error');
      return;
    }

    setPublishLoading(true);
    try {
      const { error: marketplaceError } = await supabase.from('marketplace').insert({
        api_id: selectedApi.id,
        title: selectedApi.name,
        description: selectedApi.about,
        price_per_call: 0,
        is_public: true,
      });

      if (marketplaceError) throw marketplaceError;

      await supabase
        .from('apis')
        .update({ is_published: true })
        .eq('id', selectedApi.id);

      addToast('API published to marketplace successfully!', 'success');
      setPublishModalOpen(false);
      setSelectedApi(null);
      loadAPIs();
    } catch (err: any) {
      addToast(err.message || 'Failed to publish API', 'error');
    } finally {
      setPublishLoading(false);
    }
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Limit</p>
                {rateLimitStatus ? (
                  <>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {rateLimitStatus.remaining}
                      <span className="text-lg text-gray-500 dark:text-gray-400">/{rateLimitStatus.limit}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {rateLimitStatus.used} used • {rateLimitStatus.plan} plan
                    </p>
                    {rateLimitStatus.remaining < rateLimitStatus.limit * 0.2 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Running low on requests
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">-</p>
                )}
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                      {editingApiId === api.id ? (
                        <div className="space-y-3 mb-3">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-500 mb-1 block">API Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              placeholder="API Name"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-500 mb-1 block">About</label>
                            <input
                              type="text"
                              value={editAbout}
                              onChange={(e) => setEditAbout(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              placeholder="About (5-6 words)"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdits(api.id)}
                              disabled={saveLoading}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              {saveLoading ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={saveLoading}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {api.name}
                            </h3>
                            <Badge variant={api.status === 'active' ? 'success' : api.status === 'paused' ? 'warning' : 'danger'}>
                              {api.status}
                            </Badge>
                            <button
                              onClick={() => startEditing(api)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                              title="Edit API details"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          </div>
                          {api.about && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <strong>About:</strong> {api.about}
                            </p>
                          )}
                        </>
                      )}

                      {api.code_snapshot && (() => {
                        const endpoints = parseEndpointsFromCode(api.code_snapshot);
                        return endpoints.length > 0 && (
                          <div className="mb-3">
                            <button
                              onClick={() => setExpandedApiId(expandedApiId === api.id ? null : api.id)}
                              className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <List className="w-4 h-4" />
                              {endpoints.length} Endpoint{endpoints.length !== 1 ? 's' : ''} Available
                              {expandedApiId === api.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {expandedApiId === api.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800"
                              >
                                {endpoints.map((endpoint, idx) => {
                                  const curlExample = formatCurlExample(api.endpoint_url, endpoint, api.api_key || 'your-api-key');
                                  return (
                                    <div key={idx} className="text-xs border border-gray-200 dark:border-gray-700 rounded p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 font-semibold rounded ${
                                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                          endpoint.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                          endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                          endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                        }`}>
                                          {endpoint.method}
                                        </span>
                                        <code className="font-mono text-gray-900 dark:text-gray-100">
                                          {endpoint.path}
                                        </code>
                                      </div>
                                      {endpoint.summary && (
                                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                                          {endpoint.summary}
                                        </p>
                                      )}
                                      <div className="mt-2 bg-gray-900 dark:bg-black rounded p-2 relative group">
                                        <pre className="text-xs text-gray-100 overflow-x-auto">
                                          <code>{curlExample}</code>
                                        </pre>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(curlExample);
                                            addToast('Copied to clipboard!', 'success');
                                          }}
                                          className="absolute top-2 right-2 p-1 bg-gray-800 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Copy to clipboard"
                                        >
                                          <Copy className="w-3 h-3 text-gray-300" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </div>
                        );
                      })()}

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
                    <div className="flex gap-2">
                      {api.code_snapshot && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewingCode({ name: api.name, code: api.code_snapshot });
                            setCodeModalOpen(true);
                          }}
                        >
                          <Code className="w-4 h-4 mr-1" />
                          View Code
                        </Button>
                      )}
                      {!api.is_published && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublishClick(api)}
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteAPI(api.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

      <AnimatePresence>
        {publishModalOpen && selectedApi && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setPublishModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    Publish to Marketplace
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share your API with the community
                  </p>
                </div>
                <button
                  onClick={() => setPublishModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    API Name
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100">{selectedApi.name}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    About
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedApi.about || 'No about section provided'}
                  </p>
                  {!selectedApi.about && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      You need to add an about section before publishing. Please edit your API.
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Note:</strong> Once published, your API will be visible to all users in the marketplace. You can unpublish it at any time.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPublishModalOpen(false)}
                  disabled={publishLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePublishToMarketplace}
                  isLoading={publishLoading}
                  disabled={!selectedApi.about || publishLoading}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {codeModalOpen && viewingCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setCodeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {viewingCode.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingCode.code);
                      addToast('Code copied to clipboard!', 'success');
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy all code"
                  >
                    {codeCopied ? (
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setCodeModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <CodeViewer code={viewingCode.code} language="python" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
