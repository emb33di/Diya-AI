import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Bot, FileText, ChevronDown, RefreshCw } from 'lucide-react';
import { EssayVersionService, EssayCheckpoint } from '@/services/essayVersionService';
import { useToast } from '@/components/ui/use-toast';

interface EssayVersionSelectorProps {
  essayId: string;
  currentVersion?: EssayCheckpoint;
  allVersions: EssayCheckpoint[];
  onVersionChange: (version: EssayCheckpoint) => void;
  onFreshDraft: () => void;
  className?: string;
}

const EssayVersionSelector: React.FC<EssayVersionSelectorProps> = ({
  essayId,
  currentVersion,
  allVersions,
  onVersionChange,
  onFreshDraft,
  className = ''
}) => {
  const [versions, setVersions] = useState<EssayCheckpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Use allVersions prop instead of loading internally
  useEffect(() => {
    setVersions(allVersions);
  }, [allVersions]);

  // Update selected version when currentVersion changes
  useEffect(() => {
    if (currentVersion) {
      setSelectedVersionId(currentVersion.id);
    }
  }, [currentVersion]);


  const handleVersionSelect = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return;

      await EssayVersionService.switchToVersion(versionId);
      setSelectedVersionId(versionId);
      onVersionChange(version);
      
      toast({
        title: "Version Switched",
        description: `Switched to ${version.version_name || `Version ${version.version_number}`}`
      });
    } catch (error) {
      console.error('Error switching version:', error);
      toast({
        title: "Error",
        description: "Failed to switch to selected version",
        variant: "destructive"
      });
    }
  };


  // Helper function to determine if a version has newer versions
  const hasNewerVersions = (version: EssayCheckpoint) => {
    return allVersions.some(v => v.version_number > version.version_number);
  };

  const getVersionIcon = (version: EssayCheckpoint) => {
    if (version.is_fresh_draft) {
      return <FileText className="h-4 w-4" />;
    } else if (version.has_ai_feedback) {
      return <Bot className="h-4 w-4" />;
    } else {
      return <Clock className="h-4 w-4" />;
    }
  };

  const getVersionBadgeColor = (version: EssayCheckpoint) => {
    if (version.is_active) {
      return "bg-primary text-primary-foreground";
    } else if (version.has_ai_feedback) {
      return "bg-blue-100 text-blue-800";
    } else if (version.is_fresh_draft) {
      return "bg-green-100 text-green-800";
    } else {
      return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWordCount = (content: string) => {
    return content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  };

  if (versions.length === 0 && !loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          onClick={onFreshDraft}
          variant="outline"
          size="sm"
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Create New Version</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Version Selector */}
      <Select value={selectedVersionId || ''} onValueChange={handleVersionSelect}>
        <SelectTrigger className="w-32 sm:w-48">
          <SelectValue placeholder="Select version">
            {currentVersion && (
              <div className="flex items-center space-x-2">
                {getVersionIcon(currentVersion)}
                <span className="truncate hidden sm:inline">
                  {currentVersion.version_name || `Version ${currentVersion.version_number}`}
                </span>
                <span className="truncate sm:hidden">
                  {currentVersion.version_number}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {versions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              <div className="flex items-center space-x-2 w-full">
                {getVersionIcon(version)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">
                      {version.version_name || `Version ${version.version_number}`}
                    </span>
                    <Badge className={`${getVersionBadgeColor(version)} text-xs`}>
                      {version.is_active && !hasNewerVersions(version) 
                        ? 'Active' 
                        : hasNewerVersions(version) 
                          ? 'Read-only (Newer version exists)' 
                          : version.has_ai_feedback 
                            ? 'AI Feedback (Read-only)' 
                            : 'Draft (Read-only)'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(version.created_at)} • {getWordCount(version.essay_content)} words
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* New Version Button */}
      <Button
        onClick={onFreshDraft}
        variant="outline"
        size="sm"
        className="flex items-center"
      >
        <RefreshCw className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">New Version</span>
      </Button>

    </div>
  );
};

export default EssayVersionSelector;
