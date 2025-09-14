import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

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
import { debugSupabase406, testCreateUserProfile } from "@/utils/debugSupabase";

const profileSchema = z.object({
  // Personal Information
  full_name: z.string().min(1, "Full name is required"),
  preferred_name: z.string().optional(),
  email_address: z.string().email("Valid email address is required").min(1, "Email address is required"),
  country_code: z.string().min(1, "Country code is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  applying_to: z.enum(["Undergraduate Colleges", "MBA", "LLM", "PhD", "Masters"], {
    required_error: "Please select what you're applying to"
  }),
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
  ideal_college_size: z.enum(["Small (< 2,000 students)", "Medium (2,000 - 15,000 students)", "Large (> 15,000 students)"]).optional(),
  ideal_college_setting: z.enum(["Urban", "Suburban", "Rural", "College Town"]).optional(),
  geographic_preference: z.enum(["In-state", "Out-of-state", "Northeast", "West Coast", "No Preference"]).optional(),
  must_haves: z.string().optional(),
  deal_breakers: z.string().optional(),
  
  // Financial Information
  college_budget: z.enum(["< $20,000", "$20,000 - $35,000", "$35,000 - $50,000", "$50,000 - $70,000", "> $70,000"]).optional(),
  financial_aid_importance: z.enum(["Crucial", "Very Important", "Somewhat Important", "Not a factor"]).optional(),
  scholarship_interests: z.array(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;


interface TestScore {
  id?: string;
  score: number;
  year_taken: number;
}

const scholarshipOptions = [
  "Merit-based",
  "Need-based", 
  "Athletic",
  "Artistic Talent",
  "STEM",
  "First-generation",
  "Community Service",
  "Ethnicity"
];

const popularMajorsForIndianStudents = [
  "Computer Science",
  "Data Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Software Engineering",
  "Information Technology",
  "Cybersecurity",
  "Computer Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Aerospace Engineering",
  "Biomedical Engineering",
  "Industrial Engineering",
  "Materials Science Engineering",
  "Environmental Engineering",
  "Petroleum Engineering",
  "Nuclear Engineering",
  "Robotics Engineering",
  "Business Administration",
  "Finance",
  "Accounting",
  "Marketing",
  "Management",
  "International Business",
  "Economics",
  "Supply Chain Management",
  "Human Resources",
  "Operations Research",
  "Statistics",
  "Mathematics",
  "Applied Mathematics",
  "Actuarial Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Biochemistry",
  "Biotechnology",
  "Microbiology",
  "Genetics",
  "Neuroscience",
  "Psychology",
  "Public Health",
  "Health Administration",
  "Nursing",
  "Pharmacy",
  "Medicine (Pre-med)",
  "Dentistry (Pre-dental)",
  "Veterinary Science",
  "Architecture",
  "Urban Planning",
  "Graphic Design",
  "Digital Media",
  "Film Studies",
  "Journalism",
  "Mass Communication",
  "Public Relations",
  "Advertising",
  "English Literature",
  "Creative Writing",
  "Political Science",
  "International Relations",
  "Public Policy",
  "Law (Pre-law)",
  "Criminal Justice",
  "Social Work",
  "Sociology",
  "Anthropology",
  "History",
  "Geography",
  "Philosophy",
  "Religious Studies",
  "Education",
  "Elementary Education",
  "Secondary Education",
  "Special Education",
  "Educational Psychology",
  "Agricultural Sciences",
  "Food Science",
  "Nutrition",
  "Hospitality Management",
  "Tourism Management",
  "Sports Management",
  "Exercise Science",
  "Kinesiology",
  "Music",
  "Fine Arts",
  "Art History",
  "Theater",
  "Dance",
  "Fashion Design",
  "Interior Design",
  "Landscape Architecture",
  "Environmental Science",
  "Sustainability Studies",
  "Renewable Energy",
  "Geology",
  "Meteorology",
  "Astronomy",
  "Astrophysics",
  "Other"
];

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
  const { markOnboardingCompleted, onboardingCompleted } = useOnboardingStatus();
  const [loading, setLoading] = useState(false);
  const [satScores, setSatScores] = useState<TestScore[]>([]);
  const [actScores, setActScores] = useState<TestScore[]>([]);
  const [newSatScore, setNewSatScore] = useState<TestScore>({ score: 0, year_taken: new Date().getFullYear() });
  const [newActScore, setNewActScore] = useState<TestScore>({ score: 0, year_taken: new Date().getFullYear() });
  const [isOnboardingCompletionFlow, setIsOnboardingCompletionFlow] = useState(false);
  const [majorSearchQuery, setMajorSearchQuery] = useState("");
  const [showOtherMajorInput, setShowOtherMajorInput] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileMode, setProfileMode] = useState<'edit' | 'review'>('edit');
  const [profileData, setProfileData] = useState<ProfileFormData | null>(null);

  // Note: We intentionally don't use local storage for auto-saving
  // Users must manually save their changes to persist them

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
    if (formData.applying_to === "Undergraduate Colleges") {
      if (!formData.high_school_name) errors.high_school_name = "High school name is required";
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

  const form = useForm<ProfileFormData>({
    // Remove zodResolver to prevent automatic validation
    // resolver: zodResolver(profileSchema),
    defaultValues: {
      // Personal Information
      full_name: "",
      preferred_name: "",
      email_address: "",
      country_code: "+91",
      phone_number: "",
      applying_to: "Undergraduate Colleges" as const,
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
      ideal_college_size: undefined,
      ideal_college_setting: undefined,
      geographic_preference: undefined,
      must_haves: "",
      deal_breakers: "",
      
      // Financial Information
      college_budget: undefined,
      financial_aid_importance: undefined,
      scholarship_interests: [],
    },
  });

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
  const filteredMajors = popularMajorsForIndianStudents.filter(major =>
    major.toLowerCase().includes(majorSearchQuery.toLowerCase())
  );

  // Handle major selection
  const handleMajorSelection = (selectedMajor: string) => {
    if (selectedMajor === "Other") {
      setShowOtherMajorInput(true);
      form.setValue("intended_majors", "");
    } else {
      setShowOtherMajorInput(false);
      form.setValue("intended_majors", selectedMajor);
      clearFieldError("intended_majors");
    }
    setMajorSearchQuery("");
  };

  useEffect(() => {
    // Check if user is coming from onboarding completion
    const onboardingFlow = localStorage.getItem('onboarding_completion_flow');
    if (onboardingFlow === 'true') {
      setIsOnboardingCompletionFlow(true);
      // Clear the flag
      localStorage.removeItem('onboarding_completion_flow');
    }
    
    // Debug Supabase 406 errors (temporarily disabled)
    // debugSupabase406().then(result => {
    //   console.log('🔍 Supabase debug result:', result);
    // });
    
    loadProfile();
    loadSATScores();
    loadACTScores();
  }, []);

  // Check if user has completed onboarding but not profile
  useEffect(() => {
    if (onboardingCompleted && !profileData) {
      setProfileMode('review');
    }
  }, [onboardingCompleted, profileData]);

  // Note: We intentionally don't load from local storage on mount
  // Users must manually save their changes to persist them

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

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Auth error in loadProfile:', userError);
        return;
      }
      if (!user) {
        console.warn('⚠️ No user found in loadProfile - user might not be authenticated');
        // Redirect to auth page if not authenticated
        navigate('/auth');
        return;
      }
      console.log('✅ User found in loadProfile:', user.id);

      // Load detailed profile from user_profiles table
      let { data: detailedProfile, error: detailedError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();


      // Load basic profile from profiles table
      const { data: basicProfile, error: basicError } = await supabase
        .from("profiles")
        .select("full_name, onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();

      if (detailedError && detailedError.code !== "PGRST116") {
        console.warn("Error loading detailed profile:", detailedError);
        // Don't throw error, just log it and continue
      }
      if (basicError && basicError.code !== "PGRST116") {
        console.warn("Error loading basic profile:", basicError);
        // Don't throw error, just log it and continue
      }

      // If no user_profiles record exists but we have basic profile data, create a minimal user_profiles record
      // Multiple safeguards against duplicates:
      // 1. Check if record already exists (!detailedProfile)
      // 2. Check if we're already creating one (!isCreatingProfile)
      // 3. Use upsert with onConflict to handle race conditions
      // 4. Database has UNIQUE(user_id) constraint as final safeguard
      if (!detailedProfile && basicProfile && !isCreatingProfile) {
        console.log("Creating initial user_profiles record...");
        setIsCreatingProfile(true);
        
        // Use upsert to prevent duplicates and handle race conditions
        const { data: upsertedProfile, error: createError } = await supabase
          .from("user_profiles")
          .upsert({
            user_id: user.id,
            full_name: basicProfile.full_name || user.user_metadata?.full_name || "",
            email_address: user.email || "",
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (createError) {
          console.warn("Error creating initial user_profiles record:", createError);
          // If it's a duplicate key error, that's actually fine - just reload the existing record
          if (createError.code === '23505') { // Unique violation
            console.log("Record already exists, reloading...");
            const { data: existingProfile } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();
            
            if (existingProfile) {
              detailedProfile = existingProfile;
            }
          }
        } else {
          console.log("Initial user_profiles record created successfully:", upsertedProfile);
          detailedProfile = upsertedProfile;
          
          // Show a subtle notification that the profile was initialized
          toast({
            title: "Profile initialized",
            description: "Your profile has been set up. You can now fill out the details below.",
            variant: "default",
          });
        }
        
        setIsCreatingProfile(false);
      }

      // Combine data from both tables, prioritizing user_profiles data
      const combinedProfile = {
        ...detailedProfile,
        // Override with basic profile data if available
        full_name: basicProfile?.full_name || detailedProfile?.full_name || user.user_metadata?.full_name || "",
        email_address: detailedProfile?.email_address || user.email || "",
      };

      if (combinedProfile) {
      // Convert database values to form values
      const formData: any = { ...combinedProfile };
        if (combinedProfile.high_school_graduation_year) {
          formData.high_school_graduation_year = Number(combinedProfile.high_school_graduation_year);
        }
        if (combinedProfile.class_10_score) {
          formData.class_10_score = Number(combinedProfile.class_10_score);
        }
        if (combinedProfile.class_11_score) {
          formData.class_11_score = Number(combinedProfile.class_11_score);
        }
        if (combinedProfile.class_12_half_yearly_score) {
          formData.class_12_half_yearly_score = Number(combinedProfile.class_12_half_yearly_score);
        }
        if (combinedProfile.undergraduate_cgpa) {
          formData.undergraduate_cgpa = Number(combinedProfile.undergraduate_cgpa);
        }
        
        // Parse combined phone number back into country code and phone number
        if (combinedProfile.phone_number) {
          const phoneNumber = combinedProfile.phone_number;
          // Check if phone number starts with a country code (starts with +)
          if (phoneNumber.startsWith('+')) {
            // Find the country code by matching against our country codes list
            const matchingCountry = countryCodes.find(country => 
              phoneNumber.startsWith(country.code)
            );
            
            if (matchingCountry) {
              formData.country_code = matchingCountry.code;
              formData.phone_number = phoneNumber.substring(matchingCountry.code.length);
            } else {
              // If no matching country code found, default to +91 and treat entire number as phone
              formData.country_code = "+91";
              formData.phone_number = phoneNumber.substring(1); // Remove the + if present
            }
          } else {
            // If no + prefix, assume it's just the phone number and default to +91
            formData.country_code = "+91";
            formData.phone_number = phoneNumber;
          }
        }
        
        // Check if the intended_majors value is in our popular majors list
        if (formData.intended_majors && !popularMajorsForIndianStudents.includes(formData.intended_majors)) {
          // If it's not in the list, it's a custom "Other" major
          setShowOtherMajorInput(true);
        }

        // Sanitize form data to prevent controlled/uncontrolled input warnings
        const sanitizedFormData = {
          ...formData,
          // Personal Information
          full_name: formData.full_name ?? "",
          preferred_name: formData.preferred_name ?? "",
          email_address: formData.email_address ?? "",
          phone_number: formData.phone_number ?? "",
          country_code: formData.country_code ?? "+91",
          applying_to: formData.applying_to ?? "Undergraduate Colleges",
          masters_field_of_focus: formData.masters_field_of_focus ?? "",
          
          // Academic Profile
          high_school_name: formData.high_school_name ?? "",
          high_school_graduation_year: formData.high_school_graduation_year ?? undefined,
          school_board: formData.school_board ?? undefined,
          year_of_study: formData.year_of_study ?? undefined,
          class_10_score: formData.class_10_score ?? undefined,
          class_11_score: formData.class_11_score ?? undefined,
          class_12_half_yearly_score: formData.class_12_half_yearly_score ?? undefined,
          undergraduate_cgpa: formData.undergraduate_cgpa ?? undefined,
          intended_majors: formData.intended_majors ?? "",
          college_name: formData.college_name ?? "",
          college_graduation_year: formData.college_graduation_year ?? undefined,
          college_gpa: formData.college_gpa ?? undefined,
          test_type: formData.test_type ?? "Not yet taken",
          test_score: formData.test_score ?? undefined,
          
          // College Preferences
          ideal_college_size: formData.ideal_college_size ?? undefined,
          ideal_college_setting: formData.ideal_college_setting ?? undefined,
          geographic_preference: formData.geographic_preference ?? undefined,
          must_haves: formData.must_haves ?? "",
          deal_breakers: formData.deal_breakers ?? "",
          
          // Financial Information
          college_budget: formData.college_budget ?? undefined,
          financial_aid_importance: formData.financial_aid_importance ?? undefined,
          scholarship_interests: Array.isArray(formData.scholarship_interests) ? formData.scholarship_interests : [],
        };

        // Load server data directly (no local storage merging)
        form.reset(sanitizedFormData);
        setProfileData(sanitizedFormData);
      } else {
        console.log("No profile data found to load");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };



  const onSubmit = async (data: ProfileFormData) => {
    console.log("onSubmit called with data:", data);
    console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
    console.log("Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing");
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User:", user);
      if (!user) {
        console.log("No user found, returning");
        return;
      }

      console.log("Starting validation...");
      const errors: Record<string, string> = {};
      
      // Always required fields
      console.log("Validating required fields:", {
        full_name: data.full_name,
        email_address: data.email_address,
        country_code: data.country_code,
        phone_number: data.phone_number,
        applying_to: data.applying_to
      });

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
      if (data.applying_to === "Undergraduate Colleges") {
        if (!data.high_school_name) errors.high_school_name = "High school name is required";
        if (!data.school_board) errors.school_board = "School board is required";
        if (!data.year_of_study) errors.year_of_study = "Year of study is required";
      }
      
      // Conditional validation based on applying_to
      if (data.applying_to === "Undergraduate Colleges") {
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
        console.log("Validation errors found:", errors);
        Object.keys(errors).forEach(field => {
          form.setError(field as keyof ProfileFormData, {
            type: "manual",
            message: errors[field]
          });
        });
        setLoading(false);
        return;
      }
      console.log("Validation passed successfully");

      // Combine country code and phone number into a single field
      const combinedPhoneNumber = data.country_code && data.phone_number 
        ? `${data.country_code}${data.phone_number}` 
        : data.phone_number;

      // Convert Date to string for database
      const profileData = {
        ...data,
        phone_number: combinedPhoneNumber,
        user_id: user.id,
      };

      // Check if user_profiles record exists
      console.log("Checking for existing profile...");
      const { data: existingProfile, error: checkError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) {
        console.warn("Error checking existing profile:", checkError);
        console.error("Check error details:", JSON.stringify(checkError, null, 2));
      }

      console.log("Existing profile check result:", { existingProfile, checkError });

      // Save detailed profile to user_profiles table
      console.log("Attempting to save profile data:", JSON.stringify(profileData, null, 2));
      let savedProfile;
      try {
        const { data, error: userProfileError } = await supabase
          .from("user_profiles")
          .upsert(profileData, {
            onConflict: 'user_id'
          })
          .select();
        
        console.log("Upsert response:", { data, userProfileError });
        savedProfile = data;

        if (userProfileError) {
          console.error("Detailed error from upsert:", {
            code: userProfileError.code,
            message: userProfileError.message,
            details: userProfileError.details,
            hint: userProfileError.hint
          });
          throw userProfileError;
        }
      } catch (error) {
        console.error("Exception during upsert:", error);
        throw error;
      }

      console.log("Profile saved successfully:", savedProfile);

      // Also update the basic profile table with full_name if it exists
      if (data.full_name) {
        const { error: basicProfileError } = await supabase
          .from("profiles")
          .update({ full_name: data.full_name })
          .eq('user_id', user.id);

        if (basicProfileError) {
          console.warn("Error updating basic profile:", basicProfileError);
          // Don't throw here as the main profile was saved successfully
        }
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
      console.log("Triggering profile completion refresh...");
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
      console.error("Error saving profile:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSATScores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: scores, error } = await supabase
        .from("sat_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("year_taken", { ascending: false });

      if (error) {
        console.error("Error loading SAT scores:", error);
        return;
      }

      setSatScores(scores || []);
    } catch (error) {
      console.error("Error loading SAT scores:", error);
    }
  };

  const loadACTScores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: scores, error } = await supabase
        .from("act_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("year_taken", { ascending: false });

      if (error) {
        console.error("Error loading ACT scores:", error);
        return;
      }

      setActScores(scores || []);
    } catch (error) {
      console.error("Error loading ACT scores:", error);
    }
  };

  const addSATScore = async () => {
    if (!newSatScore.score || !newSatScore.year_taken) {
      toast({
        title: "Error",
        description: "Please fill in all SAT score fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sat_scores")
        .insert({
          ...newSatScore,
          user_id: user.id,
        });

      if (error) throw error;

      setNewSatScore({ score: 0, year_taken: new Date().getFullYear() });
      loadSATScores();
      toast({
        title: "SAT score added",
        description: "SAT score has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding SAT score:", error);
      toast({
        title: "Error",
        description: "Failed to add SAT score. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteSATScore = async (scoreId: string) => {
    try {
      const { error } = await supabase
        .from("sat_scores")
        .delete()
        .eq("id", scoreId);

      if (error) throw error;

      loadSATScores();
      toast({
        title: "SAT score deleted",
        description: "SAT score has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting SAT score:", error);
      toast({
        title: "Error",
        description: "Failed to delete SAT score. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addACTScore = async () => {
    if (!newActScore.score || !newActScore.year_taken) {
      toast({
        title: "Error",
        description: "Please fill in all ACT score fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("act_scores")
        .insert({
          ...newActScore,
          user_id: user.id,
        });

      if (error) throw error;

      setNewActScore({ score: 0, year_taken: new Date().getFullYear() });
      loadACTScores();
      toast({
        title: "ACT score added",
        description: "ACT score has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding ACT score:", error);
      toast({
        title: "Error",
        description: "Failed to add ACT score. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteACTScore = async (scoreId: string) => {
    try {
      const { error } = await supabase
        .from("act_scores")
        .delete()
        .eq("id", scoreId);

      if (error) throw error;

      loadACTScores();
      toast({
        title: "ACT score deleted",
        description: "ACT score has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting ACT score:", error);
      toast({
        title: "Error",
        description: "Failed to delete ACT score. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <OnboardingGuard pageName="Profile">
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">
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
        <form key={profileData ? 'loaded' : 'loading'} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic details about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            clearFieldError('full_name');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferred_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            clearFieldError('email_address');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="country_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country Code <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {countryCodes.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter phone number"
                            onChange={(e) => {
                              field.onChange(e);
                              clearFieldError('phone_number');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Applying To Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="applying_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applying To <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select what you're applying to" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Undergraduate Colleges">Undergraduate Colleges</SelectItem>
                          <SelectItem value="MBA">MBA</SelectItem>
                          <SelectItem value="LLM">LLM</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                          <SelectItem value="Masters">Masters</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional Field: Field of Focus for Masters and PhD */}
                {(form.watch("applying_to") === "Masters" || form.watch("applying_to") === "PhD") && (
                  <FormField
                    control={form.control}
                    name="masters_field_of_focus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field of Focus <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Computer Science, Business Analytics, Data Science"
                            onChange={(e) => {
                              field.onChange(e);
                              clearFieldError('masters_field_of_focus');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Conditional Field: Intended Majors (only for Undergraduate Colleges) */}
                {form.watch("applying_to") === "Undergraduate Colleges" && (
                  <FormField
                    control={form.control}
                    name="intended_majors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intended Major(s) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {!showOtherMajorInput ? (
                              <div className="relative">
                                <Input
                                  placeholder="Search for your intended major..."
                                  value={field.value || majorSearchQuery}
                                  onChange={(e) => {
                                    setMajorSearchQuery(e.target.value);
                                    if (!e.target.value) {
                                      field.onChange("");
                                    }
                                  }}
                                  onFocus={() => {
                                    if (field.value) {
                                      setMajorSearchQuery(field.value);
                                    }
                                  }}
                                />
                                {majorSearchQuery && filteredMajors.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredMajors.map((major) => (
                                      <div
                                        key={major}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => handleMajorSelection(major)}
                                      >
                                        {major}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {majorSearchQuery && filteredMajors.length === 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      No majors found. Try selecting "Other" below.
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Input
                                placeholder="Enter your custom major..."
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  clearFieldError("intended_majors");
                                }}
                              />
                            )}
                            {field.value && !showOtherMajorInput && (
                              <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                                <span className="text-sm text-green-800">Selected: {field.value}</span>
                                <button
                                  type="button"
                                  className="text-xs text-green-600 hover:text-green-800 underline"
                                  onClick={() => {
                                    field.onChange("");
                                    setMajorSearchQuery("");
                                  }}
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                            {!showOtherMajorInput && (
                              <div className="text-sm">
                                <span className="text-gray-600">Popular majors: </span>
                                <button
                                  type="button"
                                  className="text-blue-600 hover:text-blue-800 underline mr-2"
                                  onClick={() => handleMajorSelection("Computer Science")}
                                >
                                  Computer Science
                                </button>
                                <button
                                  type="button"
                                  className="text-blue-600 hover:text-blue-800 underline mr-2"
                                  onClick={() => handleMajorSelection("Business Administration")}
                                >
                                  Business
                                </button>
                                <button
                                  type="button"
                                  className="text-blue-600 hover:text-blue-800 underline mr-2"
                                  onClick={() => handleMajorSelection("Engineering")}
                                >
                                  Engineering
                                </button>
                                <button
                                  type="button"
                                  className="text-blue-600 hover:text-blue-800 underline mr-2"
                                  onClick={() => handleMajorSelection("Other")}
                                >
                                  Other
                                </button>
                              </div>
                            )}
                            {showOtherMajorInput && (
                              <button
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                onClick={() => {
                                  setShowOtherMajorInput(false);
                                  form.setValue("intended_majors", "");
                                }}
                              >
                                ← Back to popular majors
                              </button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

            </CardContent>
          </Card>

          {/* Academic Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Profile</CardTitle>
              <CardDescription>Your academic background and achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conditional Academic Fields based on Applying To */}
              {form.watch("applying_to") === "Undergraduate Colleges" ? (
                <>
                  {/* Undergraduate Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="high_school_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>High School Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="high_school_graduation_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>High School Graduation Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="school_board"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Board <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your school board" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ICSE">ICSE</SelectItem>
                              <SelectItem value="CBSE">CBSE</SelectItem>
                              <SelectItem value="IB">IB</SelectItem>
                              <SelectItem value="NIOS">NIOS</SelectItem>
                              <SelectItem value="CISCE">CISCE</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year_of_study"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year of Study <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your year of study" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="11th">11th</SelectItem>
                              <SelectItem value="12th">12th</SelectItem>
                              <SelectItem value="Graduate">Graduate</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conditional Academic Fields based on Year of Study */}
                  {form.watch("year_of_study") === "Graduate" ? (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="undergraduate_cgpa"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Undergraduate CGPA <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="10"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="e.g., 8.5"
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="class_10_score"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class 10 Grade <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="e.g., 85.5%"
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="class_11_score"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class 11 Grade <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="e.g., 87.2%"
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="class_12_half_yearly_score"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class 12 Half-Yearly Grade <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="e.g., 89.1%"
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* SAT Scores Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold mb-2">SAT Scores</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">SAT Score</label>
                          <Input
                            type="number"
                            placeholder="Enter your SAT score"
                            min="400"
                            max="1600"
                            value={newSatScore.score || ""}
                            onChange={(e) => setNewSatScore({ ...newSatScore, score: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Year Taken</label>
                          <Input
                            type="number"
                            placeholder="Year you took the test"
                            value={newSatScore.year_taken}
                            onChange={(e) => setNewSatScore({ ...newSatScore, year_taken: parseInt(e.target.value) || new Date().getFullYear() })}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button type="button" onClick={addSATScore} size="sm" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add SAT Score
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {satScores.length > 0 && (
                      <div className="space-y-2">
                        {satScores.map((score) => (
                          <div key={score.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span>SAT Score: {score.score} ({score.year_taken})</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => score.id && deleteSATScore(score.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ACT Scores Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold mb-2">ACT Scores</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">ACT Score</label>
                          <Input
                            type="number"
                            placeholder="Enter your ACT score"
                            min="1"
                            max="36"
                            value={newActScore.score || ""}
                            onChange={(e) => setNewActScore({ ...newActScore, score: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Year Taken</label>
                          <Input
                            type="number"
                            placeholder="Year you took the test"
                            value={newActScore.year_taken}
                            onChange={(e) => setNewActScore({ ...newActScore, year_taken: parseInt(e.target.value) || new Date().getFullYear() })}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button type="button" onClick={addACTScore} size="sm" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add ACT Score
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {actScores.length > 0 && (
                      <div className="space-y-2">
                        {actScores.map((score) => (
                          <div key={score.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span>ACT Score: {score.score} ({score.year_taken})</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => score.id && deleteACTScore(score.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Graduate School Fields (MBA, LLM, PhD, Masters) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="college_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., University of Delhi"
                              onChange={(e) => {
                                field.onChange(e);
                                clearFieldError('college_name');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="college_graduation_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College Graduation Year <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              placeholder="e.g., 2023"
                              onChange={(e) => {
                                field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                                clearFieldError('college_graduation_year');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="college_gpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College GPA <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              placeholder="e.g., 8.5"
                              onChange={(e) => {
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined);
                                clearFieldError('college_gpa');
                              }}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="test_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Type <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select test type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GRE">GRE</SelectItem>
                              <SelectItem value="GMAT">GMAT</SelectItem>
                              <SelectItem value="LSAT">LSAT</SelectItem>
                              <SelectItem value="Not yet taken">Not yet taken</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="test_score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Test Score 
                            {form.watch("test_type") !== "Not yet taken" && <span className="text-red-500">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              placeholder={form.watch("test_type") === "Not yet taken" ? "Test not taken yet" : "Enter your test score"}
                              disabled={form.watch("test_type") === "Not yet taken"}
                              className={form.watch("test_type") === "Not yet taken" ? "bg-gray-100 text-gray-500" : ""}
                              onChange={(e) => {
                                if (form.watch("test_type") !== "Not yet taken") {
                                  field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                                  clearFieldError('test_score');
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* College Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>College Preferences</CardTitle>
              <CardDescription>What you're looking for in a college</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ideal_college_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ideal College Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select college size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Small (< 2,000 students)">Small (&lt; 2,000 students)</SelectItem>
                          <SelectItem value="Medium (2,000 - 15,000 students)">Medium (2,000 - 15,000 students)</SelectItem>
                          <SelectItem value="Large (> 15,000 students)">Large (&gt; 15,000 students)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ideal_college_setting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ideal College Setting</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select college setting" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Urban">Urban</SelectItem>
                          <SelectItem value="Suburban">Suburban</SelectItem>
                          <SelectItem value="Rural">Rural</SelectItem>
                          <SelectItem value="College Town">College Town</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="geographic_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geographic Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select geographic preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="In-state">In-state</SelectItem>
                        <SelectItem value="Out-of-state">Out-of-state</SelectItem>
                        <SelectItem value="Northeast">Northeast</SelectItem>
                        <SelectItem value="West Coast">West Coast</SelectItem>
                        <SelectItem value="No Preference">No Preference</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="must_haves"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Must-Haves</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="What features are essential for your ideal college?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deal_breakers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal-Breakers</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="What would make you not want to attend a college?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Budget and financial aid preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="college_budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College Budget (Per Year)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="< $20,000">&lt; $20,000</SelectItem>
                          <SelectItem value="$20,000 - $35,000">$20,000 - $35,000</SelectItem>
                          <SelectItem value="$35,000 - $50,000">$35,000 - $50,000</SelectItem>
                          <SelectItem value="$50,000 - $70,000">$50,000 - $70,000</SelectItem>
                          <SelectItem value="> $70,000">&gt; $70,000</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="financial_aid_importance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Financial Aid Importance</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select importance level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Crucial">Crucial</SelectItem>
                          <SelectItem value="Very Important">Very Important</SelectItem>
                          <SelectItem value="Somewhat Important">Somewhat Important</SelectItem>
                          <SelectItem value="Not a factor">Not a factor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="scholarship_interests"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Scholarship Interests</FormLabel>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {scholarshipOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="scholarship_interests"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, item]);
                                      } else {
                                        field.onChange(
                                          currentValue.filter((value) => value !== item)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading}
              onClick={() => {
                if (isOnboardingCompletionFlow || profileMode === 'review') {
                  handleProfileCompletion();
                } else {
                  console.log("Save Profile button clicked");
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
      </div>
    </div>
    </OnboardingGuard>
  );
}