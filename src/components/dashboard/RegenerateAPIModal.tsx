import { useState } from 'react';
import { X, RefreshCw, Sparkles, FileCode, Wrench } from 'lucide-react';
import { Button } from '../ui/Button';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface RegenerateAPIModalProps {
  apiId: string;
  apiName: string;
  originalPrompt: string;
  currentCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegenerateAPIModal({
  apiId,
  apiName,
  originalPrompt,
  currentCode,
  onClose,
  onSuccess
}: RegenerateAPIModalProps) {
  const [selectedOption, setSelectedOption] = useState<'json' | 'improve' | 'custom'>('json');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');

  const regenerationOptions = [
    {
      id: 'json' as const,
      icon: FileCode,
      title: 'Convert to JSON + Base64',
      description: 'Convert file uploads to use JSON with base64 encoding for better reliability',
      prompt: `Convert this API to use JSON with base64-encoded files instead of multipart/form-data.

Requirements:
- Use Pydantic BaseModel for all requests
- Convert file uploads to base64-encoded string fields (e.g., image_data: str)
- Keep all other parameters as typed fields in the model
- Use JSON request/response format
- Maintain all existing functionality

This pattern is more reliable through proxies and easier to debug.`,
      color: 'blue'
    },
    {
      id: 'improve' as const,
      icon: Sparkles,
      title: 'Improve & Modernize',
      description: 'Update code with better error handling, validation, and best practices',
      prompt: `Improve this API code with modern best practices:

- Add comprehensive error handling with helpful messages
- Add input validation with clear error responses
- Improve docstrings and comments
- Add logging for debugging
- Optimize performance where possible
- Keep all existing functionality working
- Maintain the same endpoints and parameters`,
      color: 'purple'
    },
    {
      id: 'custom' as const,
      icon: Wrench,
      title: 'Custom Changes',
      description: 'Describe specific changes you want made to the API',
      prompt: '',
      color: 'green'
    }
  ];

  const selectedConfig = regenerationOptions.find(opt => opt.id === selectedOption)!;

  const handleRegenerate = async () => {
    const prompt = selectedOption === 'custom' ? customPrompt : selectedConfig.prompt;

    if (!prompt.trim()) {
      setError('Please describe what changes you want');
      return;
    }

    try {
      setIsRegenerating(true);
      setError('');

      // Use the troubleshoot endpoint to regenerate
      const response = await apiService.troubleshootAPI(
        apiId,
        currentCode,
        originalPrompt,
        prompt
      );

      const fixedCode = response.fixed_code;

      if (!fixedCode) {
        throw new Error('Failed to generate new code');
      }

      // Update the API code in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('apis')
        .update({
          code_snapshot: fixedCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', apiId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Deploy the updated API
      await apiService.deployAPI(apiId);

      // Success!
      onSuccess();

    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate API');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Regenerate API Code
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {apiName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isRegenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose how you want to regenerate this API:
          </p>

          {/* Options */}
          <div className="space-y-3">
            {regenerationOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOption === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  disabled={isRegenerating}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      isSelected ? `text-${option.color}-600 dark:text-${option.color}-400` : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-1 ${
                        isSelected ? `text-${option.color}-900 dark:text-${option.color}-100` : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom prompt textarea */}
          {selectedOption === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Describe the changes you want:
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Example: Add a new /convert-to-png endpoint that converts images to PNG format..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[120px] text-sm"
                disabled={isRegenerating}
              />
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> This will regenerate your API code and rebuild the Docker container.
              The process may take 30-60 seconds. Your API will be temporarily unavailable during the rebuild.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating || (selectedOption === 'custom' && !customPrompt.trim())}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate API
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
