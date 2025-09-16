import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import BrainstormChat from "@/components/BrainstormChat";
import OnboardingGuard from "@/components/OnboardingGuard";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import { EssayPromptService, EssayPrompt, EssayPromptSelection } from "@/services/essayPromptService";
import { supabase } from "@/integrations/supabase/client";
import { getUserDisplayName, fetchUserProfileData } from "@/utils/userNameUtils";
import { PenTool, MessageSquare, FileText, Clock, CheckCircle2, Plus, Lightbulb, ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import { ConversationStorage } from "@/utils/conversationStorage";
import EnhancedEssayEditor from "@/components/essay/EnhancedEssayEditor";
import { CreateEssayModal } from "@/components/essay/CreateEssayModal";
import { DeleteEssayDialog } from "@/components/essay/DeleteEssayDialog";
import { EssayService, CreateEssayData } from "@/services/essayService";
import { useIsMobile } from "@/hooks/use-mobile";

// Extend Window interface for ElevenLabs
declare global {
  interface Window {
    elevenlabsConvai?: {
      updateInputs: (inputs: {
        student_name: string;
        onboarding_transcript: string;
        target_college: string;
        essay_prompt: string;
      }) => void;
    };
  }
}
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

interface BrainstormSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}
const Essays = () => {
  // Helper function to count words consistently
  const getWordCount = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [onboardingTranscript, setOnboardingTranscript] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showBrainstorming, setShowBrainstorming] = useState(false);
  const [brainstormSummary, setBrainstormSummary] = useState<BrainstormSummary | null>(null);
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

        // Fetch onboarding transcript
        const {
          data: conversations
        } = await supabase.from('conversation_metadata').select('transcript').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(1);
        if (conversations && conversations.length > 0) {
          setOnboardingTranscript(conversations[0].transcript || '');
        }

        // Fetch school recommendations
        const {
          data: recommendations,
          error
        } = await supabase.from('school_recommendations').select('*').eq('student_id', user.id).order('created_at', {
          ascending: false
        });
        if (error) {
          console.error('Error fetching schools:', error);
          return;
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
        setSchools(transformedSchools);
      } catch (error) {
        console.error('Error fetching data:', error);
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
          
          // Validate persisted essay selection
          const persistedEssayId = localStorage.getItem('essays_selected_new_essay_id');
          if (persistedEssayId && !essays.find(e => e.id === persistedEssayId)) {
            // If persisted essay doesn't exist for this school, clear it
            persistEssaySelection(null);
          }
        } catch (error) {
          console.error('Error fetching new essays:', error);
        }
      };
      fetchNewEssays();
    } else {
      setNewEssays([]);
      persistEssaySelection(null);
    }
  }, [selectedSchool]);

  // Fetch essay prompts when a school is selected
  useEffect(() => {
    if (selectedSchool) {
      const fetchPrompts = async () => {
        try {
          // Try to find prompts for the school name, filtered by user's program type
          let prompts = await EssayPromptService.getPromptsForCollegeForUser(selectedSchool);
          
          // If no prompts found, try common variations
          if (prompts.length === 0) {
            // Try removing "University" or "College" from the name
            const variations = [
              selectedSchool.replace(' University', ''),
              selectedSchool.replace(' College', ''),
              selectedSchool.replace(' Institute', ''),
              'Common Application', // Fallback to common app
              'Coalition Application' // Another fallback
            ];

            for (const variation of variations) {
              prompts = await EssayPromptService.getPromptsForCollegeForUser(variation);
              if (prompts.length > 0) break;
            }
          }

          setEssayPrompts(prompts);
          
          // Fetch user's existing selections for this school
          const selections = await EssayPromptService.getUserSelectionsForSchool(selectedSchool);
          setUserSelections(selections);

          // Convert prompts to essays format
          const essaysFromPrompts: Essay[] = prompts.map((prompt, index) => {
            const existingSelection = selections.find(s => s.prompt_number === prompt.prompt_number);
            const wordCount = existingSelection?.essay_content?.split(' ').length || 0;
            
            return {
              id: `${selectedSchool}-${prompt.prompt_number}`,
              title: `${selectedSchool} - ${prompt.prompt_number}`,
              prompt: prompt.prompt,
              wordCount: wordCount,
              wordLimit: parseInt(prompt.word_limit.split('-')[1] || '650'),
              status: existingSelection ? 'draft' : 'not_started',
              lastEdited: existingSelection ? 'Recently' : 'Never',
              feedback: 0,
              schoolName: selectedSchool,
              promptNumber: prompt.prompt_number
            };
          });

          setEssays(essaysFromPrompts);
        } catch (error) {
          console.error('Error fetching prompts:', error);
          toast({
            title: "Error",
            description: "Failed to load essay prompts for this school.",
            variant: "destructive"
          });
        }
      };

      fetchPrompts();
    }
  }, [selectedSchool, toast]);

  // Monitor ElevenLabs widget for conversation events
  useEffect(() => {
    const handleWidgetMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'elevenlabs-convai') {
        console.log('ElevenLabs widget message:', event.data);

        // Handle conversation start
        if (event.data.action === 'conversation_started') {
          const convId = event.data.conversationId;
          console.log('Conversation started:', convId);
          setConversationId(convId);
          setSessionStarted(true);
          setSessionStartTime(new Date());

          // Create conversation tracking record
          createConversationRecord(convId);
        }

        // Handle messages
        if (event.data.action === 'message_received') {
          const message = {
            source: event.data.source || 'ai',
            text: event.data.message || '',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, message]);
        }

        // Handle conversation end
        if (event.data.action === 'conversation_ended') {
          console.log('Conversation ended');
          setSessionStarted(false);
          setSessionStartTime(null);

          // Store conversation metadata
          if (conversationId) {
            storeConversationMetadata(conversationId);
          }
        }
      }
    };
    window.addEventListener('message', handleWidgetMessage);
    return () => window.removeEventListener('message', handleWidgetMessage);
  }, [conversationId]);

  // Cleanup function to handle conversation end
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStarted && conversationId) {
        console.log('Page unloading, storing conversation metadata');
        storeConversationMetadata(conversationId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also store metadata when component unmounts
      if (sessionStarted && conversationId) {
        console.log('Component unmounting, storing conversation metadata');
        storeConversationMetadata(conversationId);
      }
    };
  }, [sessionStarted, conversationId, messages]);

  // Create conversation record
  const createConversationRecord = async (convId: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          error
        } = await supabase.from('conversation_tracking').insert({
          conversation_id: convId,
          user_id: user.id,
          conversation_type: 'Brainstorming',
          conversation_started_at: new Date().toISOString(),
          metadata_retrieved: false
        });
        if (error) {
          console.error('Error creating conversation record:', error);
        } else {
          console.log('✅ Created essay brainstorming conversation record');
        }
      }
    } catch (error) {
      console.error('Error creating conversation record:', error);
    }
  };

  // Store conversation metadata
  const storeConversationMetadata = async (convId: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user && messages.length > 0) {
        // Create transcript from messages
        const transcriptText = messages.map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`).join('\n');

        // Store in conversation_metadata table
        const {
          error
        } = await supabase.from('conversation_metadata').upsert({
          conversation_id: convId,
          user_id: user.id,
          transcript: transcriptText,
          transcript_summary: transcriptText,
          created_at: new Date().toISOString()
        });
        if (error) {
          console.error('Error storing conversation metadata:', error);
        } else {
          console.log('✅ Stored brainstorming conversation metadata');

          // Update conversation tracking
          await supabase.from('conversation_tracking').update({
            metadata_retrieved: true,
            metadata_retrieved_at: new Date().toISOString(),
            conversation_ended_at: new Date().toISOString()
          }).eq('conversation_id', convId);
        }
      }
    } catch (error) {
      console.error('Error storing conversation metadata:', error);
    }
  };

  // Handle brainstorming summary generation
  const handleSummaryGenerated = (summary: BrainstormSummary) => {
    setBrainstormSummary(summary);
    setShowBrainstorming(false);
    
    // Convert summary to formatted text and add to essay content
    const summaryText = formatSummaryForEditor(summary);
    setEssayContent(prevContent => {
      const newContent = prevContent + (prevContent ? '\n\n' : '') + summaryText;
      return newContent;
    });
    
    toast({
      title: "Brainstorming Summary Added",
      description: "Your brainstorming summary has been added to the essay editor.",
    });
  };

  // Format summary for the text editor
  const formatSummaryForEditor = (summary: BrainstormSummary): string => {
    if (!selectedEssay) return '';
    
    let formattedText = `# Brainstorming Summary for ${selectedEssay.title}\n\n`;
    
    if (summary.key_themes.length > 0) {
      formattedText += `## Key Themes\n`;
      summary.key_themes.forEach(theme => {
        formattedText += `• ${theme}\n`;
      });
      formattedText += '\n';
    }
    
    if (summary.personal_stories.length > 0) {
      formattedText += `## Personal Stories\n`;
      summary.personal_stories.forEach(story => {
        formattedText += `• ${story}\n`;
      });
      formattedText += '\n';
    }
    
    if (summary.essay_angles.length > 0) {
      formattedText += `## Essay Angles\n`;
      summary.essay_angles.forEach(angle => {
        formattedText += `• ${angle}\n`;
      });
      formattedText += '\n';
    }
    
    if (summary.writing_prompts.length > 0) {
      formattedText += `## Writing Prompts\n`;
      summary.writing_prompts.forEach(prompt => {
        formattedText += `• ${prompt}\n`;
      });
      formattedText += '\n';
    }
    
    if (summary.structure_suggestions.length > 0) {
      formattedText += `## Structure Suggestions\n`;
      summary.structure_suggestions.forEach(suggestion => {
        formattedText += `• ${suggestion}\n`;
      });
      formattedText += '\n';
    }
    
    formattedText += `---\n\n# Essay Draft\n\n`;
    
    return formattedText;
  };

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
      
      toast({
        title: "Success",
        description: "Custom essay created successfully"
      });
    } catch (error) {
      console.error('Error creating custom essay:', error);
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
      
      toast({
        title: "Success",
        description: "Essay deleted successfully"
      });
      
      setShowDeleteDialog(false);
      setEssayToDelete(null);
    } catch (error) {
      console.error('Error deleting essay:', error);
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
      
      toast({
        title: "Migration Successful",
        description: "Your essay has been migrated to the new editor!"
      });
    } catch (error) {
      console.error('Error migrating essay:', error);
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
      
      toast({
        title: "Success",
        description: "New essay created from prompt!"
      });
    } catch (error) {
      console.error('Error creating essay from prompt:', error);
      toast({
        title: "Error",
        description: "Failed to create essay from prompt",
        variant: "destructive"
      });
    }
  };

  const handleSchoolChange = (schoolName: string) => {
    setSelectedSchool(schoolName);
    setSelectedEssay(null);
    setEssayContent('');
    persistEssaySelection(null); // Clear essay selection when school changes
    
    // Mobile navigation: move to prompts step when school is selected
    if (isMobile) {
      setMobileStep('prompts');
      setSelectedMobilePrompt(null);
      setShowMobileEditor(false);
    }
    
    // Persist to localStorage
    localStorage.setItem('essays_selected_school', schoolName);
  };
  const handleEssaySelect = async (essay: Essay) => {
    // Mobile navigation: move to editor step and set selected prompt
    if (isMobile) {
      setSelectedMobilePrompt(essay);
      setMobileStep('editor');
      setShowMobileEditor(false);
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
    try {
      // Find the prompt for this essay
      const prompt = essayPrompts.find(p => p.prompt_number === selectedEssay.promptNumber);
      if (!prompt) return;

      await EssayPromptService.savePromptSelection(selectedEssay.schoolName, prompt.college_name, prompt.prompt_number, prompt.prompt, prompt.word_limit, true, content);

      // Update essays list with new word count
      setEssays(prev => prev.map(essay => essay.id === selectedEssay.id ? {
        ...essay,
        wordCount: content.split(' ').length,
        status: 'draft'
      } : essay));
    } catch (error) {
      console.error('Error saving essay content:', error);
      toast({
        title: "Error",
        description: "Failed to save essay content.",
        variant: "destructive"
      });
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
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 animate-spin" />
                <span>Loading your schools...</span>
              </div>
            </div>
          </main>
        </div>
      </ProfileCompletionGuard>
      </OnboardingGuard>;
  }
  // Mobile UI Render
  if (isMobile) {
    return <OnboardingGuard pageName="Essays">
      <ProfileCompletionGuard pageName="Essays">
        <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 min-h-screen">
          
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
              
              <div className="space-y-3">
                {essays.length > 0 ? (
                  essays.map((essay, index) => {
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
                                {essay.promptNumber && `Prompt ${essay.promptNumber}`}
                              </h3>
                              <Badge className={`${getStatusColor(associatedNewEssay ? associatedNewEssay.status : essay.status)} text-xs ml-2 flex-shrink-0`}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(associatedNewEssay ? associatedNewEssay.status : essay.status)}
                                  <span className="capitalize">{(associatedNewEssay ? associatedNewEssay.status : essay.status).replace('_', ' ')}</span>
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
                  })
                ) : (
                  <Card className="p-8 text-center bg-muted/30">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No essay prompts found for this school
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
                  <div className="flex items-center p-4 border-b bg-background/95 backdrop-blur">
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
                        <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                          {selectedMobilePrompt.prompt}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            Word limit: {selectedMobilePrompt.wordLimit}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {selectedMobilePrompt.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="fixed inset-0 z-50 bg-background flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur">
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
                      <EnhancedEssayEditor 
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
                        wordLimit={650}
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

          {/* Brainstorming Modal - Same for mobile */}
          {showBrainstorming && selectedEssay && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-lg shadow-lg w-full h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Essay Brainstorming</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBrainstorming(false)}
                  >
                    ×
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <BrainstormChat
                    essayTitle={selectedEssay.title}
                    essayPrompt={selectedEssay.prompt}
                    targetCollege={selectedSchool}
                    onBack={() => setShowBrainstorming(false)}
                    onSummaryGenerated={handleSummaryGenerated}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </ProfileCompletionGuard>
    </OnboardingGuard>;
  }

  // Desktop UI (unchanged)
  return <OnboardingGuard pageName="Essays">
    <ProfileCompletionGuard pageName="Essays">
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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

        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            {/* Left Sidebar - Essay List */}
            <div className="col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Essays</h2>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {essays.length} total
                  </Badge>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-3 max-h-full overflow-y-auto">

                {/* Custom Essays Section */}
                {newEssays.filter(essay => essay.prompt_text && !essay.prompt_id).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground px-2">Custom Essays ({newEssays.filter(essay => essay.prompt_text && !essay.prompt_id).length})</h3>
                    {newEssays.filter(essay => essay.prompt_text && !essay.prompt_id).map((essay, index) => {
                      const isActive = selectedNewEssayId === essay.id;
                      
                      return (
                        <Card 
                          key={essay.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] animate-fade-in ${isActive ? 'bg-primary/10 shadow-md' : 'bg-card hover:bg-accent/50'}`} 
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => {
                            persistEssaySelection(essay.id);
                            setSelectedEssay(null);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <h3 className="text-sm font-medium leading-tight text-foreground line-clamp-2">
                                  {essay.title}
                                </h3>
                                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                  <Badge className={`${getStatusColor(essay.status)} text-xs`}>
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(essay.status)}
                                      <span className="capitalize">{essay.status.replace('_', ' ')}</span>
                                    </div>
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => openDeleteDialog(essay, e)}
                                    title="Delete essay"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Show custom prompt if available */}
                              {essay.prompt_text && (
                                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                  <div className="font-medium mb-1">Prompt:</div>
                                  <div className="line-clamp-2">{essay.prompt_text}</div>
                                </div>
                              )}
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>
                                    {essay.word_limit ? `${essay.word_count}/${essay.word_limit} words` : `${essay.word_count} words`}
                                  </span>
                                  <span>{new Date(essay.updated_at).toLocaleDateString()}</span>
                                </div>
                                
                                {/* Progress bar */}
                                {essay.word_limit && (
                                  <div className="w-full bg-muted rounded-full h-1.5">
                                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{
                                      width: `${Math.min(essay.word_count / parseInt(essay.word_limit) * 100, 100)}%`
                                    }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Essay Prompts Section */}
                {essays.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground px-2">Essay Prompts</h3>
                    {essays.map((essay, index) => {
                      // Check if this prompt has an associated new essay (from fixed prompts, not custom)
                      const associatedNewEssay = newEssays.find(e => 
                        (e.title === essay.title || 
                        (e.school_name === essay.schoolName && e.title.includes(essay.promptNumber || ''))) &&
                        !e.prompt_text // Only essays created from fixed prompts, not custom essays
                      );
                      const isActive = selectedNewEssayId && associatedNewEssay && selectedNewEssayId === associatedNewEssay.id;
                      
                      return (
                        <Card 
                          key={essay.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] animate-fade-in ${isActive ? 'bg-primary/10 shadow-md' : 'bg-card hover:bg-accent/50'}`} 
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => {
                            handleEssaySelect(essay);
                          }}
                        >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h3 className="text-sm font-medium leading-tight text-foreground line-clamp-2">
                              {essay.title}
                            </h3>
                            <Badge className={`${getStatusColor(associatedNewEssay ? associatedNewEssay.status : essay.status)} text-xs ml-2 flex-shrink-0`}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(associatedNewEssay ? associatedNewEssay.status : essay.status)}
                                <span className="capitalize">{(associatedNewEssay ? associatedNewEssay.status : essay.status).replace('_', ' ')}</span>
                              </div>
                            </Badge>
                          </div>
                          
                                                      <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {associatedNewEssay ? `${associatedNewEssay.word_count}/${essay.wordLimit} words` : `${essay.wordCount}/${essay.wordLimit} words`}
                                </span>
                                <span>{associatedNewEssay ? new Date(associatedNewEssay.updated_at).toLocaleDateString() : essay.lastEdited}</span>
                              </div>
                              
                              {/* Progress bar */}
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{
                            width: `${Math.min((associatedNewEssay ? associatedNewEssay.word_count : essay.wordCount) / essay.wordLimit * 100, 100)}%`
                          }} />
                              </div>
                            
                            {essay.feedback > 0 && <div className="flex items-center space-x-1 text-xs text-accent">
                                <MessageSquare className="h-3 w-3" />
                                <span>{essay.feedback} feedback</span>
                              </div>}

                          </div>
                        </div>
                      </CardContent>
                    </Card>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {newEssays.length === 0 && essays.length === 0 && (
                  <Card className="p-8 text-center bg-muted/30">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {selectedSchool ? 'No essays found for this school' : 'Select a school to see essays'}
                    </p>
                  </Card>
                )}
              </div>
            </div>

            {/* Center - Essay Editor */}
            <div className="col-span-9">
              {selectedNewEssayId ? (
                <EnhancedEssayEditor 
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
                  wordLimit={(() => {
                    const essay = newEssays.find(e => e.id === selectedNewEssayId);
                    if (essay?.word_limit && essay.word_limit !== 'No limit') {
                      return parseInt(essay.word_limit);
                    }
                    return 650; // Default word limit
                  })()}
                />
              ) : selectedEssay ? (
                <Card className="h-full shadow-sm bg-card">
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
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="shadow-sm"
                            onClick={() => setShowBrainstorming(true)}
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
                            AI Brainstorm
                          </Button>
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
                  
                  <CardContent className="p-0 h-full">
                    <Textarea placeholder="Start writing your essay here..." className="h-full min-h-[500px] resize-none border-0 rounded-none focus:ring-0 text-base leading-relaxed p-6" value={essayContent} onChange={e => handleEssayContentChange(e.target.value)} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full shadow-sm bg-gradient-to-br from-muted/30 to-muted/10">
                  <CardContent className="p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-6">
                      <PenTool className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Select an Essay</h3>
                    <p className="text-muted-foreground max-w-md">
                      Choose an essay from the list to start writing, or select a school to see available prompts
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

          </div>

          {/* Brainstorming Modal */}
          {showBrainstorming && selectedEssay && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Essay Brainstorming</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBrainstorming(false)}
                  >
                    ×
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <BrainstormChat
                    essayTitle={selectedEssay.title}
                    essayPrompt={selectedEssay.prompt}
                    targetCollege={selectedSchool}
                    onBack={() => setShowBrainstorming(false)}
                    onSummaryGenerated={handleSummaryGenerated}
                  />
                </div>
              </div>
            </div>
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
    </ProfileCompletionGuard>
    </OnboardingGuard>;
};
export default Essays;