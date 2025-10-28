import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import StarryBackground from "@/components/StarryBackground";

const passwordResetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [recoveryTokens, setRecoveryTokens] = useState<{accessToken: string, refreshToken: string} | null>(null);

  const form = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Check if we have a valid password reset session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check URL fragments for recovery tokens
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        // If we have tokens in the URL and type is 'recovery', this is a password reset
        if (accessToken && refreshToken && type === 'recovery') {
          // Store the tokens
          setRecoveryTokens({ accessToken, refreshToken });
          
          // Clear the URL fragments after a short delay to ensure Supabase processes them
          setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 100);
          
          setIsValidSession(true);
        } else {
          // Check if user is already logged in
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // User is already logged in, sign them out
            await supabase.auth.signOut();
          }
          setIsValidSession(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);

  const handlePasswordReset = async (data: PasswordResetFormData) => {
    if (!recoveryTokens) {
      toast({
        title: "Error",
        description: "Invalid reset session. Please request a new password reset link.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      // Set the session using the recovery tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: recoveryTokens.accessToken,
        refresh_token: recoveryTokens.refreshToken,
      });

      if (sessionError) {
        throw sessionError;
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password updated successfully",
        description: "Your password has been reset. You can now sign in with your new password.",
      });

      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to sign in page
      navigate('/auth?mode=signin');
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="landing-page min-h-screen bg-black relative">
        <StarryBackground />
        <div className="p-4 min-h-screen flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if session is invalid
  if (isValidSession === false) {
    return (
      <div className="landing-page min-h-screen bg-black relative">
        <StarryBackground />
        <div className="p-4 min-h-screen flex items-center justify-center relative z-10">
          <div className="w-full max-w-md">
            <Card className="backdrop-blur-xl bg-card/80 border-border/20 shadow-elegant shadow-[0_0_25px_rgba(255,255,255,0.3)] shadow-white/30">
              <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-display text-red-600">
                  Invalid Reset Link
                </CardTitle>
                <CardDescription className="text-base">
                  This password reset link is invalid or has expired.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Please request a new password reset link from the sign-in page.
                </p>
                <Button 
                  onClick={() => navigate('/auth?mode=signin')}
                  className="w-full h-12 text-base font-medium text-white"
                >
                  Go to Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="landing-page min-h-screen bg-black relative">
      <StarryBackground />
      <div className="p-4 min-h-screen flex items-center justify-center relative z-10">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-xl bg-card/80 border-border/20 shadow-elegant shadow-[0_0_25px_rgba(255,255,255,0.3)] shadow-white/30">
            <CardContent className="space-y-6 pt-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your new password"
                              className="h-12 pr-10 bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your new password"
                              className="h-12 pr-10 bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isResetting}
                    className="w-full h-12 text-base font-medium text-white"
                  >
                    {isResetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </Form>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => navigate('/auth?mode=signin')}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
