import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check, ExternalLink, Rocket, Code, Zap, Lightbulb, List, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { apiService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { parseEndpointsFromCode, formatCurlExample, ParsedEndpoint } from '../lib/endpoints';

interface GeneratedAPI {
  id: string;
  name: string;
  endpoint_url: string;
  api_key: string;
  description: string;
  endpoints?: ParsedEndpoint[];
}

export const Generate = () => {
  const [prompt, setPrompt] = useState('');
  const [apiName, setApiName] = useState('');
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAPI, setGeneratedAPI] = useState<GeneratedAPI | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [aboutSuggestions, setAboutSuggestions] = useState<string[]>([]);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [showAboutSuggestions, setShowAboutSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { profile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const words = prompt.trim().split(/\s+/);
    if (words.length >= 3) {
      const timeoutId = setTimeout(() => {
        fetchPromptSuggestions();
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setShowPromptSuggestions(false);
      setPromptSuggestions([]);
    }
  }, [prompt, apiName]);

  useEffect(() => {
    const words = about.trim().split(/\s+/);
    if (words.length >= 3 && prompt.trim()) {
      const timeoutId = setTimeout(() => {
        fetchAboutSuggestions();
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setShowAboutSuggestions(false);
      setAboutSuggestions([]);
    }
  }, [about, apiName, prompt]);

  const fetchPromptSuggestions = async () => {
    if (!apiName.trim() && !prompt.trim()) return;

    setLoadingSuggestions(true);
    try {
      const response = await apiService.getSuggestedPrompts(apiName, prompt);
      setPromptSuggestions(response.suggestions || []);
      setShowPromptSuggestions(response.suggestions?.length > 0);
    } catch (error) {
      console.error('Failed to fetch prompt suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchAboutSuggestions = async () => {
    if (!prompt.trim()) return;

    try {
      const response = await apiService.getSuggestedAbout(apiName, prompt);
      setAboutSuggestions(response.suggestions || []);
      setShowAboutSuggestions(response.suggestions?.length > 0);
    } catch (error) {
      console.error('Failed to fetch about suggestions:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !apiName.trim() || !about.trim()) {
      addToast('Please provide API name, description, and about section', 'error');
      return;
    }

    if (!profile) {
      addToast('Please sign in to generate APIs', 'error');
      return;
    }

    const isAdmin = profile.is_admin || false;

    if (!isAdmin) {
      if (profile.plan === 'free' && profile.api_generation_count >= 3) {
        setShowUpgradeModal(true);
        return;
      }

      if (profile.plan === 'pro' && profile.api_generation_count >= 20) {
        setShowUpgradeModal(true);
        return;
      }
    }

    setLoading(true);

    try {
      const codeData = await apiService.generateAPICode(prompt, apiName);

      const apiKey = `ak_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const apiId = crypto.randomUUID();
      const fastApiGatewayUrl = import.meta.env.VITE_FASTAPI_GATEWAY_URL || 'http://localhost:8000';
      const endpointUrl = `${fastApiGatewayUrl}/run/${apiId}`;

      const { data, error } = await supabase.from('apis').insert({
        id: apiId,
        user_id: profile.id,
        name: apiName,
        prompt: prompt,
        description: `Generated API: ${apiName}`,
        about: about,
        endpoint_url: endpointUrl,
        api_key: apiKey,
        status: 'active',
        code_snapshot: codeData.code,
      }).select().single();

      if (error) throw error;

      await apiService.deployAPI(apiId);

      await supabase
        .from('users')
        .update({ api_generation_count: profile.api_generation_count + 1 })
        .eq('id', profile.id);

      const parsedEndpoints = parseEndpointsFromCode(codeData.code);

      setGeneratedAPI({
        id: data.id,
        name: apiName,
        endpoint_url: endpointUrl,
        api_key: apiKey,
        description: `Generated API: ${apiName}`,
        endpoints: parsedEndpoints,
      });

      addToast('API generated and deployed successfully!', 'success');
      setPrompt('');
      setApiName('');
      setAbout('');
    } catch (err: any) {
      addToast(err.message || 'Failed to generate API', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    addToast('Copied to clipboard!', 'success');
  };

  const applyPromptSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    setShowPromptSuggestions(false);
  };

  const applyAboutSuggestion = (suggestion: string) => {
    setAbout(suggestion);
    setShowAboutSuggestions(false);
  };

  return (
    <>
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade Required"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                You've Reached Your Limit
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {profile?.plan === 'free'
                  ? "You've used all 3 API generations on the Free plan. Upgrade to Pro to generate up to 20 APIs per month, or Enterprise for unlimited generations."
                  : "You've used all 20 API generations on the Pro plan. Upgrade to Enterprise for unlimited API generations."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile?.plan === 'free' && (
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Pro Plan</h4>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Perfect for growing projects</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">$29<span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span></div>
                </div>
                <ul className="space-y-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    20 API generations/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Advanced analytics
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => window.location.href = '/billing'}
                >
                  Upgrade to Pro
                </Button>
              </div>
            )}

            <div className="border-2 border-purple-500 rounded-lg p-4 bg-purple-50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Enterprise Plan</h4>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">For teams and large projects</p>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">$99<span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span></div>
              </div>
              <ul className="space-y-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Unlimited API generations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  24/7 dedicated support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Custom integrations
                </li>
              </ul>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => window.location.href = '/billing'}
              >
                Upgrade to Enterprise
              </Button>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Maybe later
            </button>
          </div>
        </div>
      </Modal>

    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-3">
              <Sparkles className="w-9 h-9 text-blue-600 dark:text-blue-500" />
              Generate Your API
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Describe what you want your API to do, and we'll build it for you
            </p>
          </div>
          {profile && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 px-6 py-3 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Generations Used {profile.is_admin && <span className="text-green-600 dark:text-green-400 font-semibold">(Admin - Unlimited)</span>}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {profile.is_admin
                  ? `${profile.api_generation_count} / ∞`
                  : `${profile.api_generation_count} / ${profile.plan === 'free' ? 3 : profile.plan === 'pro' ? 20 : '∞'}`
                }
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Describe Your API
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tell us what your API should do in plain English
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                label="API Name"
                placeholder="e.g., Weather Notification Service"
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                className="text-lg"
              />

              <div className="relative">
                <Textarea
                  label="What should your API do?"
                  placeholder="Example: An API that sends SMS alerts when specific events occur, with rate limiting and authentication. It should accept webhook payloads, validate them, and trigger notifications to users..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={8}
                  className="text-base"
                />

                {showPromptSuggestions && promptSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        AI Suggested Prompts
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {promptSuggestions.slice(0, 3).map((suggestion, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => applyPromptSuggestion(suggestion)}
                          className="w-full text-left p-3 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200 group"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                            {suggestion}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="relative">
                <Textarea
                  label="About (for marketplace)"
                  placeholder="A brief description of what your API does for the community..."
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={3}
                  className="text-base"
                />

                {showAboutSuggestions && aboutSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border border-green-200 dark:border-green-800 rounded-lg space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-500" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        AI Suggested About Descriptions
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {aboutSuggestions.slice(0, 3).map((suggestion, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => applyAboutSuggestion(suggestion)}
                          className="w-full text-left p-3 bg-white dark:bg-gray-900 hover:bg-green-50 dark:hover:bg-green-950/50 border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200 group"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-green-700 dark:group-hover:text-green-400">
                            {suggestion}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Pro tip:</strong> Type at least 3 words in each field to see AI-powered suggestions from Claude.
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                isLoading={loading}
                className="w-full text-lg py-6 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                disabled={!prompt.trim() || !apiName.trim() || !about.trim()}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating & Deploying...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate API
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {generatedAPI && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl bg-gradient-to-br from-white to-green-50/30 dark:from-gray-900 dark:to-green-950/20">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center animate-pulse">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Your API is Live!
                    </h2>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Successfully deployed and ready to use
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Name
                  </h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {generatedAPI.name}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Endpoint URL
                  </h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
                      {generatedAPI.endpoint_url}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedAPI.endpoint_url)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
                      {generatedAPI.api_key}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedAPI.api_key)}
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {generatedAPI.endpoints && generatedAPI.endpoints.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Available Endpoints
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {generatedAPI.endpoints.map((endpoint, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              endpoint.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {endpoint.method}
                            </span>
                            <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                              {endpoint.path}
                            </code>
                          </div>
                          {endpoint.summary && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {endpoint.summary}
                            </p>
                          )}
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                              Show example
                            </summary>
                            <div className="mt-2 bg-gray-900 dark:bg-black rounded p-3 overflow-x-auto">
                              <pre className="text-xs text-gray-100">
                                <code>{formatCurlExample(generatedAPI.endpoint_url, endpoint, generatedAPI.api_key)}</code>
                              </pre>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  View in Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!generatedAPI && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <CardContent className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Ready to Generate
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  Fill in the form and click Generate to create your API. It will appear here once ready.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
};
