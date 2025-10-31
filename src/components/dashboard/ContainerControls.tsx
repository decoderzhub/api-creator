import { useState, useEffect } from 'react';
import { Server, Play, Square, RefreshCw, Box, Network } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiService } from '../../lib/api';

interface ContainerControlsProps {
  apiId: string;
  onContainerUpdate?: () => void;
}

interface ContainerInfo {
  exists: boolean;
  name?: string;
  id?: string;
  status?: string;
  host_port?: number;
  internal_port?: number;
  image?: string;
  error?: string;
}

export function ContainerControls({ apiId, onContainerUpdate }: ContainerControlsProps) {
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'stop' | 'start' | null>(null);
  const [error, setError] = useState('');

  const fetchContainerInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getContainerInfo(apiId);
      setContainerInfo(response.container);
    } catch (err) {
      console.error('Failed to fetch container info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch container info');
      setContainerInfo({ exists: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [apiId]);

  const handleStop = async () => {
    try {
      setActionLoading('stop');
      setError('');
      await apiService.stopContainer(apiId);
      await fetchContainerInfo();
      if (onContainerUpdate) onContainerUpdate();
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
      await apiService.startContainer(apiId);
      await fetchContainerInfo();
      if (onContainerUpdate) onContainerUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start container');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'restarting':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'exited':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  if (loading && !containerInfo) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading container info...</span>
        </div>
      </Card>
    );
  }

  if (!containerInfo?.exists) {
    return (
      <Card className="p-4 border-gray-700/50 bg-gray-800/30">
        <div className="flex items-start gap-3">
          <Box className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-400 mb-1">Container Not Deployed</h3>
            <p className="text-xs text-gray-500">Deploy this API to start a container</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-blue-500/20 bg-blue-500/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-1">Docker Container</h3>
              <p className="text-xs text-gray-400">Live container information and controls</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchContainerInfo}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Container Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2">
            <div className="text-gray-500 mb-1">Container Name</div>
            <code className="block px-2 py-1.5 bg-gray-800 rounded text-blue-400 break-all font-mono text-[10px]">
              {containerInfo.name || 'N/A'}
            </code>
          </div>

          <div>
            <div className="text-gray-500 mb-1">Container ID</div>
            <code className="block px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono text-[10px]">
              {containerInfo.id || 'N/A'}
            </code>
          </div>

          <div>
            <div className="text-gray-500 mb-1">Status</div>
            <span className={`inline-block px-2 py-1 rounded border text-[10px] font-medium ${getStatusColor(containerInfo.status)}`}>
              {containerInfo.status || 'unknown'}
            </span>
          </div>

          <div>
            <div className="text-gray-500 mb-1 flex items-center gap-1">
              <Network className="w-3 h-3" />
              Host Port
            </div>
            <code className="block px-2 py-1 bg-gray-800 rounded text-green-400 font-mono text-[10px]">
              {containerInfo.host_port || 'N/A'}
            </code>
          </div>

          <div>
            <div className="text-gray-500 mb-1 flex items-center gap-1">
              <Network className="w-3 h-3" />
              Container Port
            </div>
            <code className="block px-2 py-1 bg-gray-800 rounded text-green-400 font-mono text-[10px]">
              {containerInfo.internal_port || 8000}
            </code>
          </div>

          <div className="col-span-2">
            <div className="text-gray-500 mb-1">Image</div>
            <code className="block px-2 py-1 bg-gray-800 rounded text-gray-400 break-all font-mono text-[10px]">
              {containerInfo.image || 'N/A'}
            </code>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-700">
          {containerInfo.status === 'running' ? (
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
              Start Container
            </Button>
          )}
        </div>

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
