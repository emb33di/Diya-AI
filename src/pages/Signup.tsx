import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import SchoolDropdown from "@/components/SchoolDropdown";
import LandingNavigation from "@/components/LandingNavigation";
import StarryBackground from "@/components/StarryBackground";
import { useToast } from "@/hooks/use-toast";
import "@/styles/landing.css";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [hearAboutUs, setHearAboutUs] = useState("");
  const [hearAboutOther, setHearAboutOther] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !userType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // For now, just show success message
      // TODO: Integrate with actual waitlist/authentication system
      console.log('Waitlist signup:', {
        email,
        userType,
        yearOfStudy,
        selectedSchool,
        hearAboutUs,
        hearAboutOther,
      });

      setIsSubmitted(true);
      
      toast({
        title: "Success!",
        description: "You've been added to the waitlist successfully!",
      });
      
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      
      toast({
        title: "Error",
        description: `Failed to join waitlist: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleHearAboutSubmit = async () => {
    if (!hearAboutUs) return;
    
    setIsLoading(true);
    try {
      // TODO: Integrate with actual database
      console.log('Hear about us update:', { hearAboutUs, hearAboutOther });
      
      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded.",
      });
    } catch (error) {
      console.error('Error updating hear about us:', error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="landing-page min-h-screen bg-black relative">
        {/* Use shared Navigation component */}
        <LandingNavigation />
        
        {/* Starry Background */}
        <StarryBackground />
        
        {/* Main Content with proper centering and navbar spacing */}
        <div className="pt-32 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-lg w-full text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="bg-black p-6 rounded-2xl shadow-elegant border border-border shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] transition-all duration-300">
                <p className="text-white mb-3 font-nunito text-lg">
                  <strong>Thank you for registering!</strong> You're now on the waitlist to experience Diya.
                </p>
                
                {/* How did you hear about us section */}
                <div className="mb-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                  <p className="text-white text-sm mb-3 font-medium">
                    How did you hear about us? (Optional)
                  </p>
                  
                  <div className="space-y-3">
                    <Select value={hearAboutUs} onValueChange={setHearAboutUs}>
                      <SelectTrigger className="h-10 border-border !bg-gray-900 text-white">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent className="!bg-gray-900 border-border">
                        <SelectItem value="reddit" className="text-white hover:!bg-gray-800">Reddit</SelectItem>
                        <SelectItem value="instagram" className="text-white hover:!bg-gray-800">Instagram</SelectItem>
                        <SelectItem value="linkedin" className="text-white hover:!bg-gray-800">LinkedIn</SelectItem>
                        <SelectItem value="facebook" className="text-white hover:!bg-gray-800">Facebook</SelectItem>
                        <SelectItem value="friend_referred" className="text-white hover:!bg-gray-800">Friend Referred</SelectItem>
                        <SelectItem value="other" className="text-white hover:!bg-gray-800">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    {hearAboutUs === "other" && (
                      <Textarea 
                        placeholder="Please explain..."
                        value={hearAboutOther}
                        onChange={(e) => setHearAboutOther(e.target.value)}
                        className="min-h-[60px] border-border !bg-gray-900 text-white placeholder:text-gray-400"
                      />
                    )}

                    {hearAboutUs && (
                      <Button 
                        onClick={handleHearAboutSubmit}
                        disabled={isLoading}
                        className="w-full h-8 text-xs"
                        size="sm"
                      >
                        {isLoading ? "Saving..." : "Save Response"}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="bg-accent/50 p-4 rounded-xl border border-accent">
                  <p className="text-white font-medium text-sm">
                    ⚡ <strong>Spots are limited!</strong> We will keep you updated!
                    
                    <br/><br/>📧 <strong>Check your email!</strong> We've sent you a confirmation email. Please be sure to check your inbox and spam/junk folder.
                    
                    <br/><br/>Feel free to reach out to us at <a href="mailto:info@meetdiya.com" className="text-primary hover:text-primary-glow transition-colors">info@meetdiya.com</a> if you have any questions.
                  </p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleBackToHome} variant="outline" className="font-medium text-white border-white hover:bg-white hover:text-black">
              ← Back to Diya
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen bg-black relative">
      {/* Use shared Navigation component */}
      <LandingNavigation />

      {/* Starry Background */}
      <StarryBackground />

      {/* Main Content with top padding to account for fixed nav */}
      <div className="pt-32 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3 font-inter">Join the Waitlist</h1>
            <p className="text-muted-foreground font-nunito">Be among the first to unlock your future with AI-powered admissions counseling from Ivy League alumni.</p>
          </div>

          {/* Signup Form */}
          <Card className="bg-black shadow-elegant border border-border shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-center text-xl font-inter text-white">Get Started Today</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-white">Email Address *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 border-border focus:border-primary !bg-black text-white placeholder:text-gray-400" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType" className="text-sm font-medium text-white">I am a...</Label>
                  <Select value={userType} onValueChange={setUserType}>
                    <SelectTrigger className="h-12 border-border !bg-black text-white">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="!bg-black border-border">
                      <SelectItem value="student" className="text-white hover:!bg-gray-800">Student</SelectItem>
                      <SelectItem value="parent" className="text-white hover:!bg-gray-800">Parent</SelectItem>
                      <SelectItem value="counselor" className="text-white hover:!bg-gray-800">Counselor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearOfStudy" className="text-sm font-medium text-white">Year of Study (Optional)</Label>
                  <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                    <SelectTrigger className="h-12 border-border !bg-black text-white">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="!bg-black border-border">
                      <SelectItem value="9th" className="text-white hover:!bg-gray-800">9th Grade</SelectItem>
                      <SelectItem value="10th" className="text-white hover:!bg-gray-800">10th Grade</SelectItem>
                      <SelectItem value="11th" className="text-white hover:!bg-gray-800">11th Grade</SelectItem>
                      <SelectItem value="12th" className="text-white hover:!bg-gray-800">12th Grade</SelectItem>
                      <SelectItem value="graduate" className="text-white hover:!bg-gray-800">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {userType === "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="school" className="text-sm font-medium text-white">Your School (Optional)</Label>
                    <SchoolDropdown onSchoolSelect={setSelectedSchool} selectedSchool={selectedSchool} placeholder="Search your Indian high school..." />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-white shadow-lg hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-all duration-200" 
                  disabled={!email || !userType || isLoading}
                >
                  {isLoading ? "Joining..." : "Join the Waitlist"}
                </Button>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  By joining, you agree to receive updates about Diya. We respect your privacy and will never spam you.
                </p>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button onClick={handleBackToHome} variant="ghost" className="text-muted-foreground hover:text-foreground">
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
