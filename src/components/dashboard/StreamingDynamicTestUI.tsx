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
  const [showCodeView, setShowCodeView] = useState(false);

  const fetchTestUIStream = useCallback(async () => {
    try {
      setLoading(true);
      setIsStreaming(true);
      setError(null);
      setStreamedCode('');
      setFinalCode('');
      setShowCodeView(false);

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

      let receivedComplete = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed, accumulated code length:', accumulatedCode.length);
            break;
          }

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
                  console.log('Received complete event, component code length:', data.componentCode?.length);
                  receivedComplete = true;
                  setFinalCode(data.componentCode);
                  setComponentCode(data.componentCode);
                  setIsStreaming(false);
                  setLoading(false);
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

      console.log('Reader finished, receivedComplete:', receivedComplete);

      // Fallback: If stream ended but we never got complete event, process accumulated code
      if (!receivedComplete && accumulatedCode.length > 0) {
        console.log('Processing accumulated code as fallback');
        // Clean up the code
        let cleanedCode = accumulatedCode.trim();
        cleanedCode = cleanedCode.replace(/```tsx|```typescript|```jsx|```/g, '').trim();

        // Remove import/export statements
        const lines = cleanedCode.split('\n');
        const cleaned = lines.filter(line =>
          !line.trim().startsWith('import ') &&
          !line.trim().startsWith('export ')
        ).join('\n').trim();

        setFinalCode(cleaned);
        setComponentCode(cleaned);
        setIsStreaming(false);
        setLoading(false);
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
    if (!componentCode) {
      console.log('No componentCode available yet');
      return null;
    }

    console.log('Attempting to compile component, code length:', componentCode.length);

    try {
      const transformedCode = Babel.transform(componentCode, {
        presets: ['react', 'typescript'],
        filename: 'dynamic-component.tsx',
      }).code;

      console.log('Babel transformation successful');

      const CustomAPITest = eval(`
        (function() {
          ${transformedCode}
          return CustomAPITest;
        })()
      `);

      console.log('Component evaluated successfully');

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
      console.error('Component code that failed:', componentCode.substring(0, 500));
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

  console.log('Render state:', {
    isStreaming,
    hasComponentCode: !!componentCode,
    hasFinalCode: !!finalCode,
    hasDynamicComponent: !!DynamicComponent,
    loading
  });

  return (
    <div className="space-y-4">
      {/* Show streaming code viewer ONLY during generation */}
      {isStreaming && (
        <StreamingCodeViewer
          isStreaming={isStreaming}
          streamedCode={streamedCode}
          finalCode={finalCode}
          language="tsx"
        />
      )}

      {/* Show loading state */}
      {!isStreaming && !finalCode && loading && (
        <Card className="p-6">
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 dark:text-gray-400">Processing component...</p>
          </div>
        </Card>
      )}

      {/* Show interactive component after generation is complete */}
      {!isStreaming && finalCode && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Interactive API Test Interface
                </h3>
              </div>
              <Button
                onClick={() => setShowCodeView(!showCodeView)}
                variant="ghost"
                size="sm"
              >
                {showCodeView ? 'Hide Code' : 'View Code'}
              </Button>
            </div>

            {/* Toggle between component and code view */}
            {showCodeView ? (
              <div className="mt-4">
                <StreamingCodeViewer
                  isStreaming={false}
                  streamedCode=""
                  finalCode={finalCode}
                  language="tsx"
                />
              </div>
            ) : DynamicComponent ? (
              <DynamicComponent />
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-4" />
                <p>Failed to compile component. Click "View Code" to see the generated code.</p>
              </div>
            )}
          </Card>

          {/* Regenerate Button */}
          <div className="flex justify-center pt-2">
            <Button onClick={fetchTestUIStream} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Interface
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
