import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StarryBackground from "@/components/StarryBackground";
import { getValidApplyingToValues } from "@/utils/userProfileUtils";
import "@/styles/landing.css";

const Auth = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [applyingTo, setApplyingTo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/dashboard");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
      } else {
        // Validate required fields for signup
        if (!applyingTo) {
          toast({
            title: "Program Type Required",
            description: "Please select what you're applying to.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;
        
        // Step 1: Create user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: `${firstName} ${lastName}`,
              first_name: firstName,
              last_name: lastName,
              applying_to: applyingTo,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        // Step 2: Use atomic function to ensure profile consistency
        const { data: signupResult, error: signupError } = await supabase.rpc('create_user_profiles_atomic', {
          p_user_id: authData.user.id,
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_applying_to: applyingTo
        });

        if (signupError) {
          console.error('Signup function error:', signupError);
          throw new Error(signupError.message || 'Signup failed');
        }

        // Check if the function returned success
        if (!signupResult || !signupResult.success) {
          const errorMessage = signupResult?.error || 'Signup failed';
          throw new Error(errorMessage);
        }

        console.log('Atomic signup successful:', signupResult);

        toast({
          title: "Account created!",
          description: "Please check your email to confirm your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page min-h-screen bg-black relative">
      <StarryBackground />
      <div className="p-4 min-h-screen flex items-center justify-center relative z-10">
        <div className="w-full max-w-md">

          <Card className="backdrop-blur-xl bg-card/80 border-border/20 shadow-elegant shadow-[0_0_25px_rgba(255,255,255,0.3)] shadow-white/30">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-display">
                {isSignIn ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription className="text-base">
                {isSignIn 
                  ? "Sign in to continue your college journey" 
                  : "Start your path to college success"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isSignIn && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        type="text" 
                        placeholder="First name"
                        className="h-12 text-base"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        type="text" 
                        placeholder="Last name"
                        className="h-12 text-base"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    className="h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    className="h-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {!isSignIn && (
                  <div className="space-y-2">
                    <Label htmlFor="applyingTo">What are you applying to? <span className="text-red-500">*</span></Label>
                    <Select value={applyingTo} onValueChange={setApplyingTo}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select your program type" />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidApplyingToValues().map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isSignIn && (
                  <div className="text-right">
                    <Link 
                      to="#" 
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium text-white"
                  disabled={loading}
                >
                  {loading ? "Loading..." : (isSignIn ? "Sign In" : "Create Account")}
                </Button>
              </form>


              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignIn(!isSignIn)}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {isSignIn ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>

              {!isSignIn && (
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms-of-service" className="text-primary hover:text-primary/80">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80">
                    Privacy Policy
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Questions? Contact our team at{" "}
              <a 
                                href="mailto:info@diya.com" 
                className="text-primary hover:text-primary/80 transition-colors"
              >
                                info@diya.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;