import { useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Terminal, Wrench } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ContainerTroubleshooterProps {
  apiId: string;
  apiName: string;
  originalCode: string;
  originalPrompt: string;
  containerStatus?: string;
  onFixApplied?: () => void;
}

export function ContainerTroubleshooter({
  apiId,
  apiName,
  originalCode,
  originalPrompt,
  containerStatus,
  onFixApplied
}: ContainerTroubleshooterProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixStatus, setFixStatus] = useState<'idle' | 'analyzing' | 'fixing' | 'deploying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [logs, setLogs] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const isContainerFailing = containerStatus === 'restarting' || containerStatus === 'exited' || containerStatus === 'error';

  const handleAutoFix = async () => {
    try {
      setIsFixing(true);
      setFixStatus('analyzing');
      setErrorMessage('');

      // Step 1: Get container logs
      const logsResponse = await apiService.getContainerLogs(apiId, 200);
      const containerLogs = logsResponse.logs || '';
      setLogs(containerLogs);

      if (!containerLogs || containerLogs.includes('Container for API')) {
        throw new Error('Could not retrieve container logs. Container may not be deployed yet.');
      }

      // Step 2: Diagnose the issue
      const diagnosis = await apiService.diagnoseAPI(apiId);
      console.log('Diagnosis:', diagnosis);

      // Step 3: Use AI to fix the code
      setFixStatus('fixing');
      const fixResponse = await apiService.troubleshootAPI(
        apiId,
        originalCode,
        originalPrompt,
        containerLogs
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

      // Step 5: Redeploy the API
      await apiService.deployAPI(apiId);

      // Success!
      setFixStatus('success');

      // Notify parent component
      if (onFixApplied) {
        setTimeout(() => {
          onFixApplied();
        }, 2000);
      }

    } catch (error) {
      console.error('Auto-fix error:', error);
      setFixStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fix the API');
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = () => {
    switch (fixStatus) {
      case 'analyzing':
        return <Terminal className="w-4 h-4 animate-pulse" />;
      case 'fixing':
        return <Wrench className="w-4 h-4 animate-pulse" />;
      case 'deploying':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusMessage = () => {
    switch (fixStatus) {
      case 'analyzing':
        return 'Analyzing container logs...';
      case 'fixing':
        return 'AI is generating a fix...';
      case 'deploying':
        return 'Deploying fixed code...';
      case 'success':
        return 'Container fixed and redeployed successfully!';
      case 'error':
        return errorMessage || 'Failed to fix the container';
      default:
        return 'Container is experiencing issues';
    }
  };

  if (!isContainerFailing && fixStatus === 'idle') {
    return null;
  }

  return (
    <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-400 mb-1">
            {fixStatus === 'idle' && 'Container Error Detected'}
            {fixStatus === 'success' && 'Container Fixed'}
            {fixStatus === 'error' && 'Fix Failed'}
            {['analyzing', 'fixing', 'deploying'].includes(fixStatus) && 'Fixing Container...'}
          </h3>

          <p className="text-xs text-gray-400 mb-3">
            {getStatusMessage()}
          </p>

          {fixStatus === 'idle' && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleAutoFix}
                disabled={isFixing}
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
              >
                <Wrench className="w-3 h-3 mr-2" />
                Auto-Fix with AI
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs"
              >
                <Terminal className="w-3 h-3 mr-2" />
                {showLogs ? 'Hide Logs' : 'View Logs'}
              </Button>
            </div>
          )}

          {fixStatus === 'success' && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              Your API should be working now. Refreshing diagnostics...
            </div>
          )}

          {fixStatus === 'error' && (
            <div className="space-y-2">
              <p className="text-xs text-red-400">{errorMessage}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAutoFix}
                  disabled={isFixing}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Try Again
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-xs"
                >
                  <Terminal className="w-3 h-3 mr-2" />
                  {showLogs ? 'Hide Logs' : 'View Logs'}
                </Button>
              </div>
            </div>
          )}

          {showLogs && logs && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-2">Container Logs</div>
              <div className="bg-black/40 rounded p-3 max-h-64 overflow-y-auto">
                <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                  {logs}
                </pre>
              </div>
            </div>
          )}

          {['analyzing', 'fixing', 'deploying'].includes(fixStatus) && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse"
                     style={{
                       width: fixStatus === 'analyzing' ? '33%' : fixStatus === 'fixing' ? '66%' : '100%',
                       transition: 'width 0.5s ease-in-out'
                     }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span className={fixStatus === 'analyzing' ? 'text-yellow-400' : 'text-gray-400'}>
                  Analyzing
                </span>
                <span className={fixStatus === 'fixing' ? 'text-yellow-400' : 'text-gray-400'}>
                  Fixing
                </span>
                <span className={fixStatus === 'deploying' ? 'text-yellow-400' : 'text-gray-400'}>
                  Deploying
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
