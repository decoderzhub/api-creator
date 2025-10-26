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
          throw new Error('Failed to generate test UI');
        }

        const data = await response.json();
        setComponentCode(data.componentCode);
      } catch (err) {
        console.error('Error generating test UI:', err);
        setError('Failed to generate custom test interface');
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
    return (
      <Card className="p-6 border-red-900/20 bg-red-950/20">
        <div className="flex items-start space-x-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Unable to generate test interface</p>
            <p className="text-sm text-red-400/70 mt-1">
              {error || 'The component could not be rendered. Please try regenerating your API.'}
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
