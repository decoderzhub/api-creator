import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StreamingCodeViewer } from '../ui/StreamingCodeViewer';
import * as LucideIcons from 'lucide-react';
import React from 'react';
import { API_BASE_URL } from '../../lib/endpoints';
import { supabase } from '../../lib/supabase';
import * as Babel from '@babel/standalone';

interface StreamingDynamicTestUIProps {
  apiId: string;
  apiName: string;
  apiUrl: string;
  apiKey: string;
  code: string;
}

export const StreamingDynamicTestUI: React.FC<StreamingDynamicTestUIProps> = ({
  apiId,
  apiName,
  apiUrl,
  apiKey,
  code,
}) => {
  const [componentCode, setComponentCode] = useState<string>('');
  const [streamedCode, setStreamedCode] = useState<string>('');
  const [finalCode, setFinalCode] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCodeView, setShowCodeView] = useState(true);

  const fetchTestUIStream = useCallback(async () => {
    try {
      setLoading(true);
      setIsStreaming(true);
      setError(null);
      setStreamedCode('');
      setFinalCode('');
      setShowCodeView(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/generate-test-ui-stream`, {
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
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to generate test UI`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedCode = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'chunk') {
                  accumulatedCode += data.content;
                  setStreamedCode(accumulatedCode);
                } else if (data.type === 'complete') {
                  setFinalCode(data.componentCode);
                  setComponentCode(data.componentCode);
                  setIsStreaming(false);
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error generating test UI:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate custom test interface');
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  }, [code, apiName, apiId, apiUrl]);

  useEffect(() => {
    fetchTestUIStream();
  }, [fetchTestUIStream]);

  const DynamicComponent = useMemo(() => {
    if (!componentCode) return null;

    try {
      const transformedCode = Babel.transform(componentCode, {
        presets: ['react', 'typescript'],
        filename: 'dynamic-component.tsx',
      }).code;

      const CustomAPITest = eval(`
        (function() {
          ${transformedCode}
          return CustomAPITest;
        })()
      `);

      return () => (
        <CustomAPITest
          apiUrl={apiUrl}
          apiKey={apiKey}
          LucideIcons={LucideIcons}
          React={React}
        />
      );
    } catch (err: any) {
      console.error('Component compilation error:', err);
      setError(`Component Error: ${err.message}`);
      return null;
    }
  }, [componentCode, apiUrl, apiKey]);

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3 text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to generate test interface</p>
            <p className="text-sm mt-1 text-red-500 dark:text-red-300">{error}</p>
          </div>
        </div>
        <Button onClick={fetchTestUIStream} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle View Button */}
      {finalCode && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCodeView(!showCodeView)}
            variant="outline"
            size="sm"
          >
            {showCodeView ? 'Hide Code' : 'Show Code'}
          </Button>
        </div>
      )}

      {/* Streaming Code Viewer */}
      {showCodeView && (
        <StreamingCodeViewer
          isStreaming={isStreaming}
          streamedCode={streamedCode}
          finalCode={finalCode}
          language="tsx"
        />
      )}

      {/* Generated Component */}
      {DynamicComponent && !showCodeView && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Interactive API Test Interface
            </h3>
          </div>
          <DynamicComponent />
        </Card>
      )}

      {/* Regenerate Button */}
      {finalCode && (
        <div className="flex justify-center pt-2">
          <Button onClick={fetchTestUIStream} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Interface
          </Button>
        </div>
      )}
    </div>
  );
};
