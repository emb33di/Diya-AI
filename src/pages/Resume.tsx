import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import OnboardingGuard from "@/components/OnboardingGuard";
import GradientBackground from "@/components/GradientBackground";
import MobileResponsiveWrapper from "@/components/MobileResponsiveWrapper";
import ResumePreview from "@/components/ResumePreview";
import AddActivityDropdown from "@/components/AddActivityDropdown";
import ActivityEditor from "@/components/ActivityEditor";
import { 
  CheckCircle,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useResumeEditor } from "@/hooks/useResumeEditor";
import { supabase } from "@/integrations/supabase/client";


const Resume = () => {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string;
    email_address?: string;
    phone_number?: string;
  } | null>(null);
  const { toast } = useToast();

  // Use the simplified resume editor hook
  const {
    resumeData,
    loading: resumeLoading,
    saving,
    lastSaved,
    saveError,
    addActivity,
    updateActivity,
    removeActivity
  } = useResumeEditor();

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);


  // Load user profile data
  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('full_name, email_address, phone_number')
        .eq('user_id' as any, user.id as any)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[RESUME_ERROR] Failed to load user profile:', {
          userId: user?.id || 'unknown',
          userEmail: user?.email || 'unknown',
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User profile data could not be loaded for resume generation'
        });
        return;
      }

      if (profileData && !('code' in profileData)) {
        setUserProfile(profileData as any);
      }
    } catch (error) {
      console.error('[RESUME_ERROR] Failed to load user profile:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User profile data could not be loaded for resume generation'
      });
    }
  };

  // Function to preview the resume HTML
  const previewResume = () => {
    setShowPreviewDialog(true);
  };

  return (
    <OnboardingGuard pageName="Resume">
        <GradientBackground>
          <MobileResponsiveWrapper>
            <main className="container mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-display font-bold">Resume Review</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Edit and download your resume in the perfect format that your target schools are looking for!
              </p>
            </div>


            {/* Add Activity Dropdown and Action Buttons */}
            <div className="mb-6 flex items-center justify-between">
              <AddActivityDropdown onActivitySelect={(category) => {
                addActivity(category.toLowerCase());
              }} />
              <div className="flex items-center space-x-3">
                {/* Saved timestamp */}
                {lastSaved && !saving && !saveError && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                
                <Button 
                  onClick={previewResume}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview & Download PDF</span>
                </Button>
              </div>
            </div>

            {/* Resume Editor */}
            <div className="space-y-6">
              {/* Display all activity categories */}
              {Object.entries(resumeData).map(([category, activities]) => (
                activities.length > 0 && (
                  <div key={category} className="space-y-4">
                    <h3 className="text-xl font-semibold capitalize">
                      {category === 'academic' ? 'Academic Experience' :
                       category === 'experience' ? 'Work Experience' :
                       category === 'projects' ? 'Projects' :
                       category === 'extracurricular' ? 'Extracurriculars' :
                       category === 'volunteering' ? 'Volunteer Experience' :
                       category === 'skills' ? 'Skills' :
                       category === 'interests' ? 'Interests' :
                       category === 'languages' ? 'Languages' : category}
                    </h3>
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <ActivityEditor
                          key={activity.id}
                          activity={activity}
                          category={category}
                          onUpdate={(activityId, updatedActivity) => 
                            updateActivity(category, activityId, updatedActivity)
                          }
                          onRemove={(activityId) => 
                            removeActivity(category, activityId)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              ))}
              
              {/* Show message when no activities are added */}
              {Object.values(resumeData).every(activities => activities.length === 0) && (
                <Card className="shadow-lg">
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg mb-2">Resume Editor</p>
                      <p className="text-sm">Use the "Add Activity" button above to start building your resume</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            </main>
          </MobileResponsiveWrapper>

      {/* Resume Preview Dialog */}
      <ResumePreview
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        resumeData={resumeData}
        userProfile={userProfile}
      />
        </GradientBackground>
    </OnboardingGuard>
  );
};

export default Resume;
