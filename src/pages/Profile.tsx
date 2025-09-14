import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import OnboardingGuard from "@/components/OnboardingGuard";

const profileSchema = z.object({
  // Personal Information
  full_name: z.string().optional(),
  preferred_name: z.string().optional(),
  date_of_birth: z.date().optional(),
  email_address: z.string().email().optional().or(z.literal("")),
  phone_number: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  citizenship_status: z.enum(["U.S. Citizen", "Permanent Resident", "International Student", "Other"]).optional(),
  ethnicity: z.enum(["American Indian or Alaska Native", "Asian", "Black or African American", "Hispanic or Latino", "Native Hawaiian or Other Pacific Islander", "White", "Two or More Races", "Other", "Prefer not to answer"]).optional(),
  
  // Academic Profile
  high_school_name: z.string().optional(),
  high_school_graduation_year: z.number().min(1900).max(2030).optional(),
  gpa_unweighted: z.number().min(0).max(4).optional(),
  gpa_weighted: z.number().min(0).max(5).optional(),
  class_rank: z.string().optional(),
  intended_majors: z.string().optional(),
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

interface APIBExam {
  id?: string;
  exam_name: string;
  score: number;
  year_taken: number;
}

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
  const [loading, setLoading] = useState(false);
  const [apIbExams, setApIbExams] = useState<APIBExam[]>([]);
  const [satScores, setSatScores] = useState<TestScore[]>([]);
  const [actScores, setActScores] = useState<TestScore[]>([]);
  const [newExam, setNewExam] = useState<APIBExam>({ exam_name: "", score: 0, year_taken: new Date().getFullYear() });
  const [newSatScore, setNewSatScore] = useState<TestScore>({ score: 0, year_taken: new Date().getFullYear() });
  const [newActScore, setNewActScore] = useState<TestScore>({ score: 0, year_taken: new Date().getFullYear() });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      scholarship_interests: [],
    },
  });

  useEffect(() => {
    loadProfile();
    loadAPIBExams();
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
        if (combinedProfile.date_of_birth) {
          formData.date_of_birth = new Date(combinedProfile.date_of_birth);
        }
        if (combinedProfile.high_school_graduation_year) {
          formData.high_school_graduation_year = Number(combinedProfile.high_school_graduation_year);
        }
        if (combinedProfile.gpa_unweighted) {
          formData.gpa_unweighted = Number(combinedProfile.gpa_unweighted);
        }
        if (combinedProfile.gpa_weighted) {
          formData.gpa_weighted = Number(combinedProfile.gpa_weighted);
        }
        
        form.reset(formData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
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

  const loadAPIBExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: exams, error } = await supabase
        .from("ap_ib_exams")
        .select("*")
        .eq("user_id", user.id)
        .order("year_taken", { ascending: false });

      if (error) {
        console.error("Error loading exams:", error);
        return;
      }

      setApIbExams(exams || []);
    } catch (error) {
      console.error("Error loading exams:", error);
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
        date_of_birth: data.date_of_birth ? data.date_of_birth.toISOString().split('T')[0] : null,
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

  const addAPIBExam = async () => {
    if (!newExam.exam_name || !newExam.score || !newExam.year_taken) {
      toast({
        title: "Error",
        description: "Please fill in all exam fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("ap_ib_exams")
        .insert({
          ...newExam,
          user_id: user.id,
        });

      if (error) throw error;

      setNewExam({ exam_name: "", score: 0, year_taken: new Date().getFullYear() });
      loadAPIBExams();
      toast({
        title: "Exam added",
        description: "AP/IB exam has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding exam:", error);
      toast({
        title: "Error",
        description: "Failed to add exam. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteAPIBExam = async (examId: string) => {
    try {
      const { error } = await supabase
        .from("ap_ib_exams")
        .delete()
        .eq("id", examId);

      if (error) throw error;

      loadAPIBExams();
      toast({
        title: "Exam deleted",
        description: "AP/IB exam has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast({
        title: "Error",
        description: "Failed to delete exam. Please try again.",
        variant: "destructive",
      });
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
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Complete your profile to get personalized college recommendations.
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
                      <FormLabel>Full Name</FormLabel>
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
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="citizenship_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Citizenship Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select citizenship status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="U.S. Citizen">U.S. Citizen</SelectItem>
                          <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                          <SelectItem value="International Student">International Student</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ethnicity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ethnicity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ethnicity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="American Indian or Alaska Native">American Indian or Alaska Native</SelectItem>
                        <SelectItem value="Asian">Asian</SelectItem>
                        <SelectItem value="Black or African American">Black or African American</SelectItem>
                        <SelectItem value="Hispanic or Latino">Hispanic or Latino</SelectItem>
                        <SelectItem value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</SelectItem>
                        <SelectItem value="White">White</SelectItem>
                        <SelectItem value="Two or More Races">Two or More Races</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to answer">Prefer not to answer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
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
                      <FormLabel>High School Name</FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gpa_unweighted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPA (Unweighted)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          max="4.0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gpa_weighted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPA (Weighted)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          max="5.0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="class_rank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Rank (if applicable)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 15/300" />
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

              {/* AP/IB Exams Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2">AP/IB Exams</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                    <Input
                      placeholder="Exam name"
                      value={newExam.exam_name}
                      onChange={(e) => setNewExam({ ...newExam, exam_name: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Score"
                      min="1"
                      max="5"
                      value={newExam.score || ""}
                      onChange={(e) => setNewExam({ ...newExam, score: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      placeholder="Year taken"
                      value={newExam.year_taken}
                      onChange={(e) => setNewExam({ ...newExam, year_taken: parseInt(e.target.value) || new Date().getFullYear() })}
                    />
                    <Button type="button" onClick={addAPIBExam} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
                
                {apIbExams.length > 0 && (
                  <div className="space-y-2">
                    {apIbExams.map((exam) => (
                      <div key={exam.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <span>{exam.exam_name} - Score: {exam.score} ({exam.year_taken})</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => exam.id && deleteAPIBExam(exam.id)}
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
                    <FormLabel>Intended Major(s)</FormLabel>
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
              {loading ? "Saving..." : "Save Profile"}
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