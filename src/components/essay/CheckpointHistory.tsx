import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, RotateCcw, Eye, GitBranch } from 'lucide-react';
import { AICommentService } from '@/services/aiCommentService';
import { formatDistanceToNow } from 'date-fns';

interface Checkpoint {
  id: string;
  checkpointNumber: number;
  essayTitle?: string;
  totalComments: number;
  overallComments: number;
  inlineComments: number;
  averageQualityScore: number;
  isActive: boolean;
  createdAt: string;
}

interface CheckpointHistoryProps {
  essayId: string;
  onCheckpointSelect?: (checkpoint: Checkpoint) => void;
  onCheckpointRestore?: (checkpoint: Checkpoint) => void;
}

export const CheckpointHistory: React.FC<CheckpointHistoryProps> = ({
  essayId,
  onCheckpointSelect,
  onCheckpointRestore
}) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCheckpoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const checkpointData = await AICommentService.listCheckpoints(essayId);
      setCheckpoints(checkpointData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkpoints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckpoints();
  }, [essayId]);

  const handleRestoreCheckpoint = async (checkpoint: Checkpoint) => {
    try {
      await AICommentService.restoreCheckpoint(essayId, checkpoint.id);
      await loadCheckpoints(); // Reload to update active status
      onCheckpointRestore?.(checkpoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore checkpoint');
    }
  };

  const handleViewCheckpoint = async (checkpoint: Checkpoint) => {
    try {
      const checkpointData = await AICommentService.getCheckpoint(essayId, checkpoint.id);
      onCheckpointSelect?.(checkpoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkpoint');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Checkpoint History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading checkpoints...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Checkpoint History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button onClick={loadCheckpoints} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Checkpoint History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No checkpoints yet. Generate AI feedback to create your first checkpoint.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Checkpoint History ({checkpoints.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checkpoints.map((checkpoint) => (
          <div
            key={checkpoint.id}
            className={`p-3 rounded-lg border ${
              checkpoint.isActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={checkpoint.isActive ? 'default' : 'secondary'}>
                    Checkpoint {checkpoint.checkpointNumber}
                  </Badge>
                  {checkpoint.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(checkpoint.createdAt), { addSuffix: true })}
                    </span>
                    <span>{checkpoint.totalComments} comments</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <span>{checkpoint.overallComments} overall</span>
                    <span>{checkpoint.inlineComments} inline</span>
                    <span>Quality: {(checkpoint.averageQualityScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewCheckpoint(checkpoint)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                
                {!checkpoint.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestoreCheckpoint(checkpoint)}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
