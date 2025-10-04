import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import OnboardingGuard from "@/components/OnboardingGuard";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import GradientBackground from "@/components/GradientBackground";
import { EssayPromptService, EssayPrompt, EssayPromptSelection } from "@/services/essayPromptService";
import { semanticDocumentService } from "@/services/semanticDocumentService";
import { supabase } from "@/integrations/supabase/client";
import { getUserDisplayName, fetchUserProfileData } from "@/utils/userNameUtils";
import { getUserProgramType } from "@/utils/userProfileUtils";
import { getDraftStatusLabel } from "@/utils/statusUtils";
import { PenTool, MessageSquare, FileText, Clock, CheckCircle2, Plus, ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import SemanticEssayEditor from "@/components/essay/SemanticEssayEditor";
import { CreateEssayModal } from "@/components/essay/CreateEssayModal";
import { DeleteEssayDialog } from "@/components/essay/DeleteEssayDialog";
import { EssayService, CreateEssayData } from "@/services/essayService";
import { useIsMobile } from "@/hooks/use-mobile";
import PromptDropdown from "@/components/essay/PromptDropdown";

interface School {
  id: string;
  name: string;
  category: 'reach' | 'target' | 'safety';
  acceptanceRate: string;
  ranking: string;
  applicationDeadline: string;
  notes: string;
}
interface Essay {
  id: string;
  title: string;
  prompt: string;
  wordCount: number;
  wordLimit: number;
  status: string;
  lastEdited: string;
  feedback: number;
  schoolName?: string;
  promptNumber?: string;
}

const Essays = () => {
  // Helper function to count words consistently
  const getWordCount = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Helper function to parse word limits safely
  const parseWordLimit = (wordLimit: string): number => {
    if (!wordLimit || wordLimit.trim() === '') return 650; // Default fallback
    
    const cleanLimit = wordLimit.trim();
    
    // Handle range format like "250-650"
    if (cleanLimit.includes('-')) {
      const parts = cleanLimit.split('-');
      const maxLimit = parseInt(parts[parts.length - 1]);
      return isNaN(maxLimit) ? 650 : maxLimit;
    }
    
    // Handle single number like "400"
    const singleLimit = parseInt(cleanLimit);
    if (!isNaN(singleLimit)) return singleLimit;
    
    // Handle special cases
    switch (cleanLimit.toLowerCase()) {
      case 'not specified':
      case 'no limit':
        return 650; // Default fallback
      case 'one page':
        return 500; // Approximate for one page
      case 'three words':
        return 3;
      default:
        return 650; // Default fallback
    }
  };

  // Helper function to categorize essay prompts
  const categorizePrompts = (prompts: EssayPrompt[]) => {
    const requiredPrompts: EssayPrompt[] = [];
    const optionalPrompts: EssayPrompt[] = [];
    
    prompts.forEach(prompt => {
      // A prompt is truly required only if both selection_type and prompt_selection_type are 'required'
      // If prompt_selection_type is 'choose_one', 'choose_two', etc., it's optional
      const isTrulyRequired = prompt.selection_type === 'required' && 
                             prompt.prompt_selection_type === 'required';
      
      if (isTrulyRequired) {
        requiredPrompts.push(prompt);
      } else {
        optionalPrompts.push(prompt);
      }
    });
    
    return { requiredPrompts, optionalPrompts };
  };

  // Helper function to get selection text for optional prompts
  const getSelectionText = (prompts: EssayPrompt[]) => {
    if (prompts.length === 0) return '';
    
    // Get the prompt_selection_type from the first prompt (they should all be the same for a school)
    const promptSelectionType = prompts[0]?.prompt_selection_type || 'choose_one';
    
    if (promptSelectionType === 'choose_one') {
      return `Choose 1 of ${prompts.length}`;
    } else if (promptSelectionType.startsWith('choose_')) {
      const number = promptSelectionType.split('_')[1];
      return `Choose ${number} of ${prompts.length}`;
    } else if (promptSelectionType === 'required') {
      // This shouldn't happen for optional prompts, but just in case
      return `All ${prompts.length} required`;
    } else {
      return `Choose from ${prompts.length} options`;
    }
  };
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>(() => {
    // Initialize from localStorage
    return localStorage.getItem('essays_selected_school') || '';
  });
  const [essayPrompts, setEssayPrompts] = useState<EssayPrompt[]>([]);
  const [userSelections, setUserSelections] = useState<EssayPromptSelection[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [essayContent, setEssayContent] = useState<string>('');
  const [commonAppPrompts, setCommonAppPrompts] = useState<EssayPrompt[]>([]);
  const [selectedCommonAppPrompt, setSelectedCommonAppPrompt] = useState<EssayPrompt | null>(null);
  const [commonAppEssay, setCommonAppEssay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [onboardingTranscript, setOnboardingTranscript] = useState<string>('');
  const [newEssays, setNewEssays] = useState<any[]>([]);
  const [selectedNewEssayId, setSelectedNewEssayId] = useState<string | null>(() => {
    // Initialize from localStorage
    return localStorage.getItem('essays_selected_new_essay_id') || null;
  });
  const [creatingEssay, setCreatingEssay] = useState(false);
  const [showCreateEssayModal, setShowCreateEssayModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [essayToDelete, setEssayToDelete] = useState<any>(null);
  const [deletingEssay, setDeletingEssay] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(undefined);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { toast } = useToast();

  // Mobile-specific state management
  const isMobile = useIsMobile();
  const [mobileStep, setMobileStep] = useState<'school' | 'prompts' | 'editor'>('school');
  const [selectedMobilePrompt, setSelectedMobilePrompt] = useState<Essay | null>(null);
  const [showMobileEditor, setShowMobileEditor] = useState(false);

  // Helper function to persist essay selection
  const persistEssaySelection = (essayId: string | null) => {
    setSelectedNewEssayId(essayId);
    if (essayId) {
      localStorage.setItem('essays_selected_new_essay_id', essayId);
    } else {
      localStorage.removeItem('essays_selected_new_essay_id');
    }
  };

  // Fetch user's schools and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user profile for name using centralized utility
        const profile = await fetchUserProfileData(user.id);
        const displayName = getUserDisplayName(profile, user, 'Student');
        setUserName(displayName);

        // Fetch school recommendations with timeout and retry logic
        const fetchSchools = async (retries = 3): Promise<School[]> => {
          try {
            const {
              data: recommendations,
              error
            } = await supabase.from('school_recommendations').select('*').eq('student_id', user.id).order('created_at', {
              ascending: false
            });
            
            if (error) {
              throw error;
            }
            
            const transformedSchools: School[] = recommendations.map(rec => ({
              id: rec.id,
              name: rec.school,
              category: rec.category as 'reach' | 'target' | 'safety',
              acceptanceRate: rec.acceptance_rate || 'N/A',
              ranking: rec.school_ranking || 'N/A',
              applicationDeadline: rec.first_round_deadline || 'TBD',
              notes: rec.notes || rec.student_thesis || 'No notes available'
            }));
            
            // Add Common Application and UCAS as school options for undergraduate students
            const userProgramType = await getUserProgramType();
            if (userProgramType === 'undergraduate') {
              // Check if user has any UK schools
              const hasUKSchools = transformedSchools.some(school => {
                const ukSchools = [
                  'University of Oxford',
                  'University of Cambridge', 
                  'Imperial College London',
                  'University College London (UCL)',
                  'London School of Economics and Political Science (LSE)'
                ];
                return ukSchools.includes(school.name);
              });
              
              // Add Common Application
              transformedSchools.unshift({
                id: 'common-app',
                name: 'Common Application',
                category: 'target',
                acceptanceRate: 'N/A',
                ranking: 'N/A',
                applicationDeadline: 'TBD',
                notes: 'Required for all undergraduate applications'
              });
              
              // Add UCAS if user has UK schools
              if (hasUKSchools) {
                transformedSchools.unshift({
                  id: 'ucas-uk',
                  name: 'UCAS (UK Schools)',
                  category: 'target',
                  acceptanceRate: 'N/A',
                  ranking: 'N/A',
                  applicationDeadline: 'TBD',
                  notes: 'Required for all UK university applications'
                });
              }
            }
            
            return transformedSchools;
          } catch (error) {
            console.error('[ESSAYS_ERROR] Failed to load school list:', {
              attempt: 4 - retries,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
              message: 'User cannot see their school list for essay writing'
            });
            if (retries > 1) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
              return fetchSchools(retries - 1);
            }
            throw error;
          }
        };

        const schools = await fetchSchools();
        setSchools(schools);

        // Fetch onboarding transcript separately to avoid blocking
        try {
          const {
            data: conversations
          } = await supabase.from('conversation_metadata').select('transcript').eq('user_id', user.id).order('created_at', {
            ascending: false
          }).limit(1);
          if (conversations && conversations.length > 0) {
            setOnboardingTranscript(conversations[0].transcript || '');
          }
        } catch (error) {
          console.error('[ESSAYS_ERROR] Failed to load onboarding transcript:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            message: 'User onboarding conversation could not be loaded for essay context'
          });
          // Don't block the main flow for this
        }
        
      } catch (error) {
        console.error('[ESSAYS_ERROR] Failed to load essays page data:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          message: 'User cannot access essays page - schools and data loading failed'
        });
        // Set empty schools array to prevent UI crashes
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch new essays when school is selected
  useEffect(() => {
    if (selectedSchool) {
      const fetchNewEssays = async () => {
        try {
          const essays = await EssayService.getEssaysForSchool(selectedSchool);
          setNewEssays(essays);
          
          // Special handling for Common Application
          if (selectedSchool === 'Common Application') {
            // Check if user already has a Common App essay
            const existingCommonAppEssay = await EssayService.getEssaysForSchool('Common Application');
            if (existingCommonAppEssay.length > 0) {
              setCommonAppEssay(existingCommonAppEssay[0]);
            }
          }
          
          // Validate persisted essay selection
          const persistedEssayId = localStorage.getItem('essays_selected_new_essay_id');
          if (persistedEssayId && !essays.find(e => e.id === persistedEssayId)) {
            // If persisted essay doesn't exist for this school, clear it
            persistEssaySelection(null);
          }
        } catch (error) {
          console.error('[ESSAYS_ERROR] Failed to load essays for school:', {
            schoolId: selectedSchool,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            message: 'User cannot see their essays for the selected school'
          });
        }
      };
      fetchNewEssays();
    } else {
      setNewEssays([]);
      persistEssaySelection(null);
    }
  }, [selectedSchool]);

  // Fetch Common App prompts for undergraduate students
  useEffect(() => {
    const fetchCommonAppPrompts = async () => {
      try {
        const prompts = await EssayPromptService.getPromptsForCollegeForUser('Common Application');
        setCommonAppPrompts(prompts);
        
        // Check if user already has a Common App essay
        const existingCommonAppEssay = await EssayService.getEssaysForSchool('Common Application');
        if (existingCommonAppEssay.length > 0) {
          setCommonAppEssay(existingCommonAppEssay[0]);
        }
      } catch (error) {
        console.error('[ESSAYS_ERROR] Failed to load Common App prompts:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          message: 'User cannot see Common Application essay prompts'
        });
      }
    };

    fetchCommonAppPrompts();
  }, []);

  // Fetch essay prompts when a school is selected
  useEffect(() => {
    if (selectedSchool) {
      const fetchPrompts = async () => {
        try {
          let prompts: EssayPrompt[] = [];
          
          // Handle Common Application and UCAS specially
          if (selectedSchool === 'Common Application') {
            prompts = await EssayPromptService.getPromptsForCollegeForUser('Common Application');
          } else if (selectedSchool === 'UCAS (UK Schools)') {
            prompts = await EssayPromptService.getPromptsForCollegeForUser('UCAS (UK Schools)');
          } else {
            // Check if this is a UK school - redirect to UCAS prompts
            const ukSchools = [
              'University of Oxford',
              'University of Cambridge', 
              'Imperial College London',
              'University College London (UCL)',
              'London School of Economics and Political Science (LSE)'
            ];
            
            if (ukSchools.includes(selectedSchool)) {
              // Redirect UK schools to UCAS prompts
              prompts = await EssayPromptService.getPromptsForCollegeForUser('UCAS (UK Schools)');
            } else {
              // Try to find prompts for the school name, filtered by user's program type
              prompts = await EssayPromptService.getPromptsForCollegeForUser(selectedSchool);
              
              // If no prompts found, try common variations (no fallback to other application systems)
              if (prompts.length === 0) {
                // Try removing "University" or "College" from the name
                const variations = [
                  selectedSchool.replace(' University', ''),
                  selectedSchool.replace(' College', ''),
                  selectedSchool.replace(' Institute', '')
                ];

                for (const variation of variations) {
                  prompts = await EssayPromptService.getPromptsForCollegeForUser(variation);
                  if (prompts.length > 0) break;
                }
              }
            }
          }

          setEssayPrompts(prompts);
          
          // Clear Common App prompts when selecting a different school
          if (selectedSchool !== 'Common Application' && selectedSchool !== 'Coalition Application' && selectedSchool !== 'UCAS (UK Schools)') {
            setCommonAppPrompts([]);
            setSelectedCommonAppPrompt(null);
          }
          
          // Fetch user's existing selections for this school
          const selections = await EssayPromptService.getUserSelectionsForSchool(selectedSchool);
          setUserSelections(selections);

          // Convert prompts to essays format
          const essaysFromPrompts: Essay[] = prompts.map((prompt, index) => {
            const existingSelection = selections.find(s => s.prompt_number === prompt.prompt_number);
            const wordCount = existingSelection?.essay_content?.split(' ').length || 0;
            const hasExistingContent = existingSelection?.essay_content?.trim().length > 0;
            
            return {
              id: `${selectedSchool}-${prompt.prompt_number}`,
              title: prompt.title || `${selectedSchool} - ${prompt.prompt_number}`, // Use database title, fallback to generated title
              prompt: prompt.prompt,
              wordCount: wordCount,
              wordLimit: parseWordLimit(prompt.word_limit),
              status: hasExistingContent ? 'draft' : 'not_started',
              lastEdited: existingSelection ? 'Recently' : 'Never',
              feedback: 0,
              schoolName: selectedSchool,
              promptNumber: prompt.prompt_number
            };
          });

          setEssays(essaysFromPrompts);
        } catch (error) {
          console.error('[ESSAYS_ERROR] Failed to load essay prompts:', {
            schoolId: selectedSchool,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            message: 'User cannot see essay prompts for the selected school'
          });
          
          // Set empty arrays to prevent UI crashes
          setEssayPrompts([]);
          setUserSelections([]);
          setEssays([]);
          
          toast({
            title: "Error",
            description: "Failed to load essay prompts for this school. Please try again.",
            variant: "destructive"
          });
        }
      };

      fetchPrompts();
    }
  }, [selectedSchool, toast]);







  // Create new essay
  const createNewEssay = async () => {
    if (!selectedSchool) {
      toast({
        title: "Error",
        description: "Please select a school first",
        variant: "destructive"
      });
      return;
    }

    // Open the custom essay creation modal
    setShowCreateEssayModal(true);
  };

  // Handle custom essay creation from modal
  const handleCustomEssayCreated = async (essayData: any) => {
    setCreatingEssay(true);
    try {
      const newEssay = await EssayService.createEssay(essayData);
      
      // Refresh the essays list
      const updatedEssays = await EssayService.getEssaysForSchool(selectedSchool);
      setNewEssays(updatedEssays);
      
      // Select the new essay
      persistEssaySelection(newEssay.id);
      setSelectedEssay(null); // Clear old essay selection
      
      // Custom essay created successfully
    } catch (error) {
      console.error('[ESSAYS_ERROR] Failed to create custom essay:', {
        schoolId: selectedSchool,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot create a new custom essay'
      });
      toast({
        title: "Error",
        description: "Failed to create custom essay",
        variant: "destructive"
      });
    } finally {
      setCreatingEssay(false);
    }
  };

  // Handle essay deletion
  const handleDeleteEssay = async () => {
    if (!essayToDelete) return;

    setDeletingEssay(true);
    try {
      await EssayService.deleteEssay(essayToDelete.id);
      
      // Refresh the essays list
      const updatedEssays = await EssayService.getEssaysForSchool(selectedSchool);
      setNewEssays(updatedEssays);
      
      // If the deleted essay was selected, clear selection
      if (selectedNewEssayId === essayToDelete.id) {
        persistEssaySelection(null);
        setSelectedEssay(null);
      }
      
      // Essay deleted successfully
      
      setShowDeleteDialog(false);
      setEssayToDelete(null);
    } catch (error) {
      console.error('[ESSAYS_ERROR] Failed to delete essay:', {
        essayId: essayToDelete.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot delete their essay'
      });
      toast({
        title: "Error",
        description: "Failed to delete essay",
        variant: "destructive"
      });
    } finally {
      setDeletingEssay(false);
    }
  };

  // Open delete dialog
  const openDeleteDialog = (essay: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent essay selection
    setEssayToDelete(essay);
    setShowDeleteDialog(true);
  };

  // Migrate existing prompt essay to new editor
  const migratePromptToNewEssay = async (essay: Essay, existingContent: string) => {
    try {
      // Find the actual prompt from the prompts list
      const prompt = essayPrompts.find(p => p.prompt_number === essay.promptNumber);
      
      const essayData: CreateEssayData = {
        title: essay.title,
        school_name: essay.schoolName,
        prompt_id: prompt?.id,
        initial_content: existingContent
      };

      const newEssay = await EssayService.createEssay(essayData);
      
      // Refresh the essays list
      const updatedEssays = await EssayService.getEssaysForSchool(selectedSchool);
      setNewEssays(updatedEssays);
      
      // Select the new migrated essay
      persistEssaySelection(newEssay.id);
      setSelectedEssay(null);
      
      // Migration successful
    } catch (error) {
      console.error('[ESSAYS_ERROR] Failed to migrate essay:', {
        essayId: essay.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User essay could not be migrated to new editor'
      });
      toast({
        title: "Migration Failed",
        description: "Failed to migrate essay. You can still use the old editor.",
        variant: "destructive"
      });
    }
  };

  // Create new essay from prompt
  const createEssayFromPrompt = async (essay: Essay) => {
    try {
      const prompt = essayPrompts.find(p => p.prompt_number === essay.promptNumber);
      
      const essayData: CreateEssayData = {
        title: essay.title,
        school_name: essay.schoolName,
        prompt_id: prompt?.id,
        initial_content: ''
      };

      const newEssay = await EssayService.createEssay(essayData);
      
      // Refresh the essays list
      const updatedEssays = await EssayService.getEssaysForSchool(selectedSchool);
      setNewEssays(updatedEssays);
      
      // Select the new essay
      persistEssaySelection(newEssay.id);
      setSelectedEssay(null);
      
      // New essay created from prompt
    } catch (error) {
      console.error('[ESSAYS_ERROR] Failed to create essay from prompt:', {
        schoolId: selectedSchool,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot create essay from selected prompt'
      });
      toast({
        title: "Error",
        description: "Failed to create essay from prompt",
        variant: "destructive"
      });
    }
  };

  // Handle Common App prompt selection
  const handleCommonAppPromptSelect = async (prompt: EssayPrompt) => {
    try {
      setSelectedCommonAppPrompt(prompt);
      
      // Check if user already has a Common App essay
      if (commonAppEssay) {
        // User already has a Common App essay, select it
        persistEssaySelection(commonAppEssay.id);
        setSelectedEssay(null);
        return;
      }
      
      // Create new Common App essay
      const essayData: CreateEssayData = {
        title: prompt.title || `Common Application - Prompt ${prompt.prompt_number}`,
        school_name: 'Common Application',
        prompt_id: prompt.id,
        initial_content: ''
      };

      const newEssay = await EssayService.createEssay(essayData);
      setCommonAppEssay(newEssay);
      
      // Select the new essay
      persistEssaySelection(newEssay.id);
      setSelectedEssay(null);
      
      // Common App essay created
    } catch (error) {
      console.error('[ESSAYS_ERROR] Failed to create Common App essay:', {
        promptId: selectedCommonAppPrompt?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot create Common Application essay'
      });
      toast({
        title: "Error",
        description: "Failed to create Common App essay",
        variant: "destructive"
      });
    }
  };

  const handleSchoolChange = (schoolName: string) => {
    setSelectedSchool(schoolName);
    setSelectedEssay(null);
    setEssayContent('');
    setSelectedPromptId(undefined); // Clear prompt selection when school changes
    persistEssaySelection(null); // Clear essay selection when school changes
    
    // Clear application system state when switching to a different school
    if (schoolName !== 'Common Application' && schoolName !== 'Coalition Application') {
      setCommonAppPrompts([]);
      setSelectedCommonAppPrompt(null);
      setCommonAppEssay(null);
    }
    
    // Mobile navigation: move to prompts step when school is selected
    if (isMobile) {
      setMobileStep('prompts');
      setSelectedMobilePrompt(null);
      setShowMobileEditor(false);
    }
    
    // Persist to localStorage
    localStorage.setItem('essays_selected_school', schoolName);
  };

  // Handle prompt selection from dropdown
  const handlePromptChange = async (promptId: string) => {
    setSelectedPromptId(promptId);
    
    // Find the prompt and create/select the corresponding essay
    const prompt = essayPrompts.find(p => p.id === promptId);
    if (!prompt) return;

    // Find the corresponding essay
    const essay = essays.find(e => e.promptNumber === prompt.prompt_number);
    if (!essay) return;

    // Use the existing essay selection logic
    await handleEssaySelect(essay);
  };
  const handleEssaySelect = async (essay: Essay) => {
    // Mobile navigation: move to editor step and set selected prompt
    if (isMobile) {
      setSelectedMobilePrompt(essay);
      setMobileStep('editor');
      setShowMobileEditor(false);
    }

    // Special handling for Common Application essays
    if (essay.schoolName === 'Common Application') {
      // Check if user already has a Common App essay
      if (commonAppEssay) {
        persistEssaySelection(commonAppEssay.id);
        setSelectedEssay(null);
        return;
      }
      
      // Create new Common App essay
      const prompt = essayPrompts.find(p => p.prompt_number === essay.promptNumber);
      if (prompt) {
        const essayData: CreateEssayData = {
          title: prompt.title || `Common Application - Prompt ${prompt.prompt_number}`,
          school_name: 'Common Application',
          prompt_id: prompt.id,
          initial_content: ''
        };

        const newEssay = await EssayService.createEssay(essayData);
        setCommonAppEssay(newEssay);
        
        // Select the new essay
        persistEssaySelection(newEssay.id);
        setSelectedEssay(null);
        
        // Common App essay created
      }
      return;
    }

    // Check if this prompt already has a new-format essay
    const existingNewEssay = newEssays.find(e => 
      e.title === essay.title || 
      (e.school_name === essay.schoolName && e.title.includes(essay.promptNumber || ''))
    );

    if (existingNewEssay) {
      // If there's already a new essay for this prompt, select it
      persistEssaySelection(existingNewEssay.id);
      setSelectedEssay(null);
    } else {
      // Check for existing content in the old format
      const selection = userSelections.find(s => s.prompt_number === essay.promptNumber && s.school_name === essay.schoolName);
      
      if (selection?.essay_content && selection.essay_content.trim()) {
        // Migrate existing content automatically
        await migratePromptToNewEssay(essay, selection.essay_content);
      } else {
        // Create new essay for this prompt
        await createEssayFromPrompt(essay);
      }
    }
  };
  const handleEssayContentChange = async (content: string) => {
    setEssayContent(content);
    if (!selectedEssay) return;
    
    // Set auto-saving state
    setIsAutoSaving(true);
    
    try {
      // Find the prompt for this essay
      const prompt = essayPrompts.find(p => p.prompt_number === selectedEssay.promptNumber);
      if (!prompt) return;

      await EssayPromptService.savePromptSelection(selectedEssay.schoolName, prompt.college_name, prompt.prompt_number, prompt.prompt, prompt.word_limit, true, content);

      // Check if this is the first time the essay is being edited (status changing from not_started to draft)
      const wasNotStarted = selectedEssay.status === 'not_started';
      
      // Only update status to 'draft' if there's actual content (more than just whitespace)
      const hasContent = content.trim().length > 0;
      const shouldUpdateStatus = hasContent && selectedEssay.status === 'not_started';
      
      // Update essays list with new word count and status (only if there's content)
      setEssays(prev => prev.map(essay => essay.id === selectedEssay.id ? {
        ...essay,
        wordCount: content.split(' ').length,
        status: shouldUpdateStatus ? 'draft' : essay.status
      } : essay));
      
      // If this is the first edit with actual content, create Version 1 automatically
      if (wasNotStarted && hasContent) {
        try {
          // Create a semantic document for Version 1
          const semanticDocument = {
            id: crypto.randomUUID(),
            title: selectedEssay.title,
            blocks: [
              {
                id: `block_${Date.now()}`,
                type: 'paragraph',
                content: content,
                metadata: {
                  wordCount: content.split(' ').filter(w => w.length > 0).length,
                  lastModified: new Date().toISOString()
                }
              }
            ],
            metadata: {
              totalWordCount: content.split(' ').filter(w => w.length > 0).length,
              totalCharacterCount: content.length,
              lastSaved: new Date().toISOString(),
              version: 1,
              essayId: selectedEssay.id,
              isReadOnly: false
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Save the semantic document
          await semanticDocumentService.saveDocument(semanticDocument);

          // Create Version 1 in essay_versions table
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('essay_versions')
              .insert({
                essay_id: selectedEssay.id,
                user_id: user.id,
                version_number: 1,
                content: {
                  blocks: semanticDocument.blocks,
                  metadata: semanticDocument.metadata
                },
                version_name: 'Version 1',
                version_description: 'Initial version',
                is_active: true,
                semantic_document_id: semanticDocument.id
              });
          }
        } catch (versionError) {
          console.error('Failed to create Version 1:', versionError);
          // Don't fail the whole operation if version creation fails
        }
      }
      
      // Update saved timestamp
      setLastSaved(new Date());
    } catch (error) {
      console.error('[ESSAYS_ERROR] Failed to save essay content:', {
        essayId: selectedEssay?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User essay changes were not saved'
      });
      toast({
        title: "Error",
        description: "Failed to save essay content.",
        variant: "destructive"
      });
    } finally {
      setIsAutoSaving(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-accent text-accent-foreground";
      case "outline":
        return "bg-warning text-warning-foreground";
      case "not_started":
        return "bg-muted text-muted-foreground";
      case "completed":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <PenTool className="h-4 w-4" />;
      case "outline":
        return <FileText className="h-4 w-4" />;
      case "not_started":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  if (loading) {
    return <OnboardingGuard pageName="Essays">
      <ProfileCompletionGuard pageName="Essays">
        <GradientBackground>
          <main className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 animate-spin" />
                <span>Loading your schools...</span>
              </div>
            </div>
          </main>
        </GradientBackground>
      </ProfileCompletionGuard>
      </OnboardingGuard>;
  }
  // Mobile UI Render
  if (isMobile) {
    return <OnboardingGuard pageName="Essays">
      <ProfileCompletionGuard pageName="Essays">
        <GradientBackground>
          
          {/* Mobile Step 1: School Selection */}
          {mobileStep === 'school' && (
            <div className="p-4">
              <div className="mb-6">
                <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                  Essay Workshop
                </h1>
                <p className="text-muted-foreground text-sm">
                  Select a school to see essay prompts
                </p>
              </div>

              
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-lg">Choose Your School</span>
                  </CardTitle>
                  <CardDescription>
                    Select the school you want to write essays for
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedSchool} onValueChange={handleSchoolChange}>
                    <SelectTrigger className="w-full bg-card shadow-sm">
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map(school => (
                        <SelectItem key={school.id} value={school.name}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              school.category === 'reach' ? 'bg-red-500' : 
                              school.category === 'target' ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`} />
                            <span>{school.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Mobile Step 2: Essay Prompts */}
          {mobileStep === 'prompts' && (
            <div className="p-4">
              <div className="flex items-center mb-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mr-2"
                  onClick={() => setMobileStep('school')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-display font-bold">
                    {selectedSchool}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Select an essay prompt
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {essays.length > 0 ? (() => {
                  const { requiredPrompts, optionalPrompts } = categorizePrompts(essayPrompts);
                  
                  return (
                    <>
                      {/* Required Essays Section */}
                      {requiredPrompts.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-red-600 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Required Essays ({requiredPrompts.length})</span>
                          </h3>
                          {requiredPrompts.map((prompt, index) => {
                            const essay = essays.find(e => e.promptNumber === prompt.prompt_number);
                            if (!essay) return null;
                            
                            const associatedNewEssay = newEssays.find(e => 
                              e.title === essay.title || 
                              (e.school_name === essay.schoolName && e.title.includes(essay.promptNumber || ''))
                            );
                            
                            return (
                              <Card 
                                key={essay.id} 
                                className="cursor-pointer transition-all duration-200 hover:shadow-md bg-card"
                                onClick={() => handleEssaySelect(essay)}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <h3 className="text-sm font-medium leading-tight text-foreground">
                                        {essay.title}
                                      </h3>
                                      <Badge className={`${getStatusColor(associatedNewEssay ? associatedNewEssay.status : essay.status)} text-xs ml-2 flex-shrink-0`}>
                                        <div className="flex items-center space-x-1">
                                          {getStatusIcon(associatedNewEssay ? associatedNewEssay.status : essay.status)}
                                          <span>{getDraftStatusLabel(associatedNewEssay ? associatedNewEssay.status : essay.status)}</span>
                                        </div>
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {essay.prompt}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-muted-foreground">
                                        {associatedNewEssay ? `${associatedNewEssay.word_count}/${essay.wordLimit} words` : `${essay.wordCount}/${essay.wordLimit} words`}
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Optional Essays Section */}
                      {optionalPrompts.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-blue-600 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{getSelectionText(optionalPrompts)} ({optionalPrompts.length} prompts)</span>
                          </h3>
                          {optionalPrompts.map((prompt, index) => {
                            const essay = essays.find(e => e.promptNumber === prompt.prompt_number);
                            if (!essay) return null;
                            
                            const associatedNewEssay = newEssays.find(e => 
                              e.title === essay.title || 
                              (e.school_name === essay.schoolName && e.title.includes(essay.promptNumber || ''))
                            );
                            
                            return (
                              <Card 
                                key={essay.id} 
                                className="cursor-pointer transition-all duration-200 hover:shadow-md bg-card"
                                onClick={() => handleEssaySelect(essay)}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <h3 className="text-sm font-medium leading-tight text-foreground">
                                        {essay.title}
                                      </h3>
                                      <Badge className={`${getStatusColor(associatedNewEssay ? associatedNewEssay.status : essay.status)} text-xs ml-2 flex-shrink-0`}>
                                        <div className="flex items-center space-x-1">
                                          {getStatusIcon(associatedNewEssay ? associatedNewEssay.status : essay.status)}
                                          <span>{getDraftStatusLabel(associatedNewEssay ? associatedNewEssay.status : essay.status)}</span>
                                        </div>
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {essay.prompt}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-muted-foreground">
                                        {associatedNewEssay ? `${associatedNewEssay.word_count}/${essay.wordLimit} words` : `${essay.wordCount}/${essay.wordLimit} words`}
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <Card className="p-8 text-center bg-muted/30">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {selectedSchool === 'Common Application' ? 'No Common App prompts found' : 'No essay prompts found for this school, add a new one!'}
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Mobile Step 3: Essay Editor */}
          {mobileStep === 'editor' && selectedMobilePrompt && (
            <>
              {!showMobileEditor ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center p-4 border-b bg-transparent backdrop-blur border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mr-2"
                      onClick={() => setMobileStep('prompts')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <h1 className="text-lg font-semibold truncate">
                        {selectedMobilePrompt.promptNumber && `Prompt ${selectedMobilePrompt.promptNumber}`}
                      </h1>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedSchool}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMobileEditor(true)}
                    >
                      Show Essay
                    </Button>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Essay Prompt</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedMobilePrompt.prompt}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            Word limit: {selectedMobilePrompt.wordLimit}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getDraftStatusLabel(selectedMobilePrompt.status)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="fixed inset-0 z-50 bg-background flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b bg-transparent backdrop-blur border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowMobileEditor(false)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {getWordCount(essayContent)}/{selectedMobilePrompt.wordLimit} words
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    {selectedNewEssayId ? (
                      <SemanticEssayEditor 
                        essayId={selectedNewEssayId}
                        title={newEssays.find(e => e.id === selectedNewEssayId)?.title || 'Untitled Essay'}
                        prompt={(() => {
                          const essay = newEssays.find(e => e.id === selectedNewEssayId);
                          if (essay?.prompt_id) {
                            const prompt = essayPrompts.find(p => p.id === essay.prompt_id);
                            return prompt?.prompt;
                          }
                          return undefined;
                        })()}
                        prompts={essayPrompts.map(prompt => {
                          // Find if there's a draft for this prompt
                          const associatedEssay = essays.find(e => e.promptNumber === prompt.prompt_number);
                          const associatedNewEssay = newEssays.find(e => 
                            (e.title === associatedEssay?.title || 
                            (e.school_name === associatedEssay?.schoolName && e.title.includes(associatedEssay?.promptNumber || ''))) &&
                            !e.prompt_text
                          );
                          
                          return {
                            id: prompt.id,
                            prompt: prompt.prompt,
                            prompt_number: prompt.prompt_number,
                            is_required: prompt.selection_type === 'required' && prompt.prompt_selection_type === 'required',
                            word_limit: prompt.word_limit,
                            has_draft: !!(associatedEssay || associatedNewEssay),
                            draft_status: associatedNewEssay ? associatedNewEssay.status : associatedEssay?.status,
                            prompt_selection_type: prompt.prompt_selection_type,
                            how_many: prompt.how_many
                          };
                        })}
                        selectedPromptId={(() => {
                          const essay = newEssays.find(e => e.id === selectedNewEssayId);
                          return essay?.prompt_id || undefined;
                        })()}
                        wordLimit={(() => {
                          const essay = newEssays.find(e => e.id === selectedNewEssayId);
                          const selectedPrompt = essayPrompts.find(p => p.id === essay?.prompt_id);
                          
                          // Use prompt's word limit first, then essay's, then default
                          if (selectedPrompt?.word_limit && selectedPrompt.word_limit !== 'No limit') {
                            return parseInt(selectedPrompt.word_limit);
                          }
                          if (essay?.word_limit && essay.word_limit !== 'No limit') {
                            return parseInt(essay.word_limit);
                          }
                          return 650; // Default word limit
                        })()}
                        onPromptChange={async (promptId) => {
                          // Handle prompt change - find or create essay for the new prompt
                          const newPrompt = essayPrompts.find(p => p.id === promptId);
                          if (!newPrompt) return;

                          // Find if there's already an essay for this prompt
                          const existingEssay = essays.find(e => e.promptNumber === newPrompt.prompt_number);
                          const existingNewEssay = newEssays.find(e => 
                            (e.title === existingEssay?.title || 
                            (e.school_name === existingEssay?.schoolName && e.title.includes(existingEssay?.promptNumber || ''))) &&
                            !e.prompt_text
                          );

                          if (existingNewEssay) {
                            // If there's already a new essay for this prompt, select it
                            persistEssaySelection(existingNewEssay.id);
                            setSelectedEssay(null);
                          } else if (existingEssay) {
                            // If there's an old essay, create a new one and select it
                            const essayData: CreateEssayData = {
                              title: existingEssay.title,
                              school_name: selectedSchool || '',
                              prompt_id: newPrompt.id,
                              initial_content: ''
                            };

                            try {
                              const newEssay = await EssayService.createEssay(essayData);
                              setNewEssays(prev => [...prev, newEssay]);
                              persistEssaySelection(newEssay.id);
                              setSelectedEssay(null);
                              
                              // Switched to new prompt
                            } catch (error) {
                              console.error('[ESSAYS_ERROR] Failed to switch prompt:', {
                                schoolId: selectedSchool,
                                promptId: newPrompt.id,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                timestamp: new Date().toISOString(),
                                message: 'User cannot switch to different essay prompt'
                              });
                              toast({
                                title: "Error",
                                description: "Failed to switch prompt. Please try again.",
                                variant: "destructive"
                              });
                            }
                          } else {
                            // Create a new essay for this prompt
                            const essayData: CreateEssayData = {
                              title: newPrompt.title || `${selectedSchool} - Prompt ${newPrompt.prompt_number}`,
                              school_name: selectedSchool || '',
                              prompt_id: newPrompt.id,
                              initial_content: ''
                            };

                            try {
                              const newEssay = await EssayService.createEssay(essayData);
                              setNewEssays(prev => [...prev, newEssay]);
                              persistEssaySelection(newEssay.id);
                              setSelectedEssay(null);
                              
                              // Created new essay for prompt
                            } catch (error) {
                              console.error('[ESSAYS_ERROR] Failed to create essay for prompt:', {
                                schoolId: selectedSchool,
                                promptId: newPrompt.id,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                timestamp: new Date().toISOString(),
                                message: 'User cannot create new essay for selected prompt'
                              });
                              toast({
                                title: "Error",
                                description: "Failed to create essay. Please try again.",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                      />
                    ) : (
                      <Textarea 
                        placeholder="Start writing your essay here..." 
                        className="h-full w-full resize-none border-0 rounded-none focus:ring-0 text-base leading-relaxed p-4 bg-background" 
                        value={essayContent} 
                        onChange={e => handleEssayContentChange(e.target.value)} 
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </GradientBackground>
      </ProfileCompletionGuard>
    </OnboardingGuard>;
  }

  // Desktop UI (unchanged)
  return <OnboardingGuard pageName="Essays">
    <ProfileCompletionGuard pageName="Essays">
      <GradientBackground>
        {/* Header */}
        <div className="sticky top-0 z-40 bg-transparent backdrop-blur supports-[backdrop-filter]:bg-transparent border-b border-border/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Essay Workshop
                </h1>
                <p className="text-muted-foreground">
                  Craft compelling essays for your target schools
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedSchool} onValueChange={handleSchoolChange}>
                  <SelectTrigger className="w-64 bg-card shadow-sm">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(school => <SelectItem key={school.id} value={school.name}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${school.category === 'reach' ? 'bg-red-500' : school.category === 'target' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                          <span>{school.name}</span>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <Button 
                  className="shadow-sm"
                  onClick={createNewEssay}
                  disabled={!selectedSchool || creatingEssay}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {creatingEssay ? 'Creating...' : 'New Essay'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6 min-h-full bg-transparent">

          <div className="w-full min-h-[calc(100vh-200px)]">
            {/* Essay Editor */}
            <div className="w-full min-h-full">
              {selectedNewEssayId ? (
                <SemanticEssayEditor 
                  essayId={selectedNewEssayId}
                  title={newEssays.find(e => e.id === selectedNewEssayId)?.title || 'Untitled Essay'}
                  prompt={(() => {
                    const essay = newEssays.find(e => e.id === selectedNewEssayId);
                    // Check for custom prompt first
                    if (essay?.prompt_text) {
                      return essay.prompt_text;
                    }
                    // Fall back to regular prompt
                    if (essay?.prompt_id) {
                      const prompt = essayPrompts.find(p => p.id === essay.prompt_id);
                      return prompt?.prompt;
                    }
                    return undefined;
                  })()}
                  prompts={essayPrompts.map(prompt => {
                    // Find if there's a draft for this prompt
                    const associatedEssay = essays.find(e => e.promptNumber === prompt.prompt_number);
                    const associatedNewEssay = newEssays.find(e => 
                      (e.title === associatedEssay?.title || 
                      (e.school_name === associatedEssay?.schoolName && e.title.includes(associatedEssay?.promptNumber || ''))) &&
                      !e.prompt_text
                    );
                    
                    // Only show has_draft as true if there's actual content, not just an empty essay entry
                    const hasActualContent = (associatedNewEssay && associatedNewEssay.content?.blocks && 
                                           associatedNewEssay.content.blocks.some(block => block.content && block.content.trim().length > 0)) || 
                                           !!associatedEssay;
                    
                    return {
                      id: prompt.id,
                      prompt: prompt.prompt,
                      prompt_number: prompt.prompt_number,
                      is_required: prompt.selection_type === 'required' && prompt.prompt_selection_type === 'required',
                      word_limit: prompt.word_limit,
                      has_draft: hasActualContent,
                      draft_status: associatedNewEssay ? associatedNewEssay.status : associatedEssay?.status,
                      prompt_selection_type: prompt.prompt_selection_type,
                      how_many: prompt.how_many
                    };
                  })}
                  selectedPromptId={(() => {
                    const essay = newEssays.find(e => e.id === selectedNewEssayId);
                    return essay?.prompt_id || undefined;
                  })()}
                  wordLimit={(() => {
                    const essay = newEssays.find(e => e.id === selectedNewEssayId);
                    const selectedPrompt = essayPrompts.find(p => p.id === essay?.prompt_id);
                    
                    // Use prompt's word limit first, then essay's, then default
                    if (selectedPrompt?.word_limit && selectedPrompt.word_limit !== 'No limit') {
                      return parseInt(selectedPrompt.word_limit);
                    }
                    if (essay?.word_limit && essay.word_limit !== 'No limit') {
                      return parseInt(essay.word_limit);
                    }
                    return 650; // Default word limit
                  })()}
                  onPromptChange={async (promptId) => {
                    // Handle prompt change - find or create essay for the new prompt
                    const newPrompt = essayPrompts.find(p => p.id === promptId);
                    if (!newPrompt) return;

                    // Find if there's already an essay for this prompt
                    const existingEssay = essays.find(e => e.promptNumber === newPrompt.prompt_number);
                    const existingNewEssay = newEssays.find(e => 
                      (e.title === existingEssay?.title || 
                      (e.school_name === existingEssay?.schoolName && e.title.includes(existingEssay?.promptNumber || ''))) &&
                      !e.prompt_text
                    );

                    if (existingNewEssay) {
                      // If there's already a new essay for this prompt, select it
                      persistEssaySelection(existingNewEssay.id);
                      setSelectedEssay(null);
                    } else if (existingEssay) {
                      // If there's an old essay, create a new one and select it
                      const essayData: CreateEssayData = {
                        title: existingEssay.title,
                        school_name: selectedSchool || '',
                        prompt_id: newPrompt.id,
                        initial_content: ''
                      };

                      try {
                        const newEssay = await EssayService.createEssay(essayData);
                        setNewEssays(prev => [...prev, newEssay]);
                        persistEssaySelection(newEssay.id);
                        setSelectedEssay(null);
                        
                        // Switched to new prompt
                      } catch (error) {
                        console.error('[ESSAYS_ERROR] Failed to switch prompt:', {
                          schoolId: selectedSchool,
                          promptId: newPrompt.id,
                          error: error instanceof Error ? error.message : 'Unknown error',
                          timestamp: new Date().toISOString(),
                          message: 'User cannot switch to different essay prompt'
                        });
                        toast({
                          title: "Error",
                          description: "Failed to switch prompt. Please try again.",
                          variant: "destructive"
                        });
                      }
                    } else {
                      // Create a new essay for this prompt
                      const essayData: CreateEssayData = {
                        title: newPrompt.title || `${selectedSchool} - Prompt ${newPrompt.prompt_number}`,
                        school_name: selectedSchool || '',
                        prompt_id: newPrompt.id,
                        initial_content: ''
                      };

                      try {
                        const newEssay = await EssayService.createEssay(essayData);
                        setNewEssays(prev => [...prev, newEssay]);
                        persistEssaySelection(newEssay.id);
                        setSelectedEssay(null);
                        
                        // Created new essay for prompt
                      } catch (error) {
                        console.error('[ESSAYS_ERROR] Failed to create essay for prompt:', {
                          schoolId: selectedSchool,
                          promptId: newPrompt.id,
                          error: error instanceof Error ? error.message : 'Unknown error',
                          timestamp: new Date().toISOString(),
                          message: 'User cannot create new essay for selected prompt'
                        });
                        toast({
                          title: "Error",
                          description: "Failed to create essay. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                />
              ) : selectedEssay ? (
                <Card className="min-h-full shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="space-y-3">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <PenTool className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="text-lg">{selectedEssay.title}</span>
                          
                        </div>
                      </CardTitle>
                      
                      <CardDescription className="text-sm leading-relaxed bg-muted p-3 rounded-lg">
                        <strong>Prompt:</strong> {selectedEssay.prompt}
                      </CardDescription>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" className="shadow-sm">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Get Feedback
                          </Button>
                          <Button size="sm" variant="outline" className="shadow-sm">
                            <FileText className="h-3 w-3 mr-1" />
                            Check Grammar
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className={`text-sm px-2 py-1 rounded-full ${getWordCount(essayContent) > selectedEssay.wordLimit ? 'bg-destructive/10 text-destructive' : getWordCount(essayContent) > selectedEssay.wordLimit * 0.9 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                            {getWordCount(essayContent)}/{selectedEssay.wordLimit} words
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0 min-h-full">
                    <Textarea placeholder="Start writing your essay here..." className="h-full min-h-[500px] resize-none border-0 rounded-none focus:ring-0 text-base leading-relaxed p-6" value={essayContent} onChange={e => handleEssayContentChange(e.target.value)} />
                  </CardContent>
                </Card>
              ) : selectedSchool ? (
                // Show prompt dropdown when school is selected but no essay is chosen
                <div className="min-h-full overflow-y-auto p-6">
                  {essayPrompts.length > 0 ? (
                    <PromptDropdown
                      prompts={essayPrompts.map(prompt => {
                        // Find if there's a draft for this prompt
                        const associatedEssay = essays.find(e => e.promptNumber === prompt.prompt_number);
                        const associatedNewEssay = newEssays.find(e => 
                          (e.title === associatedEssay?.title || 
                          (e.school_name === associatedEssay?.schoolName && e.title.includes(associatedEssay?.promptNumber || ''))) &&
                          !e.prompt_text
                        );
                        
                        return {
                          id: prompt.id,
                          prompt: prompt.prompt,
                          prompt_number: prompt.prompt_number,
                          is_required: prompt.selection_type === 'required' && prompt.prompt_selection_type === 'required',
                          word_limit: prompt.word_limit,
                          has_draft: !!(associatedEssay || associatedNewEssay),
                          draft_status: associatedNewEssay ? associatedNewEssay.status : associatedEssay?.status,
                          prompt_selection_type: prompt.prompt_selection_type,
                          how_many: prompt.how_many
                        };
                      })}
                      selectedPromptId={selectedPromptId}
                      onPromptChange={handlePromptChange}
                      className="max-w-4xl mx-auto"
                      lastSaved={lastSaved}
                      isAutoSaving={isAutoSaving}
                    />
                  ) : (
                    <Card className="p-8 text-center bg-muted/30 max-w-2xl mx-auto">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Essay Prompts Found</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedSchool === 'Common Application' ? 'No Common App prompts found' : 'No essay prompts found for this school, add a new one!'}
                      </p>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="min-h-full shadow-sm bg-gradient-to-br from-muted/30 to-muted/10">
                  <CardContent className="p-12 text-center min-h-full flex flex-col items-center justify-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-6">
                      <PenTool className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Select a School</h3>
                    <p className="text-muted-foreground max-w-md">
                      Choose a school from the dropdown above to see available essay prompts and start writing
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

          </div>

        </div>

        {/* Custom Essay Creation Modal */}
        <CreateEssayModal
          isOpen={showCreateEssayModal}
          onClose={() => setShowCreateEssayModal(false)}
          onEssayCreated={handleCustomEssayCreated}
          selectedSchool={selectedSchool}
        />

        {/* Delete Essay Confirmation Dialog */}
        <DeleteEssayDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setEssayToDelete(null);
          }}
          onConfirm={handleDeleteEssay}
          essayTitle={essayToDelete?.title || ''}
          isDeleting={deletingEssay}
        />
      </GradientBackground>
    </ProfileCompletionGuard>
    </OnboardingGuard>;
};
export default Essays;