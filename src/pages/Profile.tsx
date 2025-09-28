import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  useTestScores, 
  useGeographicPreferences, 
  useAIIntegration, 
  useProfileData,
  type TestScore,
  type GeographicPreference,
  type ProfileFormData
} from "@/hooks/profile";
import { 
  AIFormField, 
  TestScoreManager, 
  GeographicPreferencesManager, 
  MajorSelector,
  PersonalInfoSection,
  AcademicProfileSection,
  CollegePreferencesSection,
  FinancialInfoSection,
  AdditionalInfoSection
} from "@/components/profile/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  applying_to: z.enum(["Undergraduate", "MBA", "LLM", "PhD", "Masters"]).optional(),
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
  const { scores: satScores, loadScores: loadSATScores, addScore: addSATScore, deleteScore: deleteSATScore } = useTestScores('SAT');
  const { scores: actScores, loadScores: loadACTScores, addScore: addACTScore, deleteScore: deleteACTScore } = useTestScores('ACT');
  const { preferences: geographicPreferences, loadPreferences: loadGeographicPreferences, addPreference: addGeographicPreference, deletePreference: deleteGeographicPreference } = useGeographicPreferences();
  const { aiPopulatedFields, isAIPopulated, clearAIData, setAIPopulatedFields } = useAIIntegration();
  
  // Local state for form management
  const [isOnboardingCompletionFlow, setIsOnboardingCompletionFlow] = useState(false);
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
      applying_to: "Undergraduate",
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
    
    // Validate required fields based on application type
    const errors: Record<string, string> = {};
    
    // Always required fields
    if (!formData.full_name) errors.full_name = "Full name is required";
    if (!formData.email_address) errors.email_address = "Email address is required";
    if (!formData.country_code) errors.country_code = "Country code is required";
    if (!formData.phone_number) errors.phone_number = "Phone number is required";
    if (!formData.applying_to) errors.applying_to = "Please select what you're applying to";

    // Application-specific validation
    if (formData.applying_to === "Undergraduate") {
      if (!formData.high_school_name) errors.high_school_name = "High school name is required";
      if (!formData.high_school_graduation_year) errors.high_school_graduation_year = "High school graduation year is required";
      if (!formData.school_board) errors.school_board = "School board is required";
      if (!formData.year_of_study) errors.year_of_study = "Year of study is required";
      if (!formData.intended_majors) errors.intended_majors = "Intended major is required";
    } else if (['MBA', 'Masters', 'PhD', 'LLM'].includes(formData.applying_to)) {
      if (!formData.college_name) errors.college_name = "College name is required";
      if (!formData.college_graduation_year) errors.college_graduation_year = "College graduation year is required";
      if (!formData.college_gpa) errors.college_gpa = "College GPA is required";
      if (!formData.test_type) errors.test_type = "Test type is required";
      if (formData.test_type !== "Not yet taken" && !formData.test_score) {
        errors.test_score = "Test score is required";
      }
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

  // Clear test score when "Not yet taken" is selected
  useEffect(() => {
    const testType = form.watch("test_type");
    if (testType === "Not yet taken") {
      form.setValue("test_score", undefined);
    }
  }, [form.watch("test_type")]);

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
    // Check if user is coming from onboarding completion
    const onboardingFlow = localStorage.getItem('onboarding_completion_flow');
    if (onboardingFlow === 'true') {
      setIsOnboardingCompletionFlow(true);
      // Clear the flag
      localStorage.removeItem('onboarding_completion_flow');
    }
    
    
    loadProfile();
    loadSATScores();
    loadACTScores();
    loadGeographicPreferences();
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

      if (!data.full_name) errors.full_name = "Full name is required";
      if (!data.email_address) {
        errors.email_address = "Email address is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
        errors.email_address = "Please enter a valid email address";
      }
      if (!data.country_code) errors.country_code = "Country code is required";
      if (!data.phone_number) errors.phone_number = "Phone number is required";
      if (!data.applying_to) errors.applying_to = "Please select what you're applying to";

      // High school fields only required for Undergraduate applications
      if (data.applying_to === "Undergraduate") {
        if (!data.high_school_name) errors.high_school_name = "High school name is required";
        if (!data.school_board) errors.school_board = "School board is required";
        if (!data.year_of_study) errors.year_of_study = "Year of study is required";
      }
      
      // Conditional validation based on applying_to
      if (data.applying_to === "Undergraduate") {
        if (!data.intended_majors) errors.intended_majors = "Intended major is required";
      } else if (data.applying_to === "Masters") {
        if (!data.masters_field_of_focus) errors.masters_field_of_focus = "Field of focus is required";
        if (!data.college_name) errors.college_name = "College name is required";
        if (!data.college_graduation_year) errors.college_graduation_year = "College graduation year is required";
        if (!data.college_gpa) errors.college_gpa = "College GPA is required";
        if (!data.test_type) errors.test_type = "Test type is required";
        if (data.test_type && data.test_type !== "Not yet taken" && !data.test_score) {
          errors.test_score = "Test score is required";
        }
      } else if (data.applying_to === "PhD") {
        if (!data.masters_field_of_focus) errors.masters_field_of_focus = "Field of focus is required";
        if (!data.college_name) errors.college_name = "College name is required";
        if (!data.college_graduation_year) errors.college_graduation_year = "College graduation year is required";
        if (!data.college_gpa) errors.college_gpa = "College GPA is required";
        if (!data.test_type) errors.test_type = "Test type is required";
        if (data.test_type && data.test_type !== "Not yet taken" && !data.test_score) {
          errors.test_score = "Test score is required";
        }
      } else if (data.applying_to === "MBA" || data.applying_to === "LLM") {
        if (!data.college_name) errors.college_name = "College name is required";
        if (!data.college_graduation_year) errors.college_graduation_year = "College graduation year is required";
        if (!data.college_gpa) errors.college_gpa = "College GPA is required";
        if (!data.test_type) errors.test_type = "Test type is required";
        if (data.test_type && data.test_type !== "Not yet taken" && !data.test_score) {
          errors.test_score = "Test score is required";
        }
      }

      // Conditional validation based on year_of_study
      if (data.year_of_study === "Graduate") {
        if (!data.undergraduate_cgpa) {
          errors.undergraduate_cgpa = "Undergraduate CGPA is required";
        } else if (data.undergraduate_cgpa < 0 || data.undergraduate_cgpa > 10) {
          errors.undergraduate_cgpa = "CGPA must be between 0 and 10";
        }
      } else if (data.year_of_study === "11th" || data.year_of_study === "12th") {
        if (!data.class_10_score) {
          errors.class_10_score = "Class 10 Grade is required";
        } else if (data.class_10_score < 0 || data.class_10_score > 100) {
          errors.class_10_score = "Grade must be between 0 and 100";
        }
        if (!data.class_11_score) {
          errors.class_11_score = "Class 11 Grade is required";
        } else if (data.class_11_score < 0 || data.class_11_score > 100) {
          errors.class_11_score = "Grade must be between 0 and 100";
        }
        if (!data.class_12_half_yearly_score) {
          errors.class_12_half_yearly_score = "Class 12 Half-Yearly Grade is required";
        } else if (data.class_12_half_yearly_score < 0 || data.class_12_half_yearly_score > 100) {
          errors.class_12_half_yearly_score = "Grade must be between 0 and 100";
        }
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

      // If this is the onboarding completion flow or profile review, mark onboarding as complete and navigate to dashboard
      if (isOnboardingCompletionFlow || profileMode === 'review') {
        const success = await markOnboardingCompleted();
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
          {isOnboardingCompletionFlow 
            ? "Complete Your Profile" 
            : profileMode === 'review' 
              ? "Review Your Profile" 
              : "Profile"}
        </h1>
        <p className="text-muted-foreground">
          {isOnboardingCompletionFlow 
            ? "Great! You've completed your onboarding call. Now let's finalize your profile with the information we gathered. Please review and complete any missing required fields marked with *."
            : profileMode === 'review'
              ? "Please review your profile information and make any necessary changes. Once you're satisfied, click 'Complete Profile' to unlock all features."
              : "Complete your profile to start using Diya."
          }
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <PersonalInfoSection
            form={form}
            isAIPopulated={isAIPopulated}
            clearFieldError={clearFieldError}
            countryCodes={countryCodes}
          />

          {/* Academic Profile */}
          <AcademicProfileSection
            form={form}
            isAIPopulated={isAIPopulated}
            clearFieldError={clearFieldError}
            satScores={satScores}
            actScores={actScores}
            addSATScore={addSATScore}
            deleteSATScore={deleteSATScore}
            addACTScore={addACTScore}
            deleteACTScore={deleteACTScore}
          />

          {/* College Preferences */}
          <CollegePreferencesSection
            form={form}
            geographicPreferences={geographicPreferences}
            addGeographicPreference={(preference) => addGeographicPreference(preference.preference)}
            deleteGeographicPreference={deleteGeographicPreference}
          />

          {/* Financial Information */}
          <FinancialInfoSection form={form} />

          {/* Additional Undergraduate Information */}
          <AdditionalInfoSection form={form} />

          <div className="flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={loading}
              onClick={() => {
                if (isOnboardingCompletionFlow || profileMode === 'review') {
                  handleProfileCompletion();
                }
              }}
            >
              {loading 
                ? "Saving..." 
                : isOnboardingCompletionFlow 
                  ? "Save Profile" 
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