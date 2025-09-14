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

const profileSchema = z.object({
  // Personal Information
  full_name: z.string().min(1, "Full name is required"),
  preferred_name: z.string().optional(),
  email_address: z.string().email("Valid email address is required").min(1, "Email address is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  
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
  intended_majors: z.string().min(1, "Intended major is required"),
  secondary_major_minor_interests: z.string().optional(),
  career_interests: z.string().optional(),
  
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

export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { markOnboardingCompleted } = useOnboardingStatus();
  const [loading, setLoading] = useState(false);
  const [satScores, setSatScores] = useState<TestScore[]>([]);
  const [actScores, setActScores] = useState<TestScore[]>([]);
  const [newSatScore, setNewSatScore] = useState<TestScore>({ score: 0, year_taken: new Date().getFullYear() });
  const [newActScore, setNewActScore] = useState<TestScore>({ score: 0, year_taken: new Date().getFullYear() });
  const [isOnboardingCompletionFlow, setIsOnboardingCompletionFlow] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      scholarship_interests: [],
    },
  });

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
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load detailed profile from user_profiles table
      const { data: detailedProfile, error: detailedError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Load basic profile from profiles table
      const { data: basicProfile, error: basicError } = await supabase
        .from("profiles")
        .select("full_name, onboarding_complete")
        .eq("user_id", user.id)
        .single();

      if (detailedError && detailedError.code !== "PGRST116") {
        console.error("Error loading detailed profile:", detailedError);
      }
      if (basicError && basicError.code !== "PGRST116") {
        console.error("Error loading basic profile:", basicError);
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
        
        form.reset(formData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };



  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert Date to string for database
      const profileData = {
        ...data,
        user_id: user.id,
      };

      // Save detailed profile to user_profiles table
      const { error: userProfileError } = await supabase
        .from("user_profiles")
        .upsert(profileData);

      if (userProfileError) {
        throw userProfileError;
      }

      // Also update the basic profile table with full_name if it exists
      if (data.full_name) {
        const { error: basicProfileError } = await supabase
          .from("profiles")
          .upsert({
            user_id: user.id,
            full_name: data.full_name,
          });

        if (basicProfileError) {
          console.warn("Error updating basic profile:", basicProfileError);
          // Don't throw here as the main profile was saved successfully
        }
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });

      // If this is the onboarding completion flow, mark onboarding as complete and navigate to dashboard
      if (isOnboardingCompletionFlow) {
        const success = await markOnboardingCompleted();
        if (success) {
          toast({
            title: "Onboarding Complete!",
            description: "Welcome to your dashboard! You can now access all features.",
          });
          navigate('/dashboard');
        } else {
          toast({
            title: "Error",
            description: "Failed to complete onboarding. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error saving profile:", error);
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
          {isOnboardingCompletionFlow ? "Confirm Your Profile" : "Profile"}
        </h1>
        <p className="text-muted-foreground">
          {isOnboardingCompletionFlow 
            ? "Please review and confirm your profile information from your onboarding call. You can make any necessary changes before proceeding to your dashboard. Fields marked with * are required."
            : "Complete your profile to get personalized college recommendations. Fields marked with * are required."
          }
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        <Input {...field} />
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
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="class_10_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class 10 Grade</FormLabel>
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
                      <FormLabel>Class 11 Grade</FormLabel>
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
                      <FormLabel>Class 12 Half-Yearly Grade</FormLabel>
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

              {/* SAT Scores Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2">SAT Scores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                    <Input
                      type="number"
                      placeholder="SAT Score"
                      min="400"
                      max="1600"
                      value={newSatScore.score || ""}
                      onChange={(e) => setNewSatScore({ ...newSatScore, score: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      placeholder="Year taken"
                      value={newSatScore.year_taken}
                      onChange={(e) => setNewSatScore({ ...newSatScore, year_taken: parseInt(e.target.value) || new Date().getFullYear() })}
                    />
                    <Button type="button" onClick={addSATScore} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add SAT Score
                    </Button>
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
                    <Input
                      type="number"
                      placeholder="ACT Score"
                      min="1"
                      max="36"
                      value={newActScore.score || ""}
                      onChange={(e) => setNewActScore({ ...newActScore, score: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      placeholder="Year taken"
                      value={newActScore.year_taken}
                      onChange={(e) => setNewActScore({ ...newActScore, year_taken: parseInt(e.target.value) || new Date().getFullYear() })}
                    />
                    <Button type="button" onClick={addACTScore} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add ACT Score
                    </Button>
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

              <FormField
                control={form.control}
                name="intended_majors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intended Major(s) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_major_minor_interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Major/Minor Interests</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="career_interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Career Interests</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <Button type="submit" disabled={loading}>
              {loading 
                ? "Saving..." 
                : isOnboardingCompletionFlow 
                  ? "Confirm & Complete Onboarding" 
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