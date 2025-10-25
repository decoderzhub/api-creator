import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Code2, Sparkles, BookOpen, Download, Copy, Check, Loader2 } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';
import { supabase } from '../lib/supabase';
import {
  generateIntegration,
  generateSDK,
  getUserTemplates,
  type SavedIntegration,
  type IntegrationResponse
} from '../lib/api/integration';

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <pre className="!m-0 !p-4 !bg-gray-900 overflow-auto max-h-96">
      <code ref={codeRef} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};

interface API {
  id: string;
  name: string;
  description: string;
}

const LANGUAGES = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'typescript', label: 'TypeScript', icon: '💙' },
  { value: 'ruby', label: 'Ruby', icon: '💎' },
  { value: 'go', label: 'Go', icon: '🐹' },
  { value: 'php', label: 'PHP', icon: '🐘' },
  { value: 'curl', label: 'cURL', icon: '🌐' },
];

const INTEGRATION_TYPES = [
  { value: 'custom', label: 'Custom Integration', description: 'General purpose integration code', icon: '⚙️' },
  { value: 'salesforce', label: 'Salesforce', description: 'Sync with Salesforce CRM', icon: '☁️' },
  { value: 'slack', label: 'Slack', description: 'Send notifications to Slack', icon: '💬' },
  { value: 'github_actions', label: 'GitHub Actions', description: 'CI/CD workflow integration', icon: '🔄' },
  { value: 'google_sheets', label: 'Google Sheets', description: 'Export data to spreadsheets', icon: '📊' },
  { value: 'webhook', label: 'Webhook Handler', description: 'Receive webhook events', icon: '🔗' },
  { value: 'discord', label: 'Discord', description: 'Send messages to Discord', icon: '🎮' },
];

export default function IntegrationHelper() {
  const [searchParams] = useSearchParams();
  const apiIdFromUrl = searchParams.get('api_id');

  const [apis, setApis] = useState<API[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string>(apiIdFromUrl || '');
  const [description, setDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('python');
  const [integrationType, setIntegrationType] = useState('custom');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<IntegrationResponse | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedIntegration[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'sdk'>('generate');
  const [selectedSdkLanguages, setSelectedSdkLanguages] = useState<string[]>(['python', 'javascript']);
  const [generatedSdks, setGeneratedSdks] = useState<Record<string, IntegrationResponse> | null>(null);
  const [isGeneratingSDK, setIsGeneratingSDK] = useState(false);

  useEffect(() => {
    loadAPIs();
    if (selectedApiId) {
      loadTemplates(selectedApiId);
    }
  }, []);

  useEffect(() => {
    if (selectedApiId) {
      loadTemplates(selectedApiId);
    }
  }, [selectedApiId]);

  const loadAPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('id, name, description')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApis(data || []);
    } catch (error) {
      console.error('Failed to load APIs:', error);
    }
  };

  const loadTemplates = async (apiId: string) => {
    try {
      const templates = await getUserTemplates(apiId);
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedApiId || !description) {
      alert('Please select an API and describe what you want to do');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateIntegration({
        api_id: selectedApiId,
        description,
        target_language: targetLanguage,
        integration_type: integrationType,
        save_template: true
      });

      setGeneratedCode(result);
      if (selectedApiId) {
        loadTemplates(selectedApiId);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate integration code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSDK = async () => {
    if (!selectedApiId || selectedSdkLanguages.length === 0) {
      alert('Please select an API and at least one language');
      return;
    }

    setIsGeneratingSDK(true);
    try {
      const result = await generateSDK({
        api_id: selectedApiId,
        languages: selectedSdkLanguages
      });

      setGeneratedSdks(result.sdks);
    } catch (error) {
      console.error('SDK generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate SDK');
    } finally {
      setIsGeneratingSDK(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSDKLanguage = (lang: string) => {
    setSelectedSdkLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      ruby: 'rb',
      go: 'go',
      php: 'php',
      curl: 'sh'
    };
    return extensions[language] || 'txt';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Code2 className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Integration Assistant</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Generate production-ready integration code for your APIs
          </p>
        </div>

        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm w-fit mx-auto">
          {['generate', 'templates', 'sdk'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Your API
                </label>
                <select
                  value={selectedApiId}
                  onChange={(e) => setSelectedApiId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="">Choose an API...</option>
                  {apis.map((api) => (
                    <option key={api.id} value={api.id}>
                      {api.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Integration Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {INTEGRATION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setIntegrationType(type.value)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        integrationType === type.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{type.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Target Language
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setTargetLanguage(lang.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        targetLanguage === lang.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{lang.icon}</div>
                      <div className="text-xs text-gray-900 dark:text-white">{lang.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What do you want to do?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Send a Slack message whenever inventory goes below 10 items..."
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedApiId || !description}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Integration Code
                  </>
                )}
              </button>
            </div>

            <div className="space-y-6">
              {generatedCode ? (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-gray-900 dark:text-white font-medium">Generated Code</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {generatedCode.language}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(generatedCode.code)}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors"
                          title="Copy code"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDownload(generatedCode.code, `integration.${getFileExtension(generatedCode.language)}`)}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors"
                          title="Download code"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <CodeBlock
                      code={generatedCode.code}
                      language={generatedCode.language === 'curl' ? 'bash' : generatedCode.language}
                    />
                  </div>

                  {generatedCode.dependencies.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Dependencies
                      </h3>
                      <div className="space-y-2">
                        {generatedCode.dependencies.map((dep, idx) => (
                          <div key={idx} className="bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono">
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {generatedCode.setup_instructions && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-gray-900 dark:text-white font-medium mb-3">Setup Instructions</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-gray-700 dark:text-gray-300 text-sm overflow-x-auto whitespace-pre-wrap">
                          {generatedCode.setup_instructions}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-700 text-center">
                  <Code2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Generated code will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Saved Templates</h2>
            {savedTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-gray-900 dark:text-white font-medium">{template.template_name}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                        {template.target_language}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{template.description}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (template.code) handleCopy(template.code);
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        Copy Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Code2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No saved templates yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  Generate some integration code to get started
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sdk' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">SDK Generator</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select API
                </label>
                <select
                  value={selectedApiId}
                  onChange={(e) => setSelectedApiId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-700 focus:border-blue-500"
                >
                  <option value="">Choose an API...</option>
                  {apis.map((api) => (
                    <option key={api.id} value={api.id}>
                      {api.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Languages
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.filter(l => l.value !== 'curl').map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => toggleSDKLanguage(lang.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedSdkLanguages.includes(lang.value)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="text-3xl mb-2">{lang.icon}</div>
                      <div className="text-sm text-gray-900 dark:text-white">{lang.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateSDK}
                disabled={isGeneratingSDK || !selectedApiId || selectedSdkLanguages.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {isGeneratingSDK ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating SDKs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate SDKs
                  </>
                )}
              </button>
            </div>

            {generatedSdks && (
              <div className="space-y-4">
                {Object.entries(generatedSdks).map(([lang, sdk]) => (
                  <div key={lang} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-gray-900 dark:text-white font-medium capitalize">{lang} SDK</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(sdk.code)}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(sdk.code, `sdk.${getFileExtension(lang)}`)}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <CodeBlock code={sdk.code} language={lang} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
