import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, List, ChevronDown, ChevronUp, Code, Play, BookmarkX } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { API } from '../../lib/types';
import { parseEndpointsFromCode, formatCurlExample } from '../../lib/endpoints';

interface SavedAPICardProps {
  savedApi: {
    id: string;
    user_id: string;
    api_id: string;
    user_api_key: string | null;
    created_at: string;
    apis: API;
  };
  isExpanded: boolean;
  userApiKey: string | null;
  generatingKey: boolean;
  canViewCode: boolean;
  onToggleExpand: () => void;
  onViewCode: (api: API) => void;
  onUnsave: (savedApiId: string) => void;
  onGenerateUserKey: () => void;
  onCopyToClipboard: (text: string) => void;
}

export const SavedAPICard = ({
  savedApi,
  isExpanded,
  userApiKey,
  generatingKey,
  canViewCode,
  onToggleExpand,
  onViewCode,
  onUnsave,
  onGenerateUserKey,
  onCopyToClipboard,
}: SavedAPICardProps) => {
  const { apis: api } = savedApi;
  const endpoints = api.code_snapshot ? parseEndpointsFromCode(api.code_snapshot) : [];
  const displayApiKey = userApiKey || 'Generate API Key below';

  return (
    <motion.div
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

          {endpoints.length > 0 && (
            <div className="mb-3">
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <List className="w-4 h-4" />
                {endpoints.length} Endpoint{endpoints.length !== 1 ? 's' : ''} Available
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800"
                >
                  {endpoints.map((endpoint, idx) => {
                    const curlExample = formatCurlExample(api.endpoint_url, endpoint, displayApiKey);
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
                              {endpoint.parameters.map((param: any, paramIdx: number) => (
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
                            onClick={() => onCopyToClipboard(curlExample)}
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
          )}

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Endpoint</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono text-gray-900 dark:text-gray-100">
                  {api.endpoint_url}
                </code>
                <Button size="sm" variant="ghost" onClick={() => onCopyToClipboard(api.endpoint_url)}>
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
                  <Button size="sm" variant="ghost" onClick={() => onCopyToClipboard(userApiKey)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {canViewCode && api.code_snapshot && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewCode(api)}
              >
                <Code className="w-4 h-4 mr-2" />
                View Code
              </Button>
            )}
            {!userApiKey ? (
              <Button
                size="sm"
                onClick={onGenerateUserKey}
                disabled={generatingKey}
              >
                {generatingKey ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating...
                  </>
                ) : (
                  'Generate API Key'
                )}
              </Button>
            ) : null}
            <Button size="sm" variant="danger" onClick={() => onUnsave(savedApi.id)}>
              <BookmarkX className="w-4 h-4 mr-2" />
              Unsave
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
