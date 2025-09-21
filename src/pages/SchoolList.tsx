import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OnboardingGuard from "@/components/OnboardingGuard";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/integrations/supabase/client";
import AddSchoolModal from "@/components/AddSchoolModal";
import ArchiveModal from "@/components/ArchiveModal";
import { fetchSchoolRecommendations } from "@/utils/supabaseUtils";
import { useNavigate } from "react-router-dom";
import { SchoolArchiveService } from "@/services/schoolArchiveService";
import { useToast } from "@/hooks/use-toast";
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

import { Plus, Star, Target, Shield, MapPin, Users, GraduationCap, X, FileText, Loader2, Archive, GripVertical } from "lucide-react";

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
}

const SchoolList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
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

  // Drag and drop sensors
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
  const fetchSchoolRecommendationsData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Fetch school recommendations with timeout handling
      const { data: recommendations, error } = await fetchSchoolRecommendations(user.id);

      if (error) {
        console.error('Error fetching school recommendations:', error);
        setError(error);
        return;
      }

      // Transform the data to match the UI format
      const transformedSchools: School[] = recommendations.map((rec, index) => ({
        id: rec.id,
        name: rec.school,
        location: capitalizeSchoolType(rec.school_type), // Capitalize school type
        category: rec.category as 'reach' | 'target' | 'safety',
        acceptanceRate: rec.acceptance_rate || 'N/A',
        ranking: rec.school_ranking || 'N/A',
        applicationDeadline: rec.first_round_deadline || 'TBD',
        earlyActionDeadline: rec.early_action_deadline || 'N/A',
        earlyDecision1Deadline: rec.early_decision_1_deadline || 'N/A',
        earlyDecision2Deadline: rec.early_decision_2_deadline || 'N/A',
        regularDecisionDeadline: rec.regular_decision_deadline || 'N/A',
        notes: rec.notes || rec.student_thesis || 'No notes available'
      }));

      console.log('Fetched recommendations:', recommendations);
      console.log('Transformed schools:', transformedSchools);
      setSchools(transformedSchools);
    } catch (err) {
      console.error('Error fetching school recommendations:', err);
      setError("Failed to load school recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolRecommendationsData();
  }, []);


  const capitalizeSchoolType = (schoolType: string) => {
    if (!schoolType) return 'University';
    return schoolType.charAt(0).toUpperCase() + schoolType.slice(1) + ' University';
  };

  const handleSchoolClick = (school: School) => {
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
      await removeSchool(contextMenu.schoolId);
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
      console.log('addSchool called with data:', schoolData);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }
      console.log('Current user:', user.id);

      // Check if school already exists in the user's list
      const existingSchool = schools.find(school => 
        school.name.toLowerCase() === schoolData.school.toLowerCase()
      );

      if (existingSchool) {
        console.log('School already exists in list:', schoolData.school);
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
      console.log('Inserting data:', insertData);
      
      const { data: newSchoolData, error } = await supabase
        .from('school_recommendations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error adding school:', error);
        return;
      }

      console.log('Successfully added school:', newSchoolData);

      // Automatically sync regular decision deadline for the new school
      try {
        console.log('Starting auto-sync for new school:', newSchoolData.school);
        const { data: deadlineSyncData, error: deadlineSyncError } = await supabase.functions.invoke('auto-sync-deadlines', {
          body: { user_id: user.id },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          }
        });

        console.log('Auto-sync response:', { deadlineSyncData, deadlineSyncError });

        if (deadlineSyncError) {
          console.warn('Failed to auto-sync deadline for new school:', deadlineSyncError.message);
        } else {
          console.log('Auto-synced deadline for new school:', deadlineSyncData);
        }
      } catch (deadlineError) {
        console.warn('Error during auto-sync deadline for new school:', deadlineError);
      }

      // Add to local state
      const newSchool: School = {
        id: newSchoolData.id,
        name: newSchoolData.school,
        location: capitalizeSchoolType(newSchoolData.school_type),
        category: newSchoolData.category as 'reach' | 'target' | 'safety',
        acceptanceRate: newSchoolData.acceptance_rate || 'N/A',
        ranking: newSchoolData.school_ranking || 'N/A',
        applicationDeadline: newSchoolData.first_round_deadline || 'TBD',
        earlyActionDeadline: newSchoolData.early_action_deadline || 'N/A',
        earlyDecision1Deadline: newSchoolData.early_decision_1_deadline || 'N/A',
        earlyDecision2Deadline: newSchoolData.early_decision_2_deadline || 'N/A',
        regularDecisionDeadline: newSchoolData.regular_decision_deadline || 'N/A',
        notes: newSchoolData.notes || newSchoolData.student_thesis || 'Add your notes here'
      };
      
      console.log('Adding to local state:', newSchool);
      setSchools([...schools, newSchool]);
    } catch (err) {
      console.error('Error adding school:', err);
    }
  };

  const addMultipleSchools = async (schoolsData: any[]) => {
    try {
      console.log('addMultipleSchools called with data:', schoolsData);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }
      console.log('Current user:', user.id);

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
        console.log('No new schools to add after filtering duplicates');
        return;
      }

      // Prepare data for bulk insert
      const insertData = newSchoolsData.map(schoolData => ({
        student_id: user.id,
        ...schoolData
      }));
      
      console.log('Inserting multiple schools:', insertData);
      
      const { data: newSchoolsDataResult, error } = await supabase
        .from('school_recommendations')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Error adding multiple schools:', error);
        return;
      }

      console.log('Successfully added multiple schools:', newSchoolsDataResult);

      // Automatically sync regular decision deadlines for the new schools
      try {
        console.log('Starting auto-sync for multiple new schools');
        const { data: deadlineSyncData, error: deadlineSyncError } = await supabase.functions.invoke('auto-sync-deadlines', {
          body: { user_id: user.id },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          }
        });

        console.log('Auto-sync response for multiple schools:', { deadlineSyncData, deadlineSyncError });

        if (deadlineSyncError) {
          console.warn('Failed to auto-sync deadlines for new schools:', deadlineSyncError.message);
        } else {
          console.log('Auto-synced deadlines for new schools:', deadlineSyncData);
        }
      } catch (deadlineError) {
        console.warn('Error during auto-sync deadlines for new schools:', deadlineError);
      }

      // Add to local state
      const newSchools: School[] = newSchoolsDataResult.map(newSchoolData => ({
        id: newSchoolData.id,
        name: newSchoolData.school,
        location: capitalizeSchoolType(newSchoolData.school_type),
        category: newSchoolData.category as 'reach' | 'target' | 'safety',
        acceptanceRate: newSchoolData.acceptance_rate || 'N/A',
        ranking: newSchoolData.school_ranking || 'N/A',
        applicationDeadline: newSchoolData.first_round_deadline || 'TBD',
        earlyActionDeadline: newSchoolData.early_action_deadline || 'N/A',
        earlyDecision1Deadline: newSchoolData.early_decision_1_deadline || 'N/A',
        earlyDecision2Deadline: newSchoolData.early_decision_2_deadline || 'N/A',
        regularDecisionDeadline: newSchoolData.regular_decision_deadline || 'N/A',
        notes: newSchoolData.notes || newSchoolData.student_thesis || 'Add your notes here'
      }));
      
      console.log('Adding multiple schools to local state:', newSchools);
      setSchools([...schools, ...newSchools]);

      // Show success message for newly added schools
      if (newSchoolsData.length > 0) {
        toast({
          title: "Schools Added Successfully",
          description: `${newSchoolsData.length} school(s) have been added to your list.`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error('Error adding multiple schools:', err);
    }
  };

  const removeSchool = async (id: string) => {
    try {
      // Archive the school instead of deleting
      const result = await SchoolArchiveService.archiveSchool(id);
      
      if (result.success) {
        // Remove from local state for responsive UI
        setSchools(schools.filter(school => school.id !== id));
      } else {
        setError(result.message || 'Failed to archive school');
      }
    } catch (err) {
      console.error('Error archiving school:', err);
      setError('Failed to archive school');
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
      const { error } = await supabase
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
        className={`shadow-md hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing group hover:scale-[1.02] ${
          school.category === 'reach' ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300/50' :
          school.category === 'target' ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300/50' :
          'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300/50'
        } ${isDragging ? 'shadow-2xl scale-105' : ''}`}
        {...attributes}
        {...listeners}
        onContextMenu={(e) => handleRightClick(e, school.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{school.name}</CardTitle>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{school.location}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Drag indicator */}
              <div className="p-1 opacity-50">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSchool(school.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>Accept: {school.acceptanceRate}</span>
            </div>
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-3 w-3 text-muted-foreground" />
              <span>Rank: #{school.ranking}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {school.applicationDeadline && school.applicationDeadline !== 'N/A' && school.applicationDeadline !== 'TBD' && (
              <div className="text-sm">
                <span className="font-medium">Application Deadline:</span> {school.applicationDeadline}
              </div>
            )}
            {school.regularDecisionDeadline && school.regularDecisionDeadline !== 'N/A' && (
              <div className="text-sm text-green-600">
                <span className="font-medium">Deadline:</span> {school.regularDecisionDeadline}
              </div>
            )}
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Why it's a good match:</span>
            <p className="text-muted-foreground mt-1">{school.notes}</p>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-muted/50">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleSchoolClick(school);
              }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors p-1 h-auto"
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
  const DroppableArea = ({ category, children }: { category: 'reach' | 'target' | 'safety', children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: category });

    return (
      <div 
        ref={setNodeRef}
        className={`space-y-4 min-h-[200px] p-4 rounded-lg transition-colors ${
          isOver ? 'bg-primary/10 border-2 border-dashed border-primary' : ''
        }`}
      >
        {children}
      </div>
    );
  };

  if (loading) {
    return (
      <OnboardingGuard pageName="Schools">
        <GradientBackground>
          <main className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading your school recommendations...</span>
              </div>
            </div>
          </main>
        </GradientBackground>
      </OnboardingGuard>
    );
  }

  if (error) {
    return (
      <OnboardingGuard pageName="Schools">
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
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard pageName="Schools">
      <ProfileCompletionGuard pageName="Schools">
        <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <GradientBackground>
          <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Schools</h1>
            <p className="text-muted-foreground text-lg">
              Organize your target schools into Reach, Target, and Safety categories
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setIsArchiveModalOpen(true)} 
              variant="outline"
              className="shadow-lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Archive
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add School
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reach Schools */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Star className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Reach Schools</h2>
              <Badge variant="secondary">{reachSchools.length}</Badge>
            </div>
            
            <DroppableArea category="reach">
              {reachSchools.map((school) => (
                <DraggableSchoolCard key={school.id} school={school} />
              ))}
            </DroppableArea>
          </div>

          {/* Target Schools */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold">Target Schools</h2>
              <Badge variant="secondary">{targetSchools.length}</Badge>
            </div>
            
            <DroppableArea category="target">
              {targetSchools.map((school) => (
                <DraggableSchoolCard key={school.id} school={school} />
              ))}
            </DroppableArea>
          </div>

          {/* Safety Schools */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-green-500" />
              <h2 className="text-xl font-semibold">Safety Schools</h2>
              <Badge variant="secondary">{safetySchools.length}</Badge>
            </div>
            
            <DroppableArea category="safety">
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
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>Accept: {activeSchool.acceptanceRate}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                    <span>Rank: #{activeSchool.ranking}</span>
                  </div>
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
      </ProfileCompletionGuard>
    </OnboardingGuard>
  );
};

export default SchoolList;