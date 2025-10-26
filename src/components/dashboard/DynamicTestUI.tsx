import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [error, setError] = useState<string>('');
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<string>('Initializing...');

  const fetchTestUI = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
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
          }),
        }
      );

      setGenerationProgress('Generating custom test interface...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to generate test UI`);
      }

      setGenerationProgress('Compiling component...');

      const data = await response.json();
      console.log('=== GENERATED COMPONENT CODE ===');
      console.log(data.componentCode);
      console.log('=== END COMPONENT CODE ===');
      console.log('Component code length:', data.componentCode?.length);

      setGenerationProgress('Loading interface...');
      setComponentCode(data.componentCode);
    } catch (err) {
      console.error('Error generating test UI:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate custom test interface');
    } finally {
      setLoading(false);
    }
  }, [apiId, code, apiName, apiUrl]);

  const handleRegenerate = () => {
    setRegenerateKey(prev => prev + 1);
    fetchTestUI();
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
      setError(`Failed to render component: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    const isConfigError = error?.includes('500') || error?.includes('not configured');

    return (
      <Card className="p-6 border-yellow-900/20 bg-yellow-950/20">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Custom test interface unavailable</p>
              <p className="text-sm text-yellow-400/70 mt-1">
                {error || 'The AI-generated component could not be rendered.'}
              </p>
              {isConfigError && (
                <p className="text-xs text-yellow-400/60 mt-2 italic">
                  Note: Dynamic test UI requires ANTHROPIC_API_KEY to be configured on the server.
                </p>
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
      <DynamicComponent apiUrl={apiUrl} apiKey={apiKey} />
    </div>
  );
};
