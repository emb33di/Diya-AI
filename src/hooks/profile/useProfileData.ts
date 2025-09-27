import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export interface ProfileFormData {
  // Personal Information
  full_name?: string;
  preferred_name?: string;
  email_address?: string;
  country_code?: string;
  phone_number?: string;
  applying_to?: string;
  masters_field_of_focus?: string;
  
  // Academic Profile
  high_school_name?: string;
  high_school_graduation_year?: number;
  school_board?: string;
  year_of_study?: string;
  class_10_score?: number;
  class_11_score?: number;
  class_12_half_yearly_score?: number;
  undergraduate_cgpa?: number;
  intended_majors?: string;
  college_name?: string;
  college_graduation_year?: number;
  college_gpa?: number;
  test_type?: string;
  test_score?: number;
  
  // Additional Academic Fields
  gpa_unweighted?: number;
  gpa_weighted?: number;
  class_rank?: string;
  secondary_major_minor_interests?: string;
  sat_score?: number;
  act_score?: number;
  career_interests?: string;
  geographic_preference?: string;
  
  // College Preferences
  ideal_college_size?: string;
  ideal_college_setting?: string;
  must_haves?: string;
  deal_breakers?: string;
  
  // Financial Information
  looking_for_scholarships?: string;
  looking_for_financial_aid?: string;
  
  // Additional Undergraduate Prompt Fields
  extracurricular_activities?: string;
  leadership_roles?: string;
  personal_projects?: string;
  application_concerns?: string;
  specific_questions?: string;
}

export const useProfileData = () => {
  const [profileData, setProfileData] = useState<ProfileFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadProfile = useCallback(async () => {
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

      // Load profile from user_profiles table only
      let { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        console.warn("Error loading profile:", profileError);
        // Don't throw error, just log it and continue
      }

      // If no profile exists, create one
      if (!profile && !isCreatingProfile) {
        console.log("Creating initial user_profiles record...");
        setIsCreatingProfile(true);
        
        // Use upsert to prevent duplicates and handle race conditions
        const { data: upsertedProfile, error: createError } = await supabase
          .from("user_profiles")
          .upsert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || "",
            email_address: user.email || "",
            onboarding_complete: false,
          }, {
            onConflict: 'user_id'
          })
          .select("*")
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
              profile = existingProfile;
            }
          }
        } else {
          console.log("Initial user_profiles record created successfully:", upsertedProfile);
          profile = upsertedProfile;
          
          // Show a subtle notification that the profile was initialized
          toast({
            title: "Profile initialized",
            description: "Your profile has been set up successfully.",
          });
        }
        
        setIsCreatingProfile(false);
      }

      // Use profile data directly (no need to combine from multiple tables)
      const combinedProfile = profile;

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
        if (combinedProfile.college_graduation_year) {
          formData.college_graduation_year = Number(combinedProfile.college_graduation_year);
        }
        if (combinedProfile.college_gpa) {
          formData.college_gpa = Number(combinedProfile.college_gpa);
        }
        if (combinedProfile.test_score) {
          formData.test_score = Number(combinedProfile.test_score);
        }

        // Handle country code mapping
        if (combinedProfile.country_code) {
          // Check if it's a valid country code format
          const countryCodes = [
            { code: "US", name: "United States" },
            { code: "IN", name: "India" },
            { code: "CA", name: "Canada" },
            { code: "GB", name: "United Kingdom" },
            { code: "AU", name: "Australia" },
            { code: "DE", name: "Germany" },
            { code: "FR", name: "France" },
            { code: "SG", name: "Singapore" },
            { code: "JP", name: "Japan" },
            { code: "KR", name: "South Korea" },
            { code: "CN", name: "China" },
            { code: "BR", name: "Brazil" },
            { code: "MX", name: "Mexico" },
            { code: "RU", name: "Russia" },
            { code: "IT", name: "Italy" },
            { code: "ES", name: "Spain" },
            { code: "NL", name: "Netherlands" },
            { code: "SE", name: "Sweden" },
            { code: "NO", name: "Norway" },
            { code: "DK", name: "Denmark" },
            { code: "FI", name: "Finland" },
            { code: "CH", name: "Switzerland" },
            { code: "AT", name: "Austria" },
            { code: "BE", name: "Belgium" },
            { code: "IE", name: "Ireland" },
            { code: "NZ", name: "New Zealand" },
            { code: "ZA", name: "South Africa" },
            { code: "AE", name: "United Arab Emirates" },
            { code: "SA", name: "Saudi Arabia" },
            { code: "IL", name: "Israel" },
            { code: "TR", name: "Turkey" },
            { code: "EG", name: "Egypt" },
            { code: "NG", name: "Nigeria" },
            { code: "KE", name: "Kenya" },
            { code: "GH", name: "Ghana" },
            { code: "MA", name: "Morocco" },
            { code: "TN", name: "Tunisia" },
            { code: "DZ", name: "Algeria" },
            { code: "LY", name: "Libya" },
            { code: "SD", name: "Sudan" },
            { code: "ET", name: "Ethiopia" },
            { code: "UG", name: "Uganda" },
            { code: "TZ", name: "Tanzania" },
            { code: "ZW", name: "Zimbabwe" },
            { code: "BW", name: "Botswana" },
            { code: "NA", name: "Namibia" },
            { code: "ZM", name: "Zambia" },
            { code: "MW", name: "Malawi" },
            { code: "MZ", name: "Mozambique" },
            { code: "MG", name: "Madagascar" },
            { code: "MU", name: "Mauritius" },
            { code: "SC", name: "Seychelles" },
            { code: "KM", name: "Comoros" },
            { code: "DJ", name: "Djibouti" },
            { code: "SO", name: "Somalia" },
            { code: "ER", name: "Eritrea" },
            { code: "SS", name: "South Sudan" },
            { code: "CF", name: "Central African Republic" },
            { code: "TD", name: "Chad" },
            { code: "NE", name: "Niger" },
            { code: "ML", name: "Mali" },
            { code: "BF", name: "Burkina Faso" },
            { code: "CI", name: "Côte d'Ivoire" },
            { code: "LR", name: "Liberia" },
            { code: "SL", name: "Sierra Leone" },
            { code: "GN", name: "Guinea" },
            { code: "GW", name: "Guinea-Bissau" },
            { code: "GM", name: "Gambia" },
            { code: "SN", name: "Senegal" },
            { code: "MR", name: "Mauritania" },
            { code: "CV", name: "Cape Verde" },
            { code: "ST", name: "São Tomé and Príncipe" },
            { code: "GQ", name: "Equatorial Guinea" },
            { code: "GA", name: "Gabon" },
            { code: "CG", name: "Republic of the Congo" },
            { code: "CD", name: "Democratic Republic of the Congo" },
            { code: "AO", name: "Angola" },
            { code: "CM", name: "Cameroon" },
            { code: "CF", name: "Central African Republic" },
            { code: "TD", name: "Chad" },
            { code: "NE", name: "Niger" },
            { code: "ML", name: "Mali" },
            { code: "BF", name: "Burkina Faso" },
            { code: "CI", name: "Côte d'Ivoire" },
            { code: "LR", name: "Liberia" },
            { code: "SL", name: "Sierra Leone" },
            { code: "GN", name: "Guinea" },
            { code: "GW", name: "Guinea-Bissau" },
            { code: "GM", name: "Gambia" },
            { code: "SN", name: "Senegal" },
            { code: "MR", name: "Mauritania" },
            { code: "CV", name: "Cape Verde" },
            { code: "ST", name: "São Tomé and Príncipe" },
            { code: "GQ", name: "Equatorial Guinea" },
            { code: "GA", name: "Gabon" },
            { code: "CG", name: "Republic of the Congo" },
            { code: "CD", name: "Democratic Republic of the Congo" },
            { code: "AO", name: "Angola" },
            { code: "CM", name: "Cameroon" }
          ];

          const matchingCountry = countryCodes.find(country => 
            country.code === combinedProfile.country_code || 
            country.name === combinedProfile.country_code
          );
          
          if (matchingCountry) {
            formData.country_code = matchingCountry.code;
          }
        }

        setProfileData(formData);
        return formData;
      } else {
        setProfileData(null);
        return null;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [isCreatingProfile, navigate, toast]);

  const saveProfile = useCallback(async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "No user found. Please log in again.",
          variant: "destructive",
        });
        return false;
      }

      // Prepare data for database
      const profileData = {
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from("user_profiles")
        .upsert(profileData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Profile saved",
        description: "Your profile has been saved successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    profileData,
    loading,
    isCreatingProfile,
    loadProfile,
    saveProfile,
    setProfileData,
  };
};
