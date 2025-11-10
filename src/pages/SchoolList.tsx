import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/integrations/supabase/client";
import AddSchoolModal from "@/components/AddSchoolModal";
import ArchiveModal from "@/components/ArchiveModal";
import { fetchSchoolRecommendations, type SchoolRecommendation } from "@/utils/supabaseUtils";
import { useNavigate } from "react-router-dom";
import { SchoolArchiveService } from "@/services/schoolArchiveService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/utils/analytics";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  useDraggable,
} from '@dnd-kit/core';
import {
  CSS,
} from '@dnd-kit/utilities';

import { Plus, Star, Target, Shield, MapPin, Users, GraduationCap, X, FileText, Loader2, Archive, GripVertical, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface School {
  id: string;
  name: string;
  location: string;
  category: 'reach' | 'target' | 'safety';
  acceptanceRate: string;
  ranking: string;
  applicationDeadline: string;
  earlyActionDeadline?: string;
  earlyDecision1Deadline?: string;
  earlyDecision2Deadline?: string;
  regularDecisionDeadline?: string;
  notes: string;
  schoolType?: string | null;
  raw?: SchoolRecommendation;
}

const SchoolList = () => {
  const supabaseClient = supabase as SupabaseClient<any>;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [schoolToRemove, setSchoolToRemove] = useState<School | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    schoolId: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    schoolId: ''
  });
  const [activeSchool, setActiveSchool] = useState<School | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  // Drag and drop sensors - optimized for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle clicks outside context menu
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({
        visible: false,
        x: 0,
        y: 0,
        schoolId: ''
      });
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Fetch school recommendations from Supabase
  const fetchSchoolRecommendationsData = useCallback(async () => {
    if (!user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch school recommendations with timeout handling
      const { data: recommendations, error: fetchError } = await fetchSchoolRecommendations(user.id);

      if (fetchError) {
        const errorMessage = typeof fetchError === 'string' ? fetchError : 'Failed to load school recommendations';
        console.error('[SCHOOLS_ERROR] Failed to load school recommendations:', {
          userId: user?.id || 'unknown',
          userEmail: user?.email || 'unknown',
          error: errorMessage,
          timestamp: new Date().toISOString(),
          message: 'User cannot see their school list'
        });
        setError(errorMessage);
        return;
      }

      // Transform the data to match the UI format
      const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];

      const transformedSchools: School[] = safeRecommendations.map((rec) => ({
        id: rec.id,
        name: rec.school,
        location: formatSchoolTypeLabel(rec.school_type),
        category: (rec.category as 'reach' | 'target' | 'safety') ?? 'target',
        acceptanceRate: rec.acceptance_rate || 'N/A',
        ranking: rec.school_ranking || 'N/A',
        applicationDeadline: rec.first_round_deadline || 'TBD',
        earlyActionDeadline: rec.early_action_deadline || undefined,
        earlyDecision1Deadline: rec.early_decision_1_deadline || undefined,
        earlyDecision2Deadline: rec.early_decision_2_deadline || undefined,
        regularDecisionDeadline: rec.regular_decision_deadline || undefined,
        notes: rec.notes || rec.student_thesis || 'No notes available',
        schoolType: rec.school_type,
        raw: rec
      }));

      setSchools(transformedSchools);
    } catch (err) {
      console.error('[SCHOOLS_ERROR] Failed to load school recommendations:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot see their school list'
      });
      setError("Failed to load school recommendations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load all data on component mount - single useEffect pattern like Resume page
  useEffect(() => {
    if (user) {
      fetchSchoolRecommendationsData();
    }
  }, [user, fetchSchoolRecommendationsData]);


  const formatSchoolTypeLabel = (schoolType?: string | null) => {
    if (!schoolType) return 'University';
    
    // Handle special cases for proper display
    switch (schoolType.toLowerCase()) {
      case 'ivy_league':
        return 'Ivy League University';
      case 'liberal_arts':
        return 'Liberal Arts University';
      case 'research_university':
        return 'Research';
      default:
        return schoolType.charAt(0).toUpperCase() + schoolType.slice(1);
    }
  };

  const toggleExplanation = (schoolId: string) => {
    setExpandedExplanations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schoolId)) {
        newSet.delete(schoolId);
      } else {
        newSet.add(schoolId);
      }
      return newSet;
    });
  };

  const handleSchoolClick = (school: School) => {
    // Track school click event
    analytics.trackSchoolEvent('clicked', school.name, {
      category: school.category,
      school_type: school.schoolType ?? 'unknown',
      school_ranking: school.ranking,
      acceptance_rate: school.acceptanceRate
    });
    
    // Store the selected school in localStorage for the essays page
    localStorage.setItem('essays_selected_school', school.name);
    // Navigate to the essays page
    navigate('/essays');
  };

  const handleRightClick = (e: React.MouseEvent, schoolId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      schoolId: schoolId
    });
  };

  const handleContextMenuAction = async (action: string) => {
    if (action === 'archive') {
      const school = schools.find(s => s.id === contextMenu.schoolId);
      if (school) {
        handleRemoveSchoolClick(school);
      }
    }
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      schoolId: ''
    });
  };




  const addSchool = async (schoolData: any) => {
    try {
      if (!user) {
        console.error('[SCHOOLS_ERROR] User not authenticated:', {
          timestamp: new Date().toISOString(),
          message: 'User must be logged in to add schools to their list'
        });
        return;
      }

      // Check if school already exists in the user's list
      const existingSchool = schools.find(school => 
        school.name.toLowerCase() === schoolData.school.toLowerCase()
      );

      if (existingSchool) {
        toast({
          title: "School Already Added",
          description: `${schoolData.school} is already in your school list.`,
          variant: "default",
        });
        return;
      }

      // Create new school in database
      const insertData = {
        student_id: user.id,
        ...schoolData
      };
      const { data: newSchoolData, error } = await supabaseClient
        .from('school_recommendations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[SCHOOLS_ERROR] Failed to add school to database:', {
          userId: user.id,
          userEmail: user.email || 'unknown',
          schoolName: schoolData.school,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot add school to their list - database error'
        });
        return;
      }

      // Automatically sync regular decision deadline for the new school
      try {
        const { data: deadlineSyncData, error: deadlineSyncError } = await supabaseClient.functions.invoke('auto-sync-deadlines', {
          body: { user_id: user.id },
          headers: {
            Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
          }
        });

        if (deadlineSyncError) {
          console.warn('[SCHOOLS_WARNING] Failed to auto-sync deadline for new school:', {
            userId: user.id,
            userEmail: user.email || 'unknown',
            schoolName: newSchoolData.school,
            error: deadlineSyncError.message,
            timestamp: new Date().toISOString(),
            message: 'User school deadline was not automatically synced'
          });
        }
      } catch (deadlineError) {
        console.warn('[SCHOOLS_WARNING] Error during auto-sync deadline for new school:', {
          userId: user.id,
          userEmail: user.email || 'unknown',
          schoolName: newSchoolData.school,
          error: deadlineError instanceof Error ? deadlineError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          message: 'User school deadline sync failed'
        });
      }

      // Add to local state
      const newSchool: School = {
        id: newSchoolData.id,
        name: newSchoolData.school,
        location: formatSchoolTypeLabel(newSchoolData.school_type),
        category: (newSchoolData.category as 'reach' | 'target' | 'safety') ?? 'target',
        acceptanceRate: newSchoolData.acceptance_rate || 'N/A',
        ranking: newSchoolData.school_ranking || 'N/A',
        applicationDeadline: newSchoolData.first_round_deadline || 'TBD',
        earlyActionDeadline: newSchoolData.early_action_deadline || 'N/A',
        earlyDecision1Deadline: newSchoolData.early_decision_1_deadline || 'N/A',
        earlyDecision2Deadline: newSchoolData.early_decision_2_deadline || 'N/A',
        regularDecisionDeadline: newSchoolData.regular_decision_deadline || 'N/A',
        notes: newSchoolData.notes || newSchoolData.student_thesis || 'Add your notes here',
        schoolType: newSchoolData.school_type,
        raw: newSchoolData
      };
      
      setSchools([...schools, newSchool]);
      
      // Track school addition
      analytics.trackSchoolEvent('added', newSchoolData.school, {
        category: (newSchoolData.category as 'reach' | 'target' | 'safety') ?? undefined,
        school_type: newSchoolData.school_type,
        school_ranking: newSchoolData.school_ranking,
        acceptance_rate: newSchoolData.acceptance_rate,
        total_schools: schools.length + 1
      });
      
      // Track conversion milestone
      analytics.trackConversion('school_list_created', 1, {
        school_name: newSchoolData.school,
        school_category: newSchoolData.category
      });
    } catch (err) {
      console.error('[SCHOOLS_ERROR] Failed to add school:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolName: schoolData.school,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot add school to their list'
      });
    }
  };

  const addMultipleSchools = async (schoolsData: any[]) => {
    try {
      if (!user) {
        console.error('[SCHOOLS_ERROR] User not authenticated:', {
          timestamp: new Date().toISOString(),
          message: 'User must be logged in to add schools to their list'
        });
        return;
      }

      // Filter out schools that already exist in the user's list
      const existingSchoolNames = schools.map(school => school.name.toLowerCase());
      const newSchoolsData = schoolsData.filter(schoolData => 
        !existingSchoolNames.includes(schoolData.school.toLowerCase())
      );

      // Show feedback about duplicates
      const duplicateCount = schoolsData.length - newSchoolsData.length;
      if (duplicateCount > 0) {
        toast({
          title: "Some Schools Already Added",
          description: `${duplicateCount} school(s) were already in your list and were skipped.`,
          variant: "default",
        });
      }

      // If no new schools to add, return early
      if (newSchoolsData.length === 0) {
        return;
      }

      // Prepare data for bulk insert
      const insertData = newSchoolsData.map(schoolData => ({
        student_id: user.id,
        ...schoolData
      }));
      
      const { data: newSchoolsDataResult, error } = await supabaseClient
        .from('school_recommendations')
        .insert(insertData)
        .select();

      if (error) {
        console.error('[SCHOOLS_ERROR] Failed to add multiple schools to database:', {
          userId: user.id,
          userEmail: user.email || 'unknown',
          schoolCount: newSchoolsData.length,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot add multiple schools to their list - database error'
        });
        return;
      }

      // Automatically sync regular decision deadlines for the new schools
      try {
        const { data: deadlineSyncData, error: deadlineSyncError } = await supabaseClient.functions.invoke('auto-sync-deadlines', {
          body: { user_id: user.id },
          headers: {
            Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
          }
        });

        if (deadlineSyncError) {
          console.warn('[SCHOOLS_WARNING] Failed to auto-sync deadlines for new schools:', {
            userId: user.id,
            userEmail: user.email || 'unknown',
            schoolCount: newSchoolsData.length,
            error: deadlineSyncError.message,
            timestamp: new Date().toISOString(),
            message: 'User school deadlines were not automatically synced'
          });
        }
      } catch (deadlineError) {
        console.warn('[SCHOOLS_WARNING] Error during auto-sync deadlines for new schools:', {
          userId: user.id,
          userEmail: user.email || 'unknown',
          schoolCount: newSchoolsData.length,
          error: deadlineError instanceof Error ? deadlineError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          message: 'User school deadline sync failed'
        });
      }

      // Add to local state
      const newSchools: School[] = (newSchoolsDataResult ?? []).map(newSchoolData => ({
        id: newSchoolData.id,
        name: newSchoolData.school,
        location: formatSchoolTypeLabel(newSchoolData.school_type),
        category: (newSchoolData.category as 'reach' | 'target' | 'safety') ?? 'target',
        acceptanceRate: newSchoolData.acceptance_rate || 'N/A',
        ranking: newSchoolData.school_ranking || 'N/A',
        applicationDeadline: newSchoolData.first_round_deadline || 'TBD',
        earlyActionDeadline: newSchoolData.early_action_deadline || 'N/A',
        earlyDecision1Deadline: newSchoolData.early_decision_1_deadline || 'N/A',
        earlyDecision2Deadline: newSchoolData.early_decision_2_deadline || 'N/A',
        regularDecisionDeadline: newSchoolData.regular_decision_deadline || 'N/A',
        notes: newSchoolData.notes || newSchoolData.student_thesis || 'Add your notes here',
        schoolType: newSchoolData.school_type,
        raw: newSchoolData
      }));
      
      setSchools([...schools, ...newSchools]);

      // Schools added successfully
    } catch (err) {
      console.error('[SCHOOLS_ERROR] Failed to add multiple schools:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolCount: schoolsData.length,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot add multiple schools to their list'
      });
    }
  };

  const handleRemoveSchoolClick = (school: School) => {
    setSchoolToRemove(school);
    setShowRemoveConfirmDialog(true);
  };

  const removeSchool = async (id: string) => {
    try {
      // Archive the school instead of deleting
      const result = await SchoolArchiveService.archiveSchool(id);
      
      if (result.success) {
        // Remove from local state for responsive UI
        setSchools(schools.filter(school => school.id !== id));
        toast({
          title: "School Removed",
          description: "The school and its associated essays have been removed from your list.",
          variant: "default",
        });
      } else {
        setError(result.message || 'Failed to archive school');
        toast({
          title: "Error",
          description: result.message || 'Failed to remove school',
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('[SCHOOLS_ERROR] Failed to archive school:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolId: id,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot remove school from their list'
      });
      setError('Failed to archive school');
      toast({
        title: "Error",
        description: "Failed to remove school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowRemoveConfirmDialog(false);
      setSchoolToRemove(null);
    }
  };

  const handleConfirmRemove = () => {
    if (schoolToRemove) {
      removeSchool(schoolToRemove.id);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const school = schools.find(s => s.id === active.id);
    setActiveSchool(school || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Handle drag over events for visual feedback
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSchool(null);

    if (!over || !active) return;

    const schoolId = active.id as string;
    const newCategory = over.id as 'reach' | 'target' | 'safety';

    // Find the school being moved
    const school = schools.find(s => s.id === schoolId);
    if (!school || school.category === newCategory) return;

    // Optimistically update the UI
    setSchools(prevSchools => 
      prevSchools.map(s => 
        s.id === schoolId ? { ...s, category: newCategory } : s
      )
    );

    // Update in database
    try {
      const { error } = await supabaseClient
        .from('school_recommendations')
        .update({ category: newCategory })
        .eq('id', schoolId);

      if (error) {
        console.error('Error updating school category:', error);
        // Revert optimistic update
        setSchools(prevSchools => 
          prevSchools.map(s => 
            s.id === schoolId ? { ...s, category: school.category } : s
          )
        );
      }
    } catch (err) {
      console.error('Error updating school category:', err);
      // Revert optimistic update
      setSchools(prevSchools => 
        prevSchools.map(s => 
          s.id === schoolId ? { ...s, category: school.category } : s
        )
      );
    }
  };

  const reachSchools = schools.filter(s => s.category === 'reach');
  const targetSchools = schools.filter(s => s.category === 'target');
  const safetySchools = schools.filter(s => s.category === 'safety');

  // Draggable School Card Component
  const DraggableSchoolCard = ({ school }: { school: School }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({ id: school.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card 
        ref={setNodeRef}
        style={style}
        className={`shadow-md hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing group hover:scale-[1.01] lg:hover:scale-[1.02] ${
          school.category === 'reach' ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300/50' :
          school.category === 'target' ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300/50' :
          'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300/50'
        } ${isDragging ? 'shadow-2xl scale-105' : ''}`}
        {...attributes}
        {...listeners}
        onContextMenu={(e) => handleRightClick(e, school.id)}
      >
        <CardHeader className="pb-3 px-4 lg:px-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base lg:text-lg leading-tight">{school.name}</CardTitle>
              
              <div className="flex items-center space-x-2 text-xs lg:text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{school.location}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 lg:space-x-2 ml-2">
              {/* Drag indicator - hidden on mobile for cleaner look */}
              <div className="hidden lg:block p-1 opacity-50">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSchoolClick(school);
                }}
                className="h-8 w-8 p-0 touch-manipulation"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 px-4 lg:px-6">
          <div className="flex items-center space-x-2 text-xs lg:text-sm">
            <GraduationCap className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>Rank: {school.ranking || 'N/A'}</span>
          </div>
          
          {/* Only show "Why it's a good match" if user didn't skip onboarding */}
          {!profile?.skipped_onboarding && (
            <div className="text-xs lg:text-sm">
              <span className="font-medium">Why it's a good match:</span>
              <p className={`text-muted-foreground mt-1 ${expandedExplanations.has(school.id) ? '' : 'line-clamp-2'}`}>
                {school.notes}
              </p>
              {school.notes && school.notes.length > 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExplanation(school.id);
                  }}
                  className="text-primary hover:text-primary/80 text-xs mt-1 font-medium transition-colors"
                >
                  {expandedExplanations.has(school.id) ? 'See less' : 'See more'}
                </button>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-muted/50">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleSchoolClick(school);
              }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors p-2 h-auto touch-manipulation"
            >
              View essays →
            </Button>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <FileText className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Droppable Area Component for each category
  const DroppableArea = ({ category, children, isEmpty }: { category: 'reach' | 'target' | 'safety', children: React.ReactNode, isEmpty: boolean }) => {
    const { setNodeRef, isOver } = useDroppable({ id: category });

    return (
      <div 
        ref={setNodeRef}
        className={`space-y-3 lg:space-y-4 ${isEmpty ? 'min-h-0' : 'min-h-[150px]'} lg:min-h-[200px] p-3 lg:p-4 rounded-lg transition-colors ${
          isOver ? 'bg-primary/10 border-2 border-dashed border-primary' : ''
        }`}
      >
        {children}
      </div>
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading Schools</span>
            </div>
          </div>
        </main>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => {
                setError(null);
                setLoading(true);
                fetchSchoolRecommendationsData();
              }}>
                Try Again
              </Button>
            </div>
          </div>
        </main>
      </GradientBackground>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <GradientBackground>
          <main className="container mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-display font-bold mb-2">Schools</h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Drag and drop to organize your schools into Reach, Target, and Safety categories
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Button 
              onClick={() => setIsArchiveModalOpen(true)} 
              variant="outline"
              className="shadow-lg w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Archive
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="shadow-lg w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add School
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Reach Schools */}
          <div className={`${reachSchools.length === 0 ? 'lg:space-y-4' : 'space-y-4'}`}>
            <div className="flex items-center space-x-2 mb-4">
              <Star className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg lg:text-xl font-semibold">Reach Schools</h2>
              <Badge variant="secondary">{reachSchools.length}</Badge>
            </div>
            
            <DroppableArea category="reach" isEmpty={reachSchools.length === 0}>
              {reachSchools.map((school) => (
                <DraggableSchoolCard key={school.id} school={school} />
              ))}
            </DroppableArea>
          </div>

          {/* Target Schools */}
          <div className={`${targetSchools.length === 0 ? 'lg:space-y-4' : 'space-y-4'}`}>
            <div className="flex items-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg lg:text-xl font-semibold">Target Schools</h2>
              <Badge variant="secondary">{targetSchools.length}</Badge>
            </div>
            
            <DroppableArea category="target" isEmpty={targetSchools.length === 0}>
              {targetSchools.map((school) => (
                <DraggableSchoolCard key={school.id} school={school} />
              ))}
            </DroppableArea>
          </div>

          {/* Safety Schools */}
          <div className={`${safetySchools.length === 0 ? 'lg:space-y-4' : 'space-y-4'}`}>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-green-500" />
              <h2 className="text-lg lg:text-xl font-semibold">Safety Schools</h2>
              <Badge variant="secondary">{safetySchools.length}</Badge>
            </div>
            
            <DroppableArea category="safety" isEmpty={safetySchools.length === 0}>
              {safetySchools.map((school) => (
                <DraggableSchoolCard key={school.id} school={school} />
              ))}
            </DroppableArea>
          </div>
        </div>
      </main>
        </GradientBackground>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeSchool ? (
            <Card className="shadow-2xl scale-105 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{activeSchool.name}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{activeSchool.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <GraduationCap className="h-3 w-3 text-muted-foreground" />
                  <span>Rank: {activeSchool.ranking || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add School Modal */}
    <AddSchoolModal
      isOpen={isAddModalOpen}
      onClose={() => setIsAddModalOpen(false)}
      onAddSchool={addSchool}
      onAddMultipleSchools={addMultipleSchools}
      existingSchools={schools.map(school => school.name)}
    />

    {/* Archive Modal */}
    <ArchiveModal
      isOpen={isArchiveModalOpen}
      onClose={() => setIsArchiveModalOpen(false)}
      onSchoolRestored={() => {
        // Refresh the school list when a school is restored
        fetchSchoolRecommendationsData();
      }}
    />

    {/* Remove School Confirmation Dialog */}
    <AlertDialog open={showRemoveConfirmDialog} onOpenChange={setShowRemoveConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Remove School
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>"{schoolToRemove?.name}"</strong> from your school list?
            <br /><br />
            Any essays that you have written attached to this school will also be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowRemoveConfirmDialog(false);
            setSchoolToRemove(null);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmRemove}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove School
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Context Menu */}
    {contextMenu.visible && (
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
          onClick={() => handleContextMenuAction('archive')}
        >
          <Archive className="h-4 w-4" />
          <span>Move to Archive</span>
        </button>
      </div>
    )}
    </>
  );
};

export default SchoolList;