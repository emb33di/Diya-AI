import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, AlertTriangle, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import GuestEssayPreview from "@/components/essay/GuestEssayPreview";
import IvyReadinessReport from "@/components/IvyReadinessReport";
import { GuestEssayMigrationService, GuestEssay } from "@/services/guestEssayMigrationService";
import { useToast } from "@/hooks/use-toast";
import { Annotation } from "@/types/semanticDocument";

const IvyReadiness = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const guestEssayId = searchParams.get("guestEssayId");

  const [guestEssay, setGuestEssay] = useState<GuestEssay | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const allowNavigationRef = useRef(false);

  // Load guest essay on mount
  useEffect(() => {
    const loadGuestEssay = async () => {
      if (!guestEssayId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const essay = await GuestEssayMigrationService.getGuestEssay(guestEssayId);
        
        if (!essay) {
          toast({
            title: "Essay not found",
            description: "The essay you're looking for doesn't exist or has expired.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setGuestEssay(essay);
      } catch (error) {
        console.error("Error loading guest essay:", error);
        toast({
          title: "Error",
          description: "Failed to load the essay. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadGuestEssay();
  }, [guestEssayId, navigate, toast]);

  // Handle sign up click - allow navigation without warning
  const handleSignUp = () => {
    if (!guestEssayId) return;
    
    // Allow navigation for sign-up
    allowNavigationRef.current = true;
    
    // Pass guest_essay_id to signup flow via URL params and localStorage
    const signupUrl = `/auth?mode=signup&guest_essay_id=${guestEssayId}`;
    
    // Also store in localStorage as backup
    localStorage.setItem("pending_guest_essay_id", guestEssayId);
    
    navigate(signupUrl);
  };

  // Create a wrapped navigate function that checks before navigation
  const safeNavigate = (to: string | number, options?: any) => {
    if (allowNavigationRef.current) {
      allowNavigationRef.current = false; // Reset after use
      navigate(to as string, options);
      return;
    }

    if (guestEssay && guestEssayId) {
      setPendingNavigation(typeof to === 'string' ? to : window.location.href);
      setShowLeaveWarning(true);
    } else {
      navigate(to as string, options);
    }
  };

  // Warn user before leaving page (browser close/refresh)
  useEffect(() => {
    if (!guestEssay || !guestEssayId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave this page? You will lose your essay score and will not be able to save it.";
      return "Are you sure you want to leave this page? You will lose your essay score and will not be able to save it.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [guestEssay, guestEssayId]);

  // Intercept navigation attempts
  useEffect(() => {
    if (!guestEssay || !guestEssayId) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicking on "See full feedback" or sign-up related elements
      const isSignUpClick = 
        target.closest('[data-signup-action]') ||
        target.closest('button[data-signup-action]') ||
        target.textContent?.includes("See full feedback") ||
        target.closest('.group-hover\\:opacity-100'); // The hover overlay for "See full feedback"
      
      if (isSignUpClick) {
        allowNavigationRef.current = true;
        return;
      }

      // Check if clicking on a link or navigation element
      const link = target.closest('a[href]') as HTMLAnchorElement;
      if (link && link.href) {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);
        
        // Don't warn for same-page navigation
        if (url.pathname === currentUrl.pathname && url.search === currentUrl.search) {
          return;
        }

        // Don't warn for discard button (it has its own confirmation)
        if (target.closest('button')?.textContent?.includes("Discard")) {
          return;
        }

        // Show warning for other navigation
        e.preventDefault();
        e.stopPropagation();
        setPendingNavigation(link.href);
        setShowLeaveWarning(true);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [guestEssay, guestEssayId]);

  // Handle confirmed navigation
  const handleConfirmLeave = () => {
    allowNavigationRef.current = true;
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    } else {
      navigate("/");
    }
    setShowLeaveWarning(false);
    setPendingNavigation(null);
  };

  // Handle cancel navigation
  const handleCancelLeave = () => {
    setShowLeaveWarning(false);
    setPendingNavigation(null);
  };

  // Handle discard essay
  const handleDiscardEssay = async () => {
    if (!guestEssayId) {
      navigate("/");
      return;
    }

    setIsDiscarding(true);
    try {
      const success = await GuestEssayMigrationService.deleteGuestEssay(guestEssayId);
      
      if (success) {
        toast({
          title: "Essay discarded",
          description: "Your preview essay has been deleted.",
        });
        navigate("/");
      } else {
        toast({
          title: "Error",
          description: "Failed to discard essay. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error discarding essay:", error);
      toast({
        title: "Error",
        description: "An error occurred while discarding the essay.",
        variant: "destructive",
      });
    } finally {
      setIsDiscarding(false);
      setShowDiscardDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F4EDE2" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading your essay analysis...</p>
        </div>
      </div>
    );
  }

  // If no guestEssayId, show the form to start analysis
  if (!guestEssayId) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F4EDE2" }}>
        {/* Header Section */}
        <div className="border-b" style={{ backgroundColor: "#F4EDE2" }}>
          <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
                Ivy Readiness Report
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
                Check if your essay is at the Ivy-League Level
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto">
            <IvyReadinessReport open={true} onOpenChange={() => {}} />
          </div>
        </div>
      </div>
    );
  }

  // If guestEssayId exists but essay not found or expired
  if (!guestEssay) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F4EDE2" }}>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Essay Not Found</h1>
          <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
            The essay you're looking for doesn't exist or has expired.
          </p>
          <Button onClick={() => navigate("/ivyreadiness")} className="w-full sm:w-auto">
            Start New Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4EDE2" }}>
      {/* Header Section */}
      <div className="border-b" style={{ backgroundColor: "#F4EDE2" }}>
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Ivy Readiness Report
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
              Check if your essay is at the Ivy-League Level
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Action Buttons */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-sm">
              Essay saved temporarily • Expires in 7 days
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleSignUp}
                data-signup-action="true"
                className="text-white"
                style={{ backgroundColor: '#D07D00' }}
              >
                <Lock className="h-4 w-4 mr-2" />
                See full feedback
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiscardDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard Essay
              </Button>
            </div>
          </div>

          {/* Grading Scores */}
          {guestEssay.grading_scores && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" style={{ color: "#D07D00" }} />
                  Overall Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: "#D07D00" }}>
                      {guestEssay.grading_scores.bigPicture}/100
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Big Picture</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: "#D07D00" }}>
                      {guestEssay.grading_scores.tone}/100
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Tone</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: "#D07D00" }}>
                      {guestEssay.grading_scores.clarity}/100
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Clarity</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Essay Preview with Blurred Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Your Essay with AI Feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GuestEssayPreview
                document={guestEssay.semantic_document}
                selectedAnnotationId={selectedAnnotation?.id}
                onAnnotationSelect={setSelectedAnnotation}
                onSignUp={handleSignUp}
                className="min-h-[600px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discard Essay Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Discard Essay
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard this essay? This action cannot be undone.
              <br />
              <br />
              Your preview essay and all AI feedback will be permanently deleted. If you want to save it, please sign up first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDiscarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardEssay}
              disabled={isDiscarding}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDiscarding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Discarding...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard Essay
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Page Warning Dialog */}
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Leave This Page?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this page? You will lose your essay score and will not be able to save it.
              <br />
              <br />
              If you want to save your essay and see full feedback, please click "See full feedback" to sign up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLeave}>Stay on Page</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IvyReadiness;
