import { useState } from 'react';
import { Play, Square, RefreshCw, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiService } from '../../lib/api';

interface ContainerControlsProps {
  apiId: string;
  containerStatus?: string;
  onContainerUpdate?: () => void;
}

export function ContainerControls({ apiId, containerStatus, onContainerUpdate }: ContainerControlsProps) {
  const [actionLoading, setActionLoading] = useState<'stop' | 'start' | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleStop = async () => {
    try {
      setActionLoading('stop');
      setError('');
      setSuccessMessage('');
      await apiService.stopContainer(apiId);
      setSuccessMessage('Container stopped successfully');
      if (onContainerUpdate) {
        setTimeout(() => onContainerUpdate(), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop container');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async () => {
    try {
      setActionLoading('start');
      setError('');
      setSuccessMessage('');
      await apiService.startContainer(apiId);
      setSuccessMessage('Container started successfully');
      if (onContainerUpdate) {
        setTimeout(() => onContainerUpdate(), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start container');
    } finally {
      setActionLoading(null);
    }
  };

  const isRunning = containerStatus === 'running';
  const isStopped = containerStatus === 'exited' || !containerStatus;

  return (
    <Card className="p-4 border-blue-500/20 bg-blue-500/5">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-400">Container Controls</h3>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {isRunning ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStop}
              disabled={actionLoading === 'stop'}
              className="flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {actionLoading === 'stop' ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Square className="w-3 h-3 mr-2" />
              )}
              Stop Container
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={actionLoading === 'start'}
              className="flex-1 text-xs bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'start' ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Play className="w-3 h-3 mr-2" />
              )}
              {isStopped ? 'Start Container' : 'Restart Container'}
            </Button>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2">
            {successMessage}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}
