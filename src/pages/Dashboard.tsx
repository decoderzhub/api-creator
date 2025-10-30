import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Globe, Code, Check, Edit2, X, Copy,
  BookmarkX, Bookmark, Key
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { API } from '../lib/types';
import { apiService } from '../lib/api';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { APICard } from '../components/dashboard/APICard';
import { SavedAPICard } from '../components/dashboard/SavedAPICard';
import { PublishModal } from '../components/dashboard/PublishModal';
import { CodeModal } from '../components/dashboard/CodeModal';

interface SavedAPI {
  id: string;
  user_id: string;
  api_id: string;
  user_api_key: string | null;
  created_at: string;
  apis: API;
}

export const Dashboard = () => {
  const [apis, setApis] = useState<API[]>([]);
  const [savedApis, setSavedApis] = useState<SavedAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
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
    is_custom?: boolean;
  } | null>(null);
  const [resetCountdown, setResetCountdown] = useState<string>('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [viewingCode, setViewingCode] = useState<{ name: string; code: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const planLimits = {
    free: { apis: 5, calls: 1000, activeApis: 3 },
    pro: { apis: 50, calls: 100000, activeApis: 25 },
    enterprise: { apis: 999, calls: 9999999, activeApis: 999 }
  };

  const currentLimits = planLimits[profile?.plan || 'free'];

  if (authLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadAPIs();
    loadSavedAPIs();
    loadUserApiKey();
    loadRateLimitStatus();

    // Refresh rate limit status every 30 seconds
    const rateLimitInterval = setInterval(() => {
      loadRateLimitStatus();
    }, 30000);

    return () => clearInterval(rateLimitInterval);
  }, [profile]);

  useEffect(() => {
    if (!rateLimitStatus) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = rateLimitStatus.reset - now;

      if (secondsRemaining <= 0) {
        setResetCountdown('Resetting...');
        loadRateLimitStatus();
        return;
      }

      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      setResetCountdown(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    return () => clearInterval(countdownInterval);
  }, [rateLimitStatus]);

  const loadUserApiKey = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('consumer_api_keys')
        .select('api_key')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      setUserApiKey(data?.api_key || null);
    } catch (err: any) {
      console.error('Failed to load user API key:', err);
    }
  };

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

  const loadSavedAPIs = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('saved_apis')
        .select('id, api_id, user_id, user_api_key, created_at, apis(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedApis(data as SavedAPI[] || []);
    } catch (err: any) {
      console.error('Failed to load saved APIs:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const generateUserAPIKey = async () => {
    if (!profile) return;

    setGeneratingKey(true);
    try {
      const apiKey = `ck_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      // Check if user already has a key
      const { data: existing } = await supabase
        .from('consumer_api_keys')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        // Update existing key
        const { error } = await supabase
          .from('consumer_api_keys')
          .update({ api_key: apiKey })
          .eq('user_id', profile.id);

        if (error) throw error;
      } else {
        // Insert new key
        const { error } = await supabase
          .from('consumer_api_keys')
          .insert({ user_id: profile.id, api_key: apiKey });

        if (error) throw error;
      }

      setUserApiKey(apiKey);
      addToast('API Key generated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to generate API key', 'error');
    } finally {
      setGeneratingKey(false);
    }
  };

  const unsaveAPI = async (savedApiId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('saved_apis')
        .delete()
        .eq('id', savedApiId)
        .eq('user_id', profile.id);

      if (error) throw error;

      addToast('Removed from My APIs', 'success');
      loadSavedAPIs();
    } catch (err: any) {
      addToast(err.message || 'Failed to remove API', 'error');
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

      <DashboardStats
        stats={stats}
        limits={currentLimits}
        rateLimitStatus={rateLimitStatus}
        resetCountdown={resetCountdown}
      />

      {savedApis.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Saved from Marketplace</h2>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSaved ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading saved APIs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedApis.map((savedApi) => {
                  const api = savedApi.apis;
                  return (
                  <motion.div
                    key={savedApi.id}
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
                          <Badge variant="success">saved</Badge>
                        </div>
                        {api.about && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <strong>About:</strong> {api.about}
                          </p>
                        )}

                        {api.code_snapshot && (() => {
                          const endpoints = parseEndpointsFromCode(api.code_snapshot);
                          const apiKey = userApiKey || 'Generate API Key below';
                          return endpoints.length > 0 && (
                            <div className="mb-3">
                              <button
                                onClick={() => setExpandedApiId(expandedApiId === savedApi.id ? null : savedApi.id)}
                                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <List className="w-4 h-4" />
                                {endpoints.length} Endpoint{endpoints.length !== 1 ? 's' : ''} Available
                                {expandedApiId === savedApi.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              {expandedApiId === savedApi.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800"
                                >
                                  {endpoints.map((endpoint, idx) => {
                                    const curlExample = formatCurlExample(api.endpoint_url, endpoint, apiKey);
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

                                        {endpoint.parameters.length > 0 && (
                                          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">Parameters:</p>
                                            <div className="space-y-1">
                                              {endpoint.parameters.map((param, paramIdx) => (
                                                <div key={paramIdx} className="text-xs">
                                                  <code className="font-mono text-blue-700 dark:text-blue-400">
                                                    {param.name}
                                                  </code>
                                                  <span className="text-gray-600 dark:text-gray-400">
                                                    {' '}({param.type})
                                                    {param.required && <span className="text-red-600 dark:text-red-400"> *required</span>}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <div className="bg-gray-900 dark:bg-black rounded p-2 relative group">
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

                        <div className="space-y-3 mb-4">
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

                          {userApiKey && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Your API Key</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono text-gray-900 dark:text-gray-100">
                                  {userApiKey}
                                </code>
                                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(userApiKey)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {(profile?.is_admin || profile?.plan === 'pro' || profile?.plan === 'enterprise') && api.code_snapshot && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setViewingCode({ name: api.name, code: api.code_snapshot! });
                                setCodeModalOpen(true);
                              }}
                            >
                              <Code className="w-4 h-4 mr-2" />
                              View Code
                            </Button>
                          )}
                          {!userApiKey ? (
                            <Button
                              size="sm"
                              onClick={generateUserAPIKey}
                              disabled={generatingKey}
                            >
                              {generatingKey ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Generate API Key
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={generateUserAPIKey}
                              disabled={generatingKey}
                            >
                              {generatingKey ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Regenerating...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Regenerate Key
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => unsaveAPI(savedApi.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Remove from saved"
                      >
                        <BookmarkX className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <span>Created: {new Date(savedApi.created_at).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
        <PublishModal
          isOpen={publishModalOpen}
          api={selectedApi}
          isLoading={publishLoading}
          onClose={() => setPublishModalOpen(false)}
          onPublish={handlePublishToMarketplace}
        />
      </AnimatePresence>

      <AnimatePresence>
        <CodeModal
          isOpen={codeModalOpen}
          code={viewingCode}
          isCopied={codeCopied}
          onClose={() => setCodeModalOpen(false)}
          onCopy={() => {
            if (viewingCode) {
              navigator.clipboard.writeText(viewingCode.code);
              addToast('Code copied to clipboard!', 'success');
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 2000);
            }
          }}
        />
      </AnimatePresence>
    </div>
  );
};
