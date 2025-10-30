import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, RefreshCw, Sparkles, Save, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StreamingCodeViewer } from '../ui/StreamingCodeViewer';
import * as LucideIcons from 'lucide-react';
import React from 'react';
import { API_BASE_URL } from '../../lib/endpoints';
import { supabase } from '../../lib/supabase';
import * as Babel from '@babel/standalone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [autoRetry, setAutoRetry] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [savedComponentId, setSavedComponentId] = useState<string | null>(null);
  const [hasSavedComponent, setHasSavedComponent] = useState(false);
  const maxRetries = 3;

  const fetchTestUIStream = useCallback(async (isRetry = false, errorContext: string | null = null, attemptNumber: number = 0) => {
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

      const requestBody: any = {
        code,
        apiName,
        apiId,
        endpointUrl: apiUrl,
      };

      // Include error context if this is a retry
      if (isRetry && errorContext) {
        requestBody.previousError = errorContext;
        requestBody.retryAttempt = attemptNumber;
      }

      const response = await fetch(`${API_BASE_URL}/generate-test-ui-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate custom test interface';
      setError(errorMessage);
      setLastError(errorMessage);
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  }, [code, apiName, apiId, apiUrl]);

  // Load saved component on mount
  useEffect(() => {
    let isMounted = true;

    const loadSavedComponent = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No session, generating new component');
          if (isMounted) fetchTestUIStream();
          return;
        }

        const response = await fetch(`${API_BASE_URL}/load-test-ui/${apiId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          console.log('Failed to load saved component, generating new one');
          if (isMounted) fetchTestUIStream();
          return;
        }

        const result = await response.json();
        if (result.success && result.componentCode) {
          console.log('Loaded saved component from database');
          if (isMounted) {
            setComponentCode(result.componentCode);
            setFinalCode(result.componentCode);
            setSavedComponentId(result.componentId);
            setHasSavedComponent(true);
            setLoading(false);
            setIsStreaming(false);
          }
        } else {
          console.log('No saved component found, generating new one');
          if (isMounted) fetchTestUIStream();
        }
      } catch (err) {
        console.error('Failed to load saved component:', err);
        if (isMounted) fetchTestUIStream();
      }
    };

    loadSavedComponent();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiId]);

  const [compilationError, setCompilationError] = useState<string | null>(null);

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
      setCompilationError(null);

      return () => (
        <CustomAPITest
          apiUrl={apiUrl}
          apiKey={apiKey}
          LucideIcons={LucideIcons}
          React={React}
          ReactMarkdown={ReactMarkdown}
          remarkGfm={remarkGfm}
        />
      );
    } catch (err: any) {
      console.error('Component compilation error:', err);
      console.error('Component code that failed:', componentCode.substring(0, 500));
      const errorMessage = `Component Error: ${err.message}`;
      setCompilationError(errorMessage);
      return null;
    }
  }, [componentCode, apiUrl, apiKey]);

  // Auto-save component when successfully compiled
  useEffect(() => {
    const saveComponent = async () => {
      if (componentCode && !compilationError && !isStreaming && DynamicComponent) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const response = await fetch(`${API_BASE_URL}/save-test-ui`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              apiId,
              componentCode,
              codeSnapshot: code,
            }),
          });

          const result = await response.json();
          if (result.success) {
            console.log('Component saved to database');
            setSavedComponentId(result.componentId);
            setHasSavedComponent(true);
          }
        } catch (err) {
          console.error('Failed to save component:', err);
        }
      }
    };

    saveComponent();
  }, [componentCode, compilationError, isStreaming, DynamicComponent, apiId, code]);

  // Handle auto-retry in a separate effect
  useEffect(() => {
    if (compilationError && autoRetry && retryCount < maxRetries && !isStreaming) {
      console.log(`Auto-retrying (${retryCount + 1}/${maxRetries}) due to error:`, compilationError);
      setLastError(compilationError);

      const timer = setTimeout(() => {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        fetchTestUIStream(true, compilationError, nextRetry);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [compilationError, autoRetry, retryCount, isStreaming]);

  const displayError = error || compilationError;

  if (displayError && (!autoRetry || retryCount >= maxRetries)) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3 text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to generate test interface</p>
            <p className="text-sm mt-1 text-red-500 dark:text-red-300">{displayError}</p>
            {retryCount > 0 && (
              <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                Attempted {retryCount} {retryCount === 1 ? 'retry' : 'retries'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => {
            setRetryCount(0);
            setLastError(null);
            setCompilationError(null);
            setError(null);
            fetchTestUIStream(false, null, 0);
          }} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRetry}
              onChange={(e) => setAutoRetry(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            Auto-retry on error
          </label>
        </div>
      </Card>
    );
  }

  // Show retry in progress
  if (compilationError && autoRetry && retryCount < maxRetries) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3 text-orange-600 dark:text-orange-400 mb-4">
          <RefreshCw className="w-5 h-5 mt-0.5 flex-shrink-0 animate-spin" />
          <div className="flex-1">
            <p className="font-medium">Retrying with error context...</p>
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              Attempt {retryCount + 1}/{maxRetries}
            </p>
            <p className="text-xs mt-2 text-gray-500 dark:text-gray-500">
              Previous error: {compilationError}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRetry}
            onChange={(e) => setAutoRetry(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 cursor-pointer"
          />
          Auto-retry on error
        </label>
      </Card>
    );
  }


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
            {retryCount > 0 && (
              <p className="text-xs mt-2 text-gray-500 dark:text-gray-500">
                Retry attempt {retryCount}/{maxRetries}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Show interactive component after generation is complete */}
      {!isStreaming && finalCode && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Interactive API Test Interface
                </h3>
                {hasSavedComponent && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </div>
                )}
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

          {/* Regenerate Button and Settings */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button onClick={() => {
              setRetryCount(0);
              setLastError(null);
              fetchTestUIStream(false, null, 0);
            }} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Interface
            </Button>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={autoRetry}
                onChange={(e) => setAutoRetry(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Auto-retry on error
            </label>
          </div>
        </>
      )}
    </div>
  );
};
