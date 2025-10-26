import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import * as LucideIcons from 'lucide-react';
import React from 'react';

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

  useEffect(() => {
    const fetchTestUI = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/generate-test-ui`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              code,
              apiName,
              apiId,
              endpointUrl: apiUrl,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          console.error('API Error:', response.status, errorData);
          throw new Error(errorData.detail || `HTTP ${response.status}: Failed to generate test UI`);
        }

        const data = await response.json();
        console.log('Generated component code length:', data.componentCode?.length);
        setComponentCode(data.componentCode);
      } catch (err) {
        console.error('Error generating test UI:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate custom test interface');
      } finally {
        setLoading(false);
      }
    };

    fetchTestUI();
  }, [apiId, code, apiName, apiUrl]);

  const DynamicComponent = useMemo(() => {
    if (!componentCode) return null;

    try {
      // Create a safe execution context with required dependencies
      const componentFunction = new Function(
        'React',
        'useState',
        'useEffect',
        'LucideIcons',
        'apiUrl',
        'apiKey',
        `
        ${componentCode}

        // Return the component (look for export or default export)
        if (typeof CustomAPITest !== 'undefined') {
          return CustomAPITest;
        }

        // Fallback: try to find any component definition
        const match = \`${componentCode}\`.match(/(?:export\\s+)?(?:const|function)\\s+(\\w+)/);
        if (match && typeof eval(match[1]) !== 'undefined') {
          return eval(match[1]);
        }

        throw new Error('No component found in generated code');
        `
      );

      const Component = componentFunction(
        React,
        useState,
        useEffect,
        LucideIcons,
        apiUrl,
        apiKey
      );

      return Component;
    } catch (err) {
      console.error('Error creating dynamic component:', err);
      setError(`Failed to render component: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }, [componentCode, apiUrl, apiKey]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center space-x-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating custom test interface...</span>
        </div>
      </Card>
    );
  }

  if (error || !DynamicComponent) {
    const isConfigError = error?.includes('500') || error?.includes('not configured');

    return (
      <Card className="p-6 border-yellow-900/20 bg-yellow-950/20">
        <div className="flex items-start space-x-3 text-yellow-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
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
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <DynamicComponent apiUrl={apiUrl} apiKey={apiKey} />
    </div>
  );
};
