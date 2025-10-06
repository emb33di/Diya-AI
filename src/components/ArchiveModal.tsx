import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SchoolArchiveService, ArchivedSchool } from "@/services/schoolArchiveService";
import { X, RotateCcw, Trash2, Calendar, MapPin, Users, GraduationCap, Loader2 } from "lucide-react";

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolRestored: () => void;
}

const ArchiveModal = ({ isOpen, onClose, onSchoolRestored }: ArchiveModalProps) => {
  const [archivedSchools, setArchivedSchools] = useState<ArchivedSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringSchoolId, setRestoringSchoolId] = useState<string | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch archived schools when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchArchivedSchools();
    }
  }, [isOpen]);

  const fetchArchivedSchools = async () => {
    setLoading(true);
    try {
      const result = await SchoolArchiveService.getArchivedSchools();
      if (result.success) {
        setArchivedSchools(result.schools);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load archived schools",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[SCHOOLS_ERROR] Failed to load archived schools:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot see their archived schools'
      });
      toast({
        title: "Error",
        description: "Failed to load archived schools",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (schoolId: string, category: 'reach' | 'target' | 'safety') => {
    setRestoringSchoolId(schoolId);
    try {
      const result = await SchoolArchiveService.restoreSchool(schoolId, category);
      if (result.success) {
        // School restored successfully
        onSchoolRestored();
        onClose();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[SCHOOLS_ERROR] Failed to restore school:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolId: schoolId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot restore school from archive'
      });
      toast({
        title: "Error",
        description: "Failed to restore school",
        variant: "destructive"
      });
    } finally {
      setRestoringSchoolId(null);
    }
  };

  const handlePermanentDelete = async (schoolId: string) => {
    if (!confirm('Are you sure you want to permanently delete this school? This action cannot be undone.')) {
      return;
    }

    setDeletingSchoolId(schoolId);
    try {
      const result = await SchoolArchiveService.permanentlyDeleteSchool(schoolId);
      if (result.success) {
        // School permanently deleted
        // Remove from local state
        setArchivedSchools(prev => prev.filter(school => school.id !== schoolId));
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[SCHOOLS_ERROR] Failed to delete school permanently:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolId: schoolId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot permanently delete school from archive'
      });
      toast({
        title: "Error",
        description: "Failed to delete school",
        variant: "destructive"
      });
    } finally {
      setDeletingSchoolId(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'reach': return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white";
      case 'target': return "bg-gradient-to-r from-blue-500 to-purple-600 text-white";
      case 'safety': return "bg-gradient-to-r from-green-500 to-emerald-600 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Archived Schools</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading archived schools...</span>
              </div>
            </div>
          ) : archivedSchools.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2" />
              <p>No archived schools found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedSchools.map((school) => (
                <Card key={school.id} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{school.school_name}</CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{school.school_type || 'University'}</span>
                        </div>
                      </div>
                      <Badge className={getCategoryColor(school.category)}>
                        <span className="capitalize">{school.category}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <GraduationCap className="h-3 w-3 text-muted-foreground" />
                      <span>Rank: #{school.school_ranking || 'N/A'}</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Archived: {formatDate(school.archived_at)}
                    </div>
                    
                    {school.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span>
                        <p className="text-muted-foreground mt-1 text-xs line-clamp-2">{school.notes}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Select onValueChange={(value: 'reach' | 'target' | 'safety') => handleRestore(school.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Restore to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reach">Reach</SelectItem>
                          <SelectItem value="target">Target</SelectItem>
                          <SelectItem value="safety">Safety</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePermanentDelete(school.id)}
                        disabled={deletingSchoolId === school.id}
                      >
                        {deletingSchoolId === school.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
