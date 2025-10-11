import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit3, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface ActivityData {
  id: string;
  title: string;
  position: string;
  location: string;
  fromDate: string;
  toDate: string;
  isCurrent: boolean;
  bullets: string[];
}

interface ActivityEditorProps {
  activity: ActivityData;
  category: string;
  onUpdate: (activityId: string, updatedActivity: Partial<ActivityData>) => void;
  onRemove: (activityId: string) => void;
}

const ActivityEditor = ({ activity, category, onUpdate, onRemove }: ActivityEditorProps) => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Local state for immediate UI updates
  const [localActivity, setLocalActivity] = useState<ActivityData>(activity);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Undo state management
  const [undoStack, setUndoStack] = useState<ActivityData[]>([]);
  const [redoStack, setRedoStack] = useState<ActivityData[]>([]);
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalActivity(activity);
    setHasUnsavedChanges(false); // Reset unsaved changes when activity prop changes
  }, [activity]);

  // Check if there are unsaved changes
  const checkForUnsavedChanges = useCallback(() => {
    const hasChanges = 
      localActivity.title !== activity.title ||
      localActivity.position !== activity.position ||
      localActivity.location !== activity.location ||
      localActivity.fromDate !== activity.fromDate ||
      localActivity.toDate !== activity.toDate ||
      localActivity.isCurrent !== activity.isCurrent ||
      JSON.stringify(localActivity.bullets) !== JSON.stringify(activity.bullets);
    
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  }, [localActivity, activity]);

  // Update unsaved changes state whenever local activity changes
  useEffect(() => {
    checkForUnsavedChanges();
  }, [checkForUnsavedChanges]);

  // Save state to undo stack before making changes
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev, { ...localActivity }]);
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [localActivity]);

  // Undo function
  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, { ...localActivity }]);
      setLocalActivity(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, localActivity]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    onRemove(activity.id);
    setShowDeleteDialog(false);
  }, [onRemove, activity.id]);

  // Redo function
  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, { ...localActivity }]);
      setLocalActivity(nextState);
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, localActivity]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent, fieldType: 'title' | 'position' | 'bullet', index?: number) => {
    // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) for undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    // Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux) for redo
    if (((e.metaKey && e.shiftKey) || (e.ctrlKey && e.key === 'y')) && e.key === 'z') {
      e.preventDefault();
      redo();
      return;
    }
    
    // Cmd+C (Mac) or Ctrl+C (Windows/Linux) for copy
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      // Let the default copy behavior work
      return;
    }
    
    // Cmd+V (Mac) or Ctrl+V (Windows/Linux) for paste
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      // Let the default paste behavior work
      return;
    }
    
    // Cmd+A (Mac) or Ctrl+A (Windows/Linux) for select all
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      // Let the default select all behavior work
      return;
    }
  }, [undo, redo]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Save only when user is done editing (on blur/focus loss)
  const saveChanges = useCallback(async (updates: Partial<ActivityData>) => {
    try {
      setIsAutoSaving(true);
      onUpdate(activity.id, updates);
      setLastSaved(new Date());
      setHasUnsavedChanges(false); // Clear unsaved changes after successful save
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [activity.id, onUpdate]);

  // Handle field changes - update local state immediately for responsive UI
  const handleFieldChange = useCallback((field: keyof ActivityData, value: string | boolean | string[]) => {
    setLocalActivity(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFieldBlur = useCallback((field: keyof ActivityData, value: string | boolean | string[]) => {
    saveChanges({ [field]: value });
  }, [saveChanges]);

  // Handle bullet point changes - update local state immediately
  const handleBulletChange = useCallback((index: number, value: string) => {
    saveToUndoStack();
    setLocalActivity(prev => {
      const newBullets = [...prev.bullets];
      newBullets[index] = value;
      return { ...prev, bullets: newBullets };
    });
  }, [saveToUndoStack]);

  // Handle bullet point blur - save when done editing
  const handleBulletBlur = useCallback((index: number, value: string) => {
    const newBullets = [...localActivity.bullets];
    newBullets[index] = value;
    
    // Clean up empty bullets
    const cleanedBullets = newBullets.filter((bullet, i) => 
      bullet.trim() !== '' || i !== index
    );
    
    saveChanges({ bullets: cleanedBullets });
  }, [localActivity.bullets, saveChanges]);

  // Add new bullet point - save immediately since it's a user action
  const addBullet = useCallback(() => {
    const newBullets = [...localActivity.bullets, ''];
    setLocalActivity(prev => ({ ...prev, bullets: newBullets }));
    saveChanges({ bullets: newBullets });
  }, [localActivity.bullets, saveChanges]);

  // Remove bullet point - save immediately since it's a user action
  const removeBullet = useCallback((index: number) => {
    if (localActivity.bullets.length > 1) {
      const newBullets = localActivity.bullets.filter((_, i) => i !== index);
      setLocalActivity(prev => ({ ...prev, bullets: newBullets }));
      saveChanges({ bullets: newBullets });
    }
  }, [localActivity.bullets, saveChanges]);

  // Title editing handlers
  const handleTitleChange = useCallback((value: string) => {
    saveToUndoStack();
    setLocalActivity(prev => ({ ...prev, title: value }));
  }, [saveToUndoStack]);
  
  const handleTitleBlur = useCallback((value: string) => {
    saveChanges({ title: value });
  }, [saveChanges]);

  // Auto-resize textarea
  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }, []);

  // Get category-specific labels
  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = {
      academic: 'Academic',
      experience: 'Experience',
      projects: 'Projects',
      extracurricular: 'Extracurricular',
      volunteering: 'Volunteering',
      skills: 'Skills',
      interests: 'Interests',
      languages: 'Languages'
    };
    return labels[category] || category;
  }, []);

  // Get field-specific labels for academic entries
  const getFieldLabel = useCallback((category: string) => {
    const fieldLabels: Record<string, string> = {
      academic: 'Institution Name',
      experience: 'Company Name',
      projects: 'Project Name',
      extracurricular: 'Organization Name',
      volunteering: 'Organization Name'
    };
    return fieldLabels[category] || 'Title';
  }, []);

  // Get field-specific placeholders for academic entries
  const getFieldPlaceholder = useCallback((category: string) => {
    const fieldPlaceholders: Record<string, string> = {
      academic: 'e.g., The University of Chicago',
      experience: 'e.g., Google Inc.',
      projects: 'e.g., E-commerce Website',
      extracurricular: 'e.g., Debate Team',
      volunteering: 'e.g., Red Cross'
    };
    return fieldPlaceholders[category] || 'e.g., Enter name...';
  }, []);

  // Check if category shows dates
  const showsDates = ['academic', 'experience', 'volunteering', 'extracurricular'].includes(category);
  
  // Check if category shows position
  const showsPosition = !['skills', 'interests', 'languages'].includes(category);
  
  // Check if category shows bullets
  const showsBullets = ['academic', 'experience', 'volunteering', 'extracurricular', 'projects'].includes(category);
  
  // Check if category shows simple list (skills, interests, languages)
  const showsSimpleList = ['skills', 'interests', 'languages'].includes(category);
  
  // Check if category shows location (hide for skills, interests, languages)
  const showsLocation = !['skills', 'interests', 'languages'].includes(category);

  // Get placeholder text for different categories
  const getPlaceholderText = useCallback((category: string, index: number) => {
    const placeholders: Record<string, string[]> = {
      skills: [
        "e.g., JavaScript, Python, React",
        "e.g., Leadership, Team Management", 
        "e.g., Data Analysis, Excel, SQL",
        "e.g., Public Speaking, Communication",
        "e.g., Project Management, Strategic Planning"
      ],
      interests: [
        "e.g., Photography, Travel",
        "e.g., Music, Art",
        "e.g., Sports, Fitness", 
        "e.g., Reading, Writing",
        "e.g., Cooking, Gardening"
      ],
      languages: [
        "e.g., Spanish (Fluent)",
        "e.g., French (Conversational)",
        "e.g., Mandarin (Beginner)",
        "e.g., German (Intermediate)",
        "e.g., Portuguese (Native)"
      ]
    };
    return placeholders[category]?.[index] || `Enter ${category} ${index + 1}...`;
  }, []);

  // Get position label based on category
  const getPositionLabel = useCallback((category: string) => {
    const labels: Record<string, string> = {
      academic: 'Degree/Program',
      experience: 'Position',
      projects: 'Role',
      volunteering: 'Role',
      extracurricular: 'Role'
    };
    return labels[category] || 'Role';
  }, []);

  // Get position placeholder based on category
  const getPositionPlaceholder = useCallback((category: string) => {
    const placeholders: Record<string, string> = {
      academic: 'e.g., Bachelor of Computer Science',
      experience: 'e.g., Software Engineer Intern',
      projects: 'e.g., Full-Stack Developer',
      volunteering: 'e.g., Volunteer Coordinator',
      extracurricular: 'e.g., President'
    };
    return placeholders[category] || 'e.g., Role Title';
  }, []);

  return (
    <Card className="shadow-lg group">
      <CardHeader className="pb-3 px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          <div className="flex-1 min-w-0">
            {/* Field Label - Uneditable */}
            <div 
              className="text-base lg:text-lg font-semibold capitalize mb-2"
              style={{ 
                fontFamily: 'inherit',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontWeight: '600'
              }}
            >
              {getFieldLabel(category)}
            </div>
            
            {/* Text Input Field */}
            <div className="space-y-2">
              <Input
                value={localActivity.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={(e) => {
                  handleTitleBlur(e.target.value);
                }}
                onKeyDown={(e) => handleKeyDown(e, 'title')}
                placeholder={getFieldPlaceholder(category)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm lg:text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-2">
            {/* Status indicators - stack on mobile */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-1 text-xs text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">Unsaved changes</span>
                  <span className="sm:hidden">Unsaved</span>
                </div>
              )}
              
              {/* Auto-save status indicator */}
              {isAutoSaving && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Saving</span>
                </div>
              )}
              {!isAutoSaving && lastSaved && !hasUnsavedChanges && (
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">Saved</span>
                  <span className="sm:hidden">Saved</span>
                </div>
              )}
            </div>
            
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto touch-manipulation"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Remove</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Activity
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <strong>"{localActivity.title}"</strong>? This action cannot be undone.
                    <br /><br />
                    This will permanently remove the activity and all its bullet points from your resume.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Activity
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 px-4 lg:px-6">
        {/* Position Field */}
        {showsPosition && (
          <div className="space-y-2">
            <Label htmlFor={`position-${activity.id}`}>
              {getPositionLabel(category)}
            </Label>
            <Input
              id={`position-${localActivity.id}`}
              value={localActivity.position}
              onChange={(e) => handleFieldChange('position', e.target.value)}
              onBlur={(e) => handleFieldBlur('position', e.target.value)}
              placeholder={getPositionPlaceholder(category)}
            />
          </div>
        )}

        {/* Location Field */}
        {showsLocation && (
          <div className="space-y-2">
            <Label htmlFor={`location-${activity.id}`}>
              Location
            </Label>
            <Input
              id={`location-${localActivity.id}`}
              value={localActivity.location}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              onBlur={(e) => handleFieldBlur('location', e.target.value)}
              placeholder="e.g., San Francisco, CA"
            />
          </div>
        )}

        {/* Date Fields */}
        {showsDates && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`fromDate-${activity.id}`}>From Date</Label>
              <Input
                id={`fromDate-${localActivity.id}`}
                value={localActivity.fromDate}
                onChange={(e) => handleFieldChange('fromDate', e.target.value)}
                onBlur={(e) => handleFieldBlur('fromDate', e.target.value)}
                placeholder="MM/YYYY"
                className="touch-manipulation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`toDate-${localActivity.id}`}>To Date</Label>
              <Input
                id={`toDate-${localActivity.id}`}
                value={localActivity.toDate}
                onChange={(e) => handleFieldChange('toDate', e.target.value)}
                onBlur={(e) => handleFieldBlur('toDate', e.target.value)}
                placeholder="MM/YYYY"
                disabled={localActivity.isCurrent}
                className="touch-manipulation"
              />
            </div>
          </div>
        )}

        {/* Current Role Checkbox - Only for experience */}
        {category === 'experience' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`isCurrent-${localActivity.id}`}
              checked={localActivity.isCurrent}
              onCheckedChange={(checked) => {
                setLocalActivity(prev => ({ ...prev, isCurrent: checked as boolean }));
                saveChanges({ isCurrent: checked as boolean });
              }}
            />
            <Label htmlFor={`isCurrent-${localActivity.id}`} className="text-sm">
              I am currently in this role
            </Label>
          </div>
        )}

        {/* Bullet Points for complex categories */}
        {showsBullets && (
          <div className="space-y-3">
            <Label>Description & Achievements</Label>
            {localActivity.bullets.map((bullet, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">Bullet {index + 1}</Label>
                <div className="flex flex-col sm:flex-row items-start space-y-2 sm:space-y-0 sm:space-x-2">
                  <Textarea
                    value={bullet}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    onBlur={(e) => handleBulletBlur(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'bullet', index)}
                    placeholder={`Describe your ${category} experience...`}
                    className="flex-1 min-h-[80px] w-full"
                  />
                  {localActivity.bullets.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBullet(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBullet}
              className="w-full border-dashed touch-manipulation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Point
            </Button>
          </div>
        )}

        {/* Simple List for skills, interests, languages */}
        {showsSimpleList && (
          <div className="space-y-3">
            <Label>{getCategoryLabel(category)}</Label>
            {localActivity.bullets.map((item, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">
                  {getCategoryLabel(category)} {index + 1}
                </Label>
                <div className="flex flex-col sm:flex-row items-start space-y-2 sm:space-y-0 sm:space-x-2">
                  <Input
                    value={item}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    onBlur={(e) => handleBulletBlur(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'bullet', index)}
                    placeholder={getPlaceholderText(category, index)}
                    className="flex-1 w-full touch-manipulation"
                  />
                  {localActivity.bullets.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBullet(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBullet}
              className="w-full border-dashed touch-manipulation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another {getCategoryLabel(category).slice(0, -1)}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityEditor;
