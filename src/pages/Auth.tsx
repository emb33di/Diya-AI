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
import { getProgramOptions } from "@/utils/programTypes";

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
    
    // Create a unique ID for this signup attempt for easier log correlation
    const signupId = `signup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Debug group for this signup attempt
    console.group(`🔍 [${signupId}] Signup Process`);
    
    // 1. Log raw form data
    console.log(`[${signupId}] 📝 Form Data:`, {
      email,
      password: password ? '••••••••' : 'empty',
      firstName,
      lastName,
      applyingTo: {
        value: applyingTo,
        type: typeof applyingTo,
        isValid: !!applyingTo && applyingTo.trim() !== ''
      }
    });

    // 2. Add debugger statement (comment out in production)
    // Uncomment to pause execution here for inspection
    // debugger;

    // 3. Validate form data before proceeding
    if (!isSignIn) {
      if (!applyingTo) {
        const error = new Error('Program type is required');
        console.error(`❌ [${signupId}] Validation error:`, error);
        throw error;
      }
      
      console.log(`[${signupId}] ✅ Form validation passed`);
    }
    
    try {
      if (isSignIn) {
        console.log(`[${signupId}] Signing in user:`, { email });
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error(`❌ [${signupId}] Sign in error:`, {
            message: signInError.message,
            name: signInError.name,
            status: signInError.status
          });
          throw signInError;
        }
        
        console.log(`✅ [${signupId}] Sign in successful:`, {
          userId: signInData.user?.id,
          session: signInData.session ? 'Session created' : 'No session'
        });
        
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
      } else {
        console.log(`[${signupId}] Starting signup process`);
        
        // Log the exact data being sent to Supabase Auth
        const authDataToSend = {
          email,
          password, // Keep the actual password for the API call
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              applying_to: applyingTo,
              // Add debug info
              _debug: {
                signupId,
                timestamp: new Date().toISOString(),
                clientInfo: window.navigator.userAgent
              }
            }
          }
        };
        
        // Create a safe version for logging (without password)
        const loggableAuthData = {
          ...authDataToSend,
          password: '••••••••',
          options: {
            ...authDataToSend.options,
            data: {
              ...authDataToSend.options.data,
              // Ensure we log the exact value and type of applyingTo
              _applyingToDebug: {
                value: applyingTo,
                type: typeof applyingTo,
                isUndefined: applyingTo === undefined,
                isNull: applyingTo === null,
                isEmpty: applyingTo === ''
              }
            }
          }
        };
        
        console.log(`[${signupId}] 📤 Supabase Auth Payload:`, loggableAuthData);
        
        // Step 1: Create user via Supabase Auth
        console.log(`[${signupId}] Step 1 - Creating user via Supabase Auth`);
        try {
          // Use the authDataToSend we already prepared
          const { data: authData, error: authError } = await supabase.auth.signUp(authDataToSend);

          // Log the response with more detailed error info
          console.log(`[${signupId}] Auth signup response:`, { 
            hasUser: !!authData?.user,
            session: authData?.session ? 'Session created' : 'No session',
            error: authError ? {
              message: authError.message,
              name: authError.name,
              status: (authError as any).status,
              // Include any additional error details if available
              details: (authError as any).details,
              hint: (authError as any).hint,
              code: (authError as any).code
            } : null,
            // Include the raw response for debugging
            rawResponse: authData || authError
          });
          
          // Verify applying_to was received by Supabase
          if (authData?.user) {
            const userMetadata = authData.user.user_metadata as any;
            console.log(`[${signupId}] ✅ Auth User Created:`, {
              userId: authData.user.id,
              applyingToInMetadata: userMetadata?.applying_to,
              originalApplyingTo: applyingTo,
              valuesMatch: userMetadata?.applying_to === applyingTo
            });
          }

          if (authError) {
            console.error(`❌ [${signupId}] Auth error details:`, {
              message: authError.message,
              name: authError.name,
              status: (authError as any).status
              // Removed cause as it's not part of AuthError type
            });
            throw authError;
          }

          if (!authData.user) {
            const error = new Error('User creation failed - no user object returned');
            console.error(`❌ [${signupId}] ${error.message}`);
            throw error;
          }

          console.log(`✅ [${signupId}] User created successfully:`, {
            userId: authData.user.id,
            email: authData.user.email,
            confirmed: authData.user.confirmed_at ? 'Yes' : 'No (needs email verification)'
          });

          // Profile is automatically created by database trigger
          console.log(`[${signupId}] ✅ Profile will be created automatically by database trigger`);
          
          console.groupEnd(); // Close the debug group
          
          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          });
          
        } catch (signupError: any) {
          console.error(`❌ [${signupId}] Signup process failed:`, {
            name: signupError.name,
            message: signupError.message,
            stack: signupError.stack,
            ...(signupError.details && { details: signupError.details }),
            ...(signupError.hint && { hint: signupError.hint }),
            ...(signupError.code && { code: signupError.code })
          });
          throw signupError;
        }
      }
    } catch (error: any) {
      console.error(`🔥 [${signupId}] CRITICAL: Signup failed:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.details && { details: error.details }),
        ...(error.hint && { hint: error.hint }),
        ...(error.code && { code: error.code })
      });
      
      // User-friendly error messages
      let errorMessage = error.message || 'An unknown error occurred';
      
      // Map common error codes to friendly messages
      if (error.status === 400) {
        errorMessage = 'Invalid email or password format';
      } else if (error.status === 429) {
        errorMessage = 'Too many signup attempts. Please try again later.';
      } else if (error.message?.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.groupEnd(); // Close the debug group
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
                    <Select value={applyingTo} onValueChange={setApplyingTo} required>
                      <SelectTrigger className="h-12 text-base">
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