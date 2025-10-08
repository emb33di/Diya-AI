import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  useProfileData,
  type ProfileFormData
} from "@/hooks/profile";
import { 
  PersonalInfoSection
} from "@/components/profile/shared";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import OnboardingGuard from "@/components/OnboardingGuard";
import GradientBackground from "@/components/GradientBackground";
import { getValidApplyingToValues } from "@/utils/userProfileUtils";
import { OnboardingApiService } from "@/services/onboarding.api";

const profileSchema = z.object({
  // Personal Information
  full_name: z.string().min(1, "Full name is required"),
  preferred_name: z.string().optional(),
  email_address: z.string().email("Valid email address is required").min(1, "Email address is required"),
  country_code: z.string().min(1, "Country code is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  applying_to: z.enum(["undergraduate", "mba", "llm", "phd", "masters"]).optional(),
  masters_field_of_focus: z.string().optional(),
  
  // Academic Profile
  high_school_name: z.string().min(1, "High school name is required"),
  high_school_graduation_year: z.number().min(1900).max(2030).optional(),
  school_board: z.enum(["ICSE", "CBSE", "IB", "NIOS", "CISCE", "Other"], {
    required_error: "School board is required"
  }),
  year_of_study: z.enum(["11th", "12th", "Graduate"], {
    required_error: "Year of study is required"
  }),
  class_10_score: z.number().min(0).max(100).optional(),
  class_11_score: z.number().min(0).max(100).optional(),
  class_12_half_yearly_score: z.number().min(0).max(100).optional(),
  undergraduate_cgpa: z.number().min(0).max(10).optional(),
  intended_majors: z.string().min(1, "Intended major is required"),
  college_name: z.string().optional(),
  college_graduation_year: z.number().min(1900).max(2030).optional(),
  college_gpa: z.number().optional(),
  test_type: z.enum(["GRE", "GMAT", "LSAT", "Not yet taken"]).optional(),
  test_score: z.number().min(0).max(340).optional(),
  
  // College Preferences
  ideal_college_size: z.enum(["not_specified", "Small (< 2,000 students)", "Medium (2,000 - 15,000 students)", "Large (> 15,000 students)"]).optional(),
  ideal_college_setting: z.enum(["not_specified", "Urban", "Suburban", "Rural", "College Town"]).optional(),
  must_haves: z.string().optional(),
  deal_breakers: z.string().optional(),
  
  // Financial Information
  looking_for_scholarships: z.enum(["yes", "no"]).optional(),
  looking_for_financial_aid: z.enum(["yes", "no"]).optional(),
  
  // Additional Undergraduate Prompt Fields
  extracurricular_activities: z.string().optional(),
  leadership_roles: z.string().optional(),
  personal_projects: z.string().optional(),
  application_concerns: z.string().optional(),
  specific_questions: z.string().optional(),
});

// ProfileFormData type is imported from hooks


// popularMajorsForIndianStudents array removed - handled by MajorSelector component

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "United States/Canada", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+218", country: "Libya", flag: "🇱🇾" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+268", country: "Swaziland", flag: "🇸🇿" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+290", country: "Saint Helena", flag: "🇸🇭" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  { code: "+297", country: "Aruba", flag: "🇦🇼" },
  { code: "+298", country: "Faroe Islands", flag: "🇫🇴" },
  { code: "+299", country: "Greenland", flag: "🇬🇱" },
];

export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { markOnboardingCompleted, onboardingCompleted } = useAuth();
  
  // Use extracted hooks
  const { profileData, loading, isCreatingProfile, loadProfile, saveProfile, setProfileData } = useProfileData();
  
  // Local state for form management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileMode, setProfileMode] = useState<'edit' | 'review'>('edit');

  const form = useForm<ProfileFormData>({
    // Remove zodResolver to prevent automatic validation
    // resolver: zodResolver(profileSchema),
    defaultValues: {
      // Personal Information
      full_name: "",
      email_address: "",
      country_code: "+91",
      phone_number: "",
      applying_to: "undergraduate",
      masters_field_of_focus: "",
      
      // Academic Profile
      high_school_name: "",
      high_school_graduation_year: undefined,
      school_board: undefined,
      year_of_study: undefined,
      class_10_score: undefined,
      class_11_score: undefined,
      class_12_half_yearly_score: undefined,
      undergraduate_cgpa: undefined,
      intended_majors: "",
      college_name: "",
      college_graduation_year: undefined,
      college_gpa: undefined,
      test_type: "Not yet taken" as const,
      test_score: undefined,
      
      // College Preferences
      ideal_college_size: "not_specified",
      ideal_college_setting: "not_specified",
      must_haves: "",
      deal_breakers: "",
      
      // Financial Information
      looking_for_scholarships: undefined,
      looking_for_financial_aid: undefined,
      
      // Additional Undergraduate Prompt Fields
      extracurricular_activities: "",
      leadership_roles: "",
      personal_projects: "",
      application_concerns: "",
      specific_questions: "",
    },
  });


  // Handle profile completion flow
  const handleProfileCompletion = async () => {
    const formData = form.getValues();
    
    // Validate only visible fields from Personal Information section
    const errors: Record<string, string> = {};
    
    // Always required fields (visible in Personal Information section)
    if (!formData.full_name) errors.full_name = "Full name is required";
    if (!formData.country_code) errors.country_code = "Country code is required";
    if (!formData.phone_number) errors.phone_number = "Phone number is required";

    // Application-specific validation for visible fields only
    if (formData.applying_to === "undergraduate") {
      if (!formData.intended_majors) errors.intended_majors = "Intended major is required";
    } else if (['masters', 'phd'].includes(formData.applying_to)) {
      if (!formData.masters_field_of_focus) errors.masters_field_of_focus = "Field of focus is required";
    }

    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach(field => {
        form.setError(field as keyof ProfileFormData, {
          type: "manual",
          message: errors[field]
        });
      });
      return;
    }

    // Save profile and mark onboarding as complete
    await onSubmit(formData);
  };


  // Watch for form changes to track unsaved changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      // Only mark as having changes if we have meaningful data (not just default values)
      const hasData = Object.values(data).some(value => 
        value !== undefined && value !== "" && value !== null && 
        (Array.isArray(value) ? value.length > 0 : true)
      );
      
      if (hasData) {
        setHasUnsavedChanges(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Function to clear error for a specific field when user starts typing
  const clearFieldError = (fieldName: keyof ProfileFormData) => {
    if (form.formState.errors[fieldName]) {
      form.clearErrors(fieldName);
    }
  };

  // Filter majors based on search query
  // Major selection functions are now handled by MajorSelector component



  useEffect(() => {
    loadProfile();
  }, []);

  // Populate form when profileData is loaded
  useEffect(() => {
    if (profileData) {
      // Reset form with loaded data
      form.reset(profileData);
    }
  }, [profileData, form]);

  // Check if user has completed onboarding but not profile
  useEffect(() => {
    if (onboardingCompleted && !profileData) {
      setProfileMode('review');
    }
  }, [onboardingCompleted, profileData]);


  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Click "Save Profile" to save your data before leaving.';
        return 'You have unsaved changes. Click "Save Profile" to save your data before leaving.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);




  const onSubmit = async (data: ProfileFormData) => {
    let user: any = null;
    try {
      // Loading state is managed by the hook
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
      if (!user) {
        console.error(`[AUTH_ERROR] ${new Date().toISOString()} - No user found when trying to save profile`);
        return;
      }

      const errors: Record<string, string> = {};

      // Validate only visible fields from Personal Information section
      if (!data.full_name) errors.full_name = "Full name is required";
      if (!data.country_code) errors.country_code = "Country code is required";
      if (!data.phone_number) errors.phone_number = "Phone number is required";

      // Application-specific validation for visible fields only
      if (data.applying_to === "undergraduate") {
        if (!data.intended_majors) errors.intended_majors = "Intended major is required";
      } else if (['masters', 'phd'].includes(data.applying_to)) {
        if (!data.masters_field_of_focus) errors.masters_field_of_focus = "Field of focus is required";
      }

      // If there are validation errors, set them and return
      if (Object.keys(errors).length > 0) {
        Object.keys(errors).forEach(field => {
          form.setError(field as keyof ProfileFormData, {
            type: "manual",
            message: errors[field]
          });
        });
        // Loading state is managed by the hook
        return;
      }

      // Combine country code and phone number into a single field
      const combinedPhoneNumber = data.country_code && data.phone_number 
        ? `${data.country_code}${data.phone_number}` 
        : data.phone_number;

      // Convert Date to string for database
      const { geographic_preference, ...dataWithoutGeographicPreference } = data;
      
      // Convert "not_specified" values to null for database storage
      const processedData = { ...dataWithoutGeographicPreference };
      const notSpecifiedFields = ['ideal_college_size', 'ideal_college_setting'];
      
      notSpecifiedFields.forEach(field => {
        if (processedData[field] === 'not_specified') {
          processedData[field] = null;
        }
      });
      
      // Convert empty strings to null for numeric fields
      const numericFields = ['high_school_graduation_year', 'undergraduate_cgpa', 'college_graduation_year', 'college_gpa', 'test_score'];
      
      numericFields.forEach(field => {
        if (processedData[field] === '') {
          processedData[field] = null;
        }
      });
      
      const profileData = {
        ...processedData,
        phone_number: combinedPhoneNumber,
        user_id: user.id,
        // Don't set profile_saved here - only set it during initial onboarding completion
      };

      // Check if user_profiles record exists
      const { data: existingProfile, error: checkError } = await (supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id as any)
        .maybeSingle() as any);

      if (checkError) {
        console.error(`[PROFILE_CHECK_ERROR] ${new Date().toISOString()} - Failed to check existing profile for user ${user.id} (${data.email_address})`);
        console.error(`Error details: ${checkError.message}`);
      }

      // Save detailed profile to user_profiles table
      let savedProfile;
      try {
        const { data, error: userProfileError } = await supabase
          .from("user_profiles")
          .upsert(profileData as any, {
            onConflict: 'user_id'
          })
          .select();
        
        savedProfile = data;

        if (userProfileError) {
          console.error(`[PROFILE_SAVE_ERROR] ${new Date().toISOString()} - Failed to save profile to database`);
          console.error(`User: ${user.id} (${profileData.email_address})`);
          console.error(`Error Code: ${userProfileError.code}`);
          console.error(`Error Message: ${userProfileError.message}`);
          if (userProfileError.details) console.error(`Details: ${userProfileError.details}`);
          if (userProfileError.hint) console.error(`Hint: ${userProfileError.hint}`);
          throw userProfileError;
        }
      } catch (error) {
        console.error(`[PROFILE_SAVE_EXCEPTION] ${new Date().toISOString()} - Unexpected error while saving profile`);
        console.error(`User: ${user.id} (${profileData.email_address})`);
        console.error(`Exception:`, error);
        throw error;
      }

      // Clear any existing form errors
      form.clearErrors();

      // Clear unsaved changes flag after successful save
      setHasUnsavedChanges(false);

      toast({
        title: existingProfile ? "Profile updated" : "Profile created",
        description: existingProfile 
          ? "Your profile has been updated successfully." 
          : "Your profile has been created and saved successfully.",
      });

      // Trigger a profile completion refresh to update navbar state
      // This will cause the useProfileCompletion hook to recalculate completion percentage
      window.dispatchEvent(new CustomEvent('profileUpdated'));

      // If this is profile review, mark onboarding as complete and navigate to dashboard
      if (profileMode === 'review') {
        const success = await markOnboardingCompleted(false); // Normal completion, not skipped
        if (success) {
          toast({
            title: "Saved Profile!",
            description: "Welcome to your dashboard! You can now access all features.",
          });
          navigate('/dashboard');
        } else {
          toast({
            title: "Error",
            description: "Failed to complete profile. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error(`[PROFILE_SUBMIT_ERROR] ${new Date().toISOString()} - Profile submission failed`);
      console.error(`User: ${user?.id || 'Not authenticated'} (${profileData?.email_address || 'No email provided'})`);
      console.error(`Error:`, error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Loading state is managed by the hook
    }
  };


  return (
    <OnboardingGuard pageName="Profile">
      <GradientBackground>
        <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {profileMode === 'review' ? "Review Your Profile" : "Profile"}
        </h1>
        <p className="text-muted-foreground">
          {profileMode === 'review'
            ? "Please review your profile information and make any necessary changes. Once you're satisfied, click 'Complete Profile' to unlock all features."
            : "Complete your profile to start using Diya."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <PersonalInfoSection
            form={form}
            isAIPopulated={() => false}
            clearFieldError={clearFieldError}
            countryCodes={countryCodes}
          />

          <div className="flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={loading}
              onClick={() => {
                if (profileMode === 'review') {
                  handleProfileCompletion();
                }
              }}
            >
              {loading 
                ? "Saving..." 
                : profileMode === 'review'
                  ? "Save Profile"
                  : "Save Profile"
              }
            </Button>
          </div>
        </form>
      </Form>
      </div>
        </GradientBackground>
    </OnboardingGuard>
  );
}