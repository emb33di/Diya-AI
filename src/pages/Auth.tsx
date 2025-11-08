import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DynamicBackground from "@/components/DynamicBackground";
import { useAuth } from "@/hooks/useAuth";
import { getValidApplyingToValues } from "@/utils/userProfileUtils";
import "@/styles/landing.css";
import { getProgramOptions } from "@/utils/programTypes";
import { GuestEssayMigrationService } from "@/services/guestEssayMigrationService";
import { createCheckoutSession } from "@/services/stripePaymentService";

// Country codes for phone number dropdown
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
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  // Get guest essay ID from URL params or localStorage (for migration after signup)
  const guestEssayId = searchParams.get('guest_essay_id') || localStorage.getItem('pending_guest_essay_id');
  
  // Set initial state based on URL parameter
  const [isSignIn, setIsSignIn] = useState(mode === 'signup' ? false : true);

  // Update isSignIn when URL mode parameter changes
  useEffect(() => {
    setIsSignIn(mode === 'signup' ? false : true);
  }, [mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const [applyingTo, setApplyingTo] = useState("");
  const [hearAboutUs, setHearAboutUs] = useState("");
  const [hearAboutOther, setHearAboutOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isFounder, loading: authLoading } = useAuth();

  // Redirect if already authenticated (but not if we're showing the payment button after signup)
  useEffect(() => {
    if (!authLoading && user && !signupSuccess) {
      navigate(isFounder ? '/founder-portal' : '/dashboard', { replace: true });
    }
  }, [user, isFounder, authLoading, navigate, signupSuccess]);

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove any non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      setPhoneNumberError("");
      return true; // Empty is OK, required attribute will handle it
    }
    
    if (digitsOnly.length !== 10) {
      setPhoneNumberError("Phone number must be exactly 10 digits");
      return false;
    }
    
    setPhoneNumberError("");
    return true;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    validatePhoneNumber(value);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);
    
    try {
      // Use Supabase's built-in password reset with Resend SMTP
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: 'https://www.meetdiya.com/password-reset'
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions to reset your password. It may take a few minutes to arrive.",
      });
      
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number for signup
    if (!isSignIn) {
      if (!validatePhoneNumber(phoneNumber)) {
        toast({
          title: "Invalid Phone Number",
          description: "Phone number must be exactly 10 digits",
          variant: "destructive",
        });
        return;
      }
    }
    
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
            emailRedirectTo: `https://www.meetdiya.com/auth`,
            data: {
              full_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              applying_to: applyingTo,
              country_code: countryCode,
              phone_number: phoneNumber,
              hear_about_us: hearAboutUs,
              hear_about_other: hearAboutOther,
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

          // Step 2: Use atomic function to ensure profile consistency with all signup data
          console.log(`[${signupId}] Step 2 - Creating user profile with atomic function`);
          try {
            // Normalize applyingTo to lowercase for atomic function (it expects lowercase)
            const normalizedApplyingTo = applyingTo.toLowerCase();
            const { data: signupResult, error: signupError } = await supabase.rpc('create_user_profiles_atomic', {
              p_user_id: authData.user.id,
              p_email: email,
              p_first_name: firstName,
              p_last_name: lastName,
              p_applying_to: normalizedApplyingTo
            });

            if (signupError) {
              console.error(`❌ [${signupId}] Atomic profile creation error:`, signupError);
              // Don't fail signup - trigger should have created basic profile
            } else if (signupResult?.success) {
              console.log(`✅ [${signupId}] Profile created successfully via atomic function:`, signupResult);
            } else {
              console.warn(`⚠️ [${signupId}] Atomic function returned non-success:`, signupResult);
            }
          } catch (atomicError) {
            console.error(`❌ [${signupId}] Error calling atomic function:`, atomicError);
            // Don't fail signup - trigger should have created basic profile
          }

          // Step 3: Update profile with additional fields (phone, hear_about_us, etc.)
          console.log(`[${signupId}] Step 3 - Updating profile with additional fields`);
          try {
            const updateData: any = {};
            if (phoneNumber) {
              updateData.phone_number = phoneNumber;
            }
            if (countryCode) {
              updateData.country_code = countryCode;
            }
            if (hearAboutUs) {
              updateData.hear_about_us = hearAboutUs;
            }
            if (hearAboutOther) {
              updateData.hear_about_other = hearAboutOther;
            }

            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update(updateData)
                .eq('user_id', authData.user.id);

              if (updateError) {
                console.warn(`⚠️ [${signupId}] Failed to update additional profile fields:`, updateError);
              } else {
                console.log(`✅ [${signupId}] Additional profile fields updated successfully`);
              }
            }
          } catch (updateError) {
            console.warn(`⚠️ [${signupId}] Error updating additional profile fields:`, updateError);
            // Don't fail signup if additional fields fail to update
          }
          
          // Step 4: Migrate guest essay if one exists (before payment flow - this ensures essay is saved regardless of payment timing)
          let migratedEssayId: string | undefined;
          if (guestEssayId && authData.user) {
            console.log(`[${signupId}] 📝 Migrating guest essay:`, guestEssayId);
            try {
              const migrationResult = await GuestEssayMigrationService.migrateGuestEssayToUser(
                guestEssayId,
                authData.user.id
              );

              if (migrationResult.success) {
                migratedEssayId = migrationResult.essayId;
                console.log(`[${signupId}] ✅ Guest essay migrated successfully:`, {
                  essayId: migrationResult.essayId,
                  semanticDocumentId: migrationResult.semanticDocumentId
                });
                // Clear localStorage after successful migration
                localStorage.removeItem('pending_guest_essay_id');
              } else {
                console.warn(`[${signupId}] ⚠️ Guest essay migration failed:`, migrationResult.error);
                // Don't fail signup if migration fails - essay will expire in 7 days anyway
              }
            } catch (migrationError) {
              console.error(`[${signupId}] ⚠️ Error during guest essay migration:`, migrationError);
              // Don't fail signup if migration fails
            }
          }
          
          // Send custom confirmation email
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signup-confirmation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              // Ensure the request completes even if the route changes
              keepalive: true,
              body: JSON.stringify({
                email,
                firstName
              })
            });

            if (response.ok) {
              console.log(`[${signupId}] ✅ Custom confirmation email sent successfully`);
            } else {
              console.warn(`[${signupId}] ⚠️ Failed to send custom confirmation email, but user was created`);
            }
          } catch (emailError) {
            console.warn(`[${signupId}] ⚠️ Error sending custom confirmation email:`, emailError);
          }
          
          console.groupEnd(); // Close the debug group
          
          // Show success message with essay migration info if applicable
          if (migratedEssayId) {
            toast({
              title: "Account created!",
              description: "Your preview essay and comments have been saved. Redirecting to payment...",
            });
          } else {
            toast({
              title: "Account created!",
              description: "Redirecting to payment...",
            });
          }
          
          // Automatically proceed to payment after successful signup
          try {
            const result = await createCheckoutSession({
              success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${window.location.origin}/auth?mode=signup`,
            });

            if (!result.success) {
              toast({
                title: "Payment Error",
                description: result.message || "Failed to initiate payment. Please try again.",
                variant: "destructive",
              });
              // Set signup success state to show payment button as fallback
              setSignupSuccess(true);
            }
            // If successful, createCheckoutSession will redirect to Stripe
          } catch (paymentError: any) {
            console.error("Error initiating payment:", paymentError);
            toast({
              title: "Payment Error",
              description: paymentError.message || "Failed to initiate payment. Please try again.",
              variant: "destructive",
            });
            // Set signup success state to show payment button as fallback
            setSignupSuccess(true);
          }
          
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

  const handleProceedToPayment = async () => {
    setPaymentLoading(true);
    try {
      const result = await createCheckoutSession({
        success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/auth?mode=signup`,
      });

      if (!result.success) {
        toast({
          title: "Payment Error",
          description: result.message || "Failed to initiate payment. Please try again.",
          variant: "destructive",
        });
      }
      // If successful, createCheckoutSession will redirect to Stripe
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="landing-page min-h-screen bg-black relative">
      <DynamicBackground />
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
              {signupSuccess ? (
                <div className="space-y-4 text-center">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Account Created Successfully!</h3>
                    <p className="text-muted-foreground">
                      Your account has been created. Proceed to payment to unlock all features.
                    </p>
                  </div>
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={paymentLoading}
                    className="w-full h-12 text-base font-medium text-white"
                  >
                    {paymentLoading ? "Loading..." : "Proceed to Payment"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSignupSuccess(false);
                      // Reset form
                      setEmail("");
                      setPassword("");
                      setFirstName("");
                      setLastName("");
                      setPhoneNumber("");
                      setApplyingTo("");
                      setHearAboutUs("");
                      setHearAboutOther("");
                    }}
                    className="w-full h-12 text-base font-medium"
                  >
                    Back to Sign Up
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                {!isSignIn && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        type="text" 
                        placeholder="First name"
                        className="h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
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
                        className="h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
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
                    className="h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {!isSignIn && (
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="h-12 w-[140px] text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map(({ code, country, flag }) => (
                            <SelectItem key={code} value={code}>
                              {flag} {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        id="phoneNumber" 
                        type="tel" 
                        placeholder="Phone number"
                        className={`h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white flex-1 ${phoneNumberError ? 'border-red-500 focus:border-red-500' : ''}`}
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        required
                      />
                    </div>
                    {phoneNumberError && (
                      <p className="text-sm text-red-500">{phoneNumberError}</p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    className="h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
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

                {!isSignIn && (
                  <div className="space-y-2">
                    <Label htmlFor="hearAboutUs">How did you hear about us? (Optional)</Label>
                    <Select value={hearAboutUs} onValueChange={setHearAboutUs}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="friend_suggested">Friend suggested</SelectItem>
                        <SelectItem value="reddit">Reddit</SelectItem>
                        <SelectItem value="school_session">School session</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {hearAboutUs === "other" && (
                      <Input 
                        placeholder="Please specify..."
                        value={hearAboutOther}
                        onChange={(e) => setHearAboutOther(e.target.value)}
                        className="h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
                      />
                    )}
                  </div>
                )}

                {isSignIn && (
                  <div className="text-right">
                    <button 
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium text-white"
                  disabled={loading}
                >
                  {loading ? "Loading..." : (isSignIn ? "Sign In" : "Proceed to Payment")}
                </Button>
              </form>
              )}

              {/* Forgot Password Modal */}
              {showForgotPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="w-full max-w-md">
                    <Card className="backdrop-blur-xl bg-card/80 border-border/20 shadow-elegant shadow-[0_0_25px_rgba(255,255,255,0.3)] shadow-white/30">
                      <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-2xl font-display">
                          Reset Password
                        </CardTitle>
                        <CardDescription className="text-base">
                          Enter your email address and we'll send you a link to reset your password
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="forgot-email">Email Address</Label>
                            <Input
                              id="forgot-email"
                              type="email"
                              placeholder="Enter your email"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="h-12 text-base bg-gray-800 border-gray-600 focus:border-primary text-white autofill:bg-gray-800 autofill:text-white"
                              required
                            />
                          </div>
                          
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowForgotPassword(false);
                                setForgotPasswordEmail("");
                              }}
                              className="flex-1 h-12 text-base font-medium"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={forgotPasswordLoading}
                              className="flex-1 h-12 text-base font-medium text-white"
                            >
                              {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!signupSuccess && (
                <>
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
                </>
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