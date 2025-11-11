import React, { useState, useEffect } from 'react';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, Clock, Database } from 'lucide-react';
import { getSessionStorageSize, isStorageAvailable } from '@/lib/supabase/session-storage';

/**
 * Session Monitor Component
 * Visual dashboard for monitoring session health and storage
 * 
 * Usage: Add to your dev/admin pages for debugging
 * <SessionMonitor />
 */
const SessionMonitor: React.FC = () => {
  const {
    isRecovering,
    recoveryError,
    lastRecoveryAttempt,
    recoverSession,
    checkSessionHealth,
  } = useSessionRecovery();

  const [health, setHealth] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState({
    available: false,
    size: 0,
  });

  const refreshHealth = async () => {
    const healthData = await checkSessionHealth();
    setHealth(healthData);
  };

  const refreshStorage = () => {
    setStorageInfo({
      available: isStorageAvailable(),
      size: getSessionStorageSize(),
    });
  };

  useEffect(() => {
    refreshHealth();
    refreshStorage();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      refreshHealth();
      refreshStorage();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Session Monitor
        </CardTitle>
        <CardDescription>
          Real-time session health and storage monitoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Health */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Session Health</h3>
            <Badge variant={health?.healthy ? 'default' : 'destructive'}>
              {health?.healthy ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Healthy
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Unhealthy
                </>
              )}
            </Badge>
          </div>
          
          {health?.healthy && health?.timeUntilExpiry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Expires in: {formatTime(health.timeUntilExpiry)}
            </div>
          )}
          
          {health?.error && (
            <div className="text-sm text-destructive">
              Error: {health.error}
            </div>
          )}
        </div>

        {/* Storage Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Storage</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>Available: {storageInfo.available ? 'Yes' : 'No'}</div>
            <div>Session Size: {formatBytes(storageInfo.size)}</div>
          </div>
        </div>

        {/* Recovery Status */}
        {(isRecovering || recoveryError || lastRecoveryAttempt) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recovery Status</h3>
            {isRecovering && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Recovering session...
              </div>
            )}
            {recoveryError && (
              <div className="text-sm text-destructive">
                Last error: {recoveryError}
              </div>
            )}
            {lastRecoveryAttempt && !isRecovering && (
              <div className="text-sm text-muted-foreground">
                Last attempt: {lastRecoveryAttempt.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshHealth}
            disabled={isRecovering}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Health
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={recoverSession}
            disabled={isRecovering}
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recovering...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Recover Session
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionMonitor;

