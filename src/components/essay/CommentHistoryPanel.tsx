import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  AlertTriangle,
  Star,
  FileText,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { CommentHistoryService, CheckpointCommentSummary, CommentHistoryComparison } from '@/services/commentHistoryService';

interface CommentHistoryPanelProps {
  essayId: string;
  onCheckpointSelect?: (checkpointId: string) => void;
}

const CommentHistoryPanel: React.FC<CommentHistoryPanelProps> = ({
  essayId,
  onCheckpointSelect
}) => {
  const [history, setHistory] = useState<CheckpointCommentSummary[]>([]);
  const [comparison, setComparison] = useState<CommentHistoryComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommentHistory();
  }, [essayId]);

  const loadCommentHistory = async () => {
    try {
      setLoading(true);
      const historyData = await CommentHistoryService.getCommentHistory(essayId);
      setHistory(historyData);
      
      // If we have at least 2 versions, compare the latest with the previous
      if (historyData.length >= 2) {
        const latest = historyData[historyData.length - 1];
        const previous = historyData[historyData.length - 2];
        
        const comparisonData = await CommentHistoryService.compareCheckpoints(
          essayId,
          latest.checkpointId,
          previous.checkpointId
        );
        setComparison(comparisonData);
      }
    } catch (error) {
      console.error('Error loading comment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckpointSelect = (checkpointId: string) => {
    setSelectedCheckpoint(checkpointId);
    onCheckpointSelect?.(checkpointId);
  };

  const toggleCheckpointExpansion = (checkpointId: string) => {
    const newExpanded = new Set(expandedCheckpoints);
    if (newExpanded.has(checkpointId)) {
      newExpanded.delete(checkpointId);
    } else {
      newExpanded.add(checkpointId);
    }
    setExpandedCheckpoints(newExpanded);
  };

  const getProgressIcon = (progress: 'improving' | 'maintaining' | 'declining') => {
    switch (progress) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getProgressColor = (progress: 'improving' | 'maintaining' | 'declining') => {
    switch (progress) {
      case 'improving':
        return 'bg-green-100 text-green-800';
      case 'declining':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Comment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading comment history...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Comment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            No comment history available yet. Generate AI feedback to see version history.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comparison Summary */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600">Current Version</h4>
                <p className="text-2xl font-bold">{comparison.currentVersion.versionNumber}</p>
                <p className="text-sm text-gray-500">{comparison.currentVersion.commentCount} comments</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-600">Previous Version</h4>
                <p className="text-2xl font-bold">{comparison.previousVersion.versionNumber}</p>
                <p className="text-sm text-gray-500">{comparison.previousVersion.commentCount} comments</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <Badge className={getProgressColor(comparison.summary.overallProgress)}>
                  <div className="flex items-center gap-1">
                    {getProgressIcon(comparison.summary.overallProgress)}
                    {comparison.summary.overallProgress}
                  </div>
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-600">{comparison.summary.newCommentsCount}</div>
                  <div className="text-gray-500">New</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">{comparison.summary.resolvedCommentsCount}</div>
                  <div className="text-gray-500">Resolved</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600">{comparison.summary.totalComments}</div>
                  <div className="text-gray-500">Total</div>
                </div>
              </div>
            </div>

            {comparison.improvements.improvedAreas.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-sm text-gray-600 mb-2">Improvements</h4>
                <div className="space-y-1">
                  {comparison.improvements.improvedAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {area}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((checkpoint, index) => (
              <div
                key={checkpoint.checkpointId}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedCheckpoint === checkpoint.checkpointId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCheckpointSelect(checkpoint.checkpointId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {expandedCheckpoints.has(checkpoint.checkpointId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">Version {checkpoint.versionNumber}</span>
                      {index === history.length - 1 && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(checkpoint.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {checkpoint.commentCount} comments
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCheckpointExpansion(checkpoint.checkpointId);
                      }}
                    >
                      {expandedCheckpoints.has(checkpoint.checkpointId) ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>
                </div>

                {expandedCheckpoints.has(checkpoint.checkpointId) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-green-500" />
                          <span>Strengths: {checkpoint.strengthsCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span>Areas for Improvement: {checkpoint.weaknessesCount}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span>Paragraph Comments: {checkpoint.paragraphCommentsCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Avg Confidence: {checkpoint.averageConfidenceScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentHistoryPanel;
