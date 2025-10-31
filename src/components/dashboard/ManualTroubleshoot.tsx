import { useState } from 'react';
import { MessageSquare, Send, RefreshCw, Wrench, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ManualTroubleshootProps {
  apiId: string;
  apiName: string;
  originalCode: string;
  originalPrompt: string;
  onFixApplied?: () => void;
}

export function ManualTroubleshoot({
  apiId,
  apiName,
  originalCode,
  originalPrompt,
  onFixApplied
}: ManualTroubleshootProps) {
  const [errorDescription, setErrorDescription] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [fixStatus, setFixStatus] = useState<'idle' | 'analyzing' | 'fixing' | 'deploying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [containerLogs, setContainerLogs] = useState('');

  const handleManualFix = async () => {
    if (!errorDescription.trim()) {
      setErrorMessage('Please describe the error or issue you\'re experiencing');
      return;
    }

    try {
      setIsFixing(true);
      setFixStatus('analyzing');
      setErrorMessage('');

      // Step 1: Get container logs (optional context)
      try {
        const logsResponse = await apiService.getContainerLogs(apiId, 200);
        setContainerLogs(logsResponse.logs || '');
      } catch (err) {
        console.log('Could not fetch logs, continuing without them');
      }

      // Step 2: Combine user description with logs
      const errorContext = `User Description:\n${errorDescription}\n\n${containerLogs ? `Container Logs:\n${containerLogs}` : ''}`;

      // Step 3: Use AI to fix the code based on user description
      setFixStatus('fixing');
      const fixResponse = await apiService.troubleshootAPI(
        apiId,
        originalCode,
        originalPrompt,
        errorContext
      );

      const fixedCode = fixResponse.fixed_code;

      if (!fixedCode) {
        throw new Error('AI could not generate a fix for this error');
      }

      // Step 4: Update the API with fixed code
      setFixStatus('deploying');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update the API code in database
      const { error: updateError } = await supabase
        .from('apis')
        .update({
          code_snapshot: fixedCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', apiId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Step 5: Redeploy the API with fixed code
      await apiService.deployAPI(apiId);

      // Success!
      setFixStatus('success');
      setErrorDescription(''); // Clear the text area

      // Notify parent component
      if (onFixApplied) {
        setTimeout(() => {
          onFixApplied();
        }, 2000);
      }

    } catch (error) {
      console.error('Manual fix error:', error);
      setFixStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fix the API');
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = () => {
    switch (fixStatus) {
      case 'analyzing':
        return <MessageSquare className="w-4 h-4 animate-pulse" />;
      case 'fixing':
        return <Wrench className="w-4 h-4 animate-pulse" />;
      case 'deploying':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusMessage = () => {
    switch (fixStatus) {
      case 'analyzing':
        return 'Analyzing your error description...';
      case 'fixing':
        return 'AI is generating a fix...';
      case 'deploying':
        return 'Deploying fixed code...';
      case 'success':
        return 'Fix applied and deployed successfully!';
      case 'error':
        return errorMessage || 'Failed to apply fix';
      default:
        return '';
    }
  };

  return (
    <Card className="p-4 border-purple-500/20 bg-purple-500/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-purple-400 mb-1">
              Manual Error Troubleshooting
            </h3>
            <p className="text-xs text-gray-400">
              Describe the error or issue you're experiencing, and AI will attempt to fix it
            </p>
          </div>
        </div>

        {/* Status Message */}
        {fixStatus !== 'idle' && (
          <div className={`text-xs p-2 rounded ${
            fixStatus === 'success' ? 'bg-green-500/10 text-green-400' :
            fixStatus === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-purple-500/10 text-purple-400'
          }`}>
            {getStatusMessage()}
          </div>
        )}

        {/* Error Description Text Area */}
        {fixStatus === 'idle' && (
          <div className="space-y-2">
            <label htmlFor="error-description" className="text-xs text-gray-400 block">
              Error Description
            </label>
            <textarea
              id="error-description"
              value={errorDescription}
              onChange={(e) => setErrorDescription(e.target.value)}
              placeholder="Describe the error you're seeing... For example:&#10;- API returns 500 error when I send a POST request&#10;- Image processing endpoint fails with 'module not found'&#10;- Container keeps restarting with import errors"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 min-h-[120px] resize-y font-mono"
              disabled={isFixing}
            />
            <div className="text-[10px] text-gray-500">
              💡 Tip: Include details like error messages, which endpoint is failing, and what you were trying to do
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {fixStatus === 'idle' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleManualFix}
              disabled={isFixing || !errorDescription.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="w-3 h-3 mr-2" />
              Fix This Error
            </Button>
          </div>
        )}

        {/* Success State */}
        {fixStatus === 'success' && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-3 h-3" />
            Your API should be working now. Refreshing diagnostics...
          </div>
        )}

        {/* Error State */}
        {fixStatus === 'error' && (
          <div className="space-y-2">
            <p className="text-xs text-red-400">{errorMessage}</p>
            <Button
              size="sm"
              onClick={() => setFixStatus('idle')}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        {['analyzing', 'fixing', 'deploying'].includes(fixStatus) && (
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 animate-pulse"
                   style={{
                     width: fixStatus === 'analyzing' ? '33%' : fixStatus === 'fixing' ? '66%' : '100%',
                     transition: 'width 0.5s ease-in-out'
                   }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span className={fixStatus === 'analyzing' ? 'text-purple-400' : 'text-gray-400'}>
                Analyzing
              </span>
              <span className={fixStatus === 'fixing' ? 'text-purple-400' : 'text-gray-400'}>
                Fixing
              </span>
              <span className={fixStatus === 'deploying' ? 'text-purple-400' : 'text-gray-400'}>
                Deploying
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
