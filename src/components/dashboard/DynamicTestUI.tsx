import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, MessageSquare, Send, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import * as LucideIcons from 'lucide-react';
import React from 'react';
import { API_BASE_URL } from '../../lib/endpoints';
import { supabase } from '../../lib/supabase';
import * as Babel from '@babel/standalone';

interface DynamicTestUIProps {
  apiId: string;
  apiName: string;
  apiUrl: string;
  apiKey: string;
  code: string;
}

export const DynamicTestUI: React.FC<DynamicTestUIProps> = ({
  apiId,
  apiName,
  apiUrl,
  apiKey,
  code,
}) => {
  const [componentCode, setComponentCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{message: string; troubleshooting?: string[]; stack_trace?: string} | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<string>('Initializing...');
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const fetchTestUI = useCallback(async (improvementRequest?: string, previousCode?: string) => {
    try {
      setLoading(true);
      setError(null);
      setGenerationProgress('Authenticating...');

      console.log('Fetching test UI from:', `${API_BASE_URL}/generate-test-ui`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      setGenerationProgress('Analyzing your API code...');

      const response = await fetch(
        `${API_BASE_URL}/generate-test-ui`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            code,
            apiName,
            apiId,
            endpointUrl: apiUrl,
            improvementRequest,
            previousCode: improvementRequest ? previousCode : undefined,
          }),
        }
      );

      setGenerationProgress('Generating custom test interface...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        const error: any = new Error(errorData.message || errorData.detail || `HTTP ${response.status}: Failed to generate test UI`);
        error.troubleshooting = errorData.troubleshooting;
        error.stack_trace = errorData.stack_trace;
        throw error;
      }

      setGenerationProgress('Compiling component...');

      const data = await response.json();
      console.log('=== GENERATED COMPONENT CODE ===');
      console.log(data.componentCode);
      console.log('=== END COMPONENT CODE ===');
      console.log('Component code length:', data.componentCode?.length);

      setGenerationProgress('Loading interface...');
      setComponentCode(data.componentCode);
    } catch (err: any) {
      console.error('Error generating test UI:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to generate custom test interface',
        troubleshooting: err?.troubleshooting,
        stack_trace: err?.stack_trace
      });
    } finally {
      setLoading(false);
    }
  }, [apiId, code, apiName, apiUrl]);

  const handleRegenerate = () => {
    setRegenerateKey(prev => prev + 1);
    fetchTestUI();
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage.trim();
    const currentCode = componentCode; // Capture current code before clearing
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      await fetchTestUI(userMessage, currentCode);
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: 'Test UI regenerated with your improvements!' }
      ]);
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: `Failed to apply changes: ${err instanceof Error ? err.message : 'Unknown error'}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    fetchTestUI();
  }, [fetchTestUI]);

  const DynamicComponent = useMemo(() => {
    if (!componentCode) return null;

    try {
      console.log('Attempting to create component function...');
      console.log('Transforming JSX with Babel...');

      // Transform JSX to plain JavaScript using Babel
      const transformed = Babel.transform(componentCode, {
        presets: ['react'],
        filename: 'component.jsx'
      });

      console.log('JSX transformed successfully');

      // Create a wrapper that provides the necessary context
      const wrappedCode = `
        (function(React, useState, useEffect, LucideIcons, apiUrl, apiKey) {
          ${transformed.code}

          return CustomAPITest;
        })
      `;

      console.log('Evaluating component code...');
      // Use indirect eval to execute in global scope
      const componentFactory = (0, eval)(wrappedCode);

      console.log('Component factory created, executing...');
      const Component = componentFactory(
        React,
        useState,
        useEffect,
        LucideIcons,
        apiUrl,
        apiKey
      );

      console.log('Component executed successfully:', typeof Component);
      return Component;
    } catch (err) {
      console.error('Error creating dynamic component:', err);
      console.error('Component code that failed:', componentCode);
      setError({
        message: `Failed to render component: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
      return null;
    }
  }, [componentCode, apiUrl, apiKey]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Generating custom test interface...</span>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-500">{generationProgress}</p>
            <p className="text-xs text-slate-600 mt-2">This may take 10-30 seconds...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !DynamicComponent) {
    const errorMessage = error?.message || '';
    const isConfigError = errorMessage.includes('500') || errorMessage.includes('not configured');

    return (
      <Card className="p-6 border-yellow-900/20 bg-yellow-950/20">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Custom test interface unavailable</p>
              <p className="text-sm text-yellow-400/70 mt-1">
                {error?.message || 'The AI-generated component could not be rendered.'}
              </p>
              {isConfigError && (
                <p className="text-xs text-yellow-400/60 mt-2 italic">
                  Note: Dynamic test UI requires ANTHROPIC_API_KEY to be configured on the server.
                </p>
              )}
              {error?.troubleshooting && error.troubleshooting.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs">
                  <p className="font-semibold text-yellow-300 mb-2">💡 Troubleshooting Tips:</p>
                  <ul className="space-y-1 text-yellow-400/80">
                    {error.troubleshooting.map((tip, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {error?.stack_trace && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-yellow-400/60 hover:text-yellow-400">
                    Show stack trace
                  </summary>
                  <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto text-[10px] text-yellow-400/50">
                    {error.stack_trace}
                  </pre>
                </details>
              )}
              <p className="text-xs text-yellow-400/60 mt-2">
                Use the "Test Endpoint" buttons above or test via curl/Postman.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={loading}
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Try Again
                </>
              )}
            </Button>
            <span className="text-xs text-yellow-400/60">
              {isConfigError ? 'Retry after configuring API key' : 'Generate a new test interface'}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Custom test interface loaded</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowChat(!showChat)}
            className="text-xs"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Improve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRegenerate}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </div>
      </div>
      {showChat && (
        <Card className="p-4 border-blue-900/20 bg-blue-950/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Improve Test UI</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {chatHistory.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded ${
                      msg.role === 'user'
                        ? 'bg-blue-900/30 text-blue-200 ml-4'
                        : 'bg-slate-800/50 text-slate-300 mr-4'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                placeholder="e.g., 'make input text black' or 'fix the endpoint URL'"
                disabled={chatLoading || loading}
                className="flex-1 px-3 py-2 text-sm bg-slate-900/50 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Button
                size="sm"
                onClick={handleChatSubmit}
                disabled={!chatMessage.trim() || chatLoading || loading}
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Describe what you want to change and the AI will regenerate the test UI.
            </p>
          </div>
        </Card>
      )}
      <DynamicComponent apiUrl={apiUrl} apiKey={apiKey} />
    </div>
  );
};
