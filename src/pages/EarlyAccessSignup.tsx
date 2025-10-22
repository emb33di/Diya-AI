import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import LandingNavigation from "@/components/LandingNavigation";
import StarryBackground from "@/components/StarryBackground";
import { useToast } from "@/hooks/use-toast";
import { getProgramOptions } from "@/utils/programTypes";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/landing.css";

const EarlyAccessSignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [programType, setProgramType] = useState("");
  const [biggestPainPoint, setBiggestPainPoint] = useState("");
  const [willingToPay, setWillingToPay] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name || !email || !programType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('early-access-signup', {
        body: {
          name,
          email,
          programType,
          biggestPainPoint,
          willingToPay,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to sign up');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setIsSubmitted(true);
      
      toast({
        title: "Welcome to Early Access!",
        description: "You've successfully joined our early access program. Check your email for login instructions.",
      });
      
    } catch (error) {
      console.error('Error signing up for early access:', error);
      
      toast({
        title: "Error",
        description: `Failed to sign up: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <StarryBackground />
        <LandingNavigation />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/20">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Early Access!</h2>
                <p className="text-gray-300 mb-4">
                  Thank you for joining our early access program! You now have 2 weeks of free access to all premium features.
                </p>
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-200">
                    <strong>What's next:</strong><br/>
                    • Check your email for login instructions<br/>
                    • After 2 weeks, you'll get a special ₹2,000 pricing offer<br/>
                    • Start exploring all premium features right away!
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Button 
                  onClick={handleBackToHome}
                  className="w-full h-12 text-white shadow-lg hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-all duration-200"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <StarryBackground />
      <LandingNavigation />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Early Access Signup
            </CardTitle>
            <p className="text-gray-300 text-sm">
              Get 2 weeks free + special ₹2,000 pricing
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-white">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 border-border !bg-black text-white placeholder:text-gray-400"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-border !bg-black text-white placeholder:text-gray-400"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {/* Program Type Field */}
              <div className="space-y-2">
                <Label htmlFor="programType" className="text-sm font-medium text-white">
                  Program Type <span className="text-red-500">*</span>
                </Label>
                <Select value={programType} onValueChange={setProgramType} required>
                  <SelectTrigger className="h-12 border-border !bg-black text-white">
                    <SelectValue placeholder="Select your program type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getProgramOptions().map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Biggest Pain Point Field */}
              <div className="space-y-2">
                <Label htmlFor="biggestPainPoint" className="text-sm font-medium text-white">
                  Biggest Pain Point (Optional)
                </Label>
                <Textarea
                  id="biggestPainPoint"
                  value={biggestPainPoint}
                  onChange={(e) => setBiggestPainPoint(e.target.value)}
                  className="min-h-[100px] border-border !bg-black text-white placeholder:text-gray-400"
                  placeholder="What's your biggest challenge in the admissions process?"
                />
              </div>

              {/* Willing to Pay Field */}
              <div className="space-y-2">
                <Label htmlFor="willingToPay" className="text-sm font-medium text-white">
                  Would you be willing to pay ₹2,000 to solve that pain point?
                </Label>
                <Select value={willingToPay} onValueChange={setWillingToPay}>
                  <SelectTrigger className="h-12 border-border !bg-black text-white">
                    <SelectValue placeholder="Select your answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, absolutely</SelectItem>
                    <SelectItem value="maybe">Maybe, depends on the solution</SelectItem>
                    <SelectItem value="no">No, not at this time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-white shadow-lg hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-all duration-200" 
                disabled={!name || !email || !programType || isLoading}
              >
                {isLoading ? "Signing Up..." : "Join Early Access"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                By signing up, you agree to our terms and will receive 2 weeks of free access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EarlyAccessSignup;
