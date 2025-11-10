import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import HeroSection from "@/components/HeroSection";
import DemoVideoSection from "@/components/DemoVideoSection";
import DynamicBackground from "@/components/DynamicBackground";
import MBASection from "@/components/MBASection";
import FAQSection from "@/components/FAQSection";
import PricingSection from "@/components/PricingSection";
import FounderProfile from "@/components/FounderProfile";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import "@/styles/landing.css";

/**
 * Helper function to get the counselor portal route based on counselor name
 * Currently defaults to ivysummit-portal, but can be extended for other partners
 */
const getCounselorPortalRoute = (counselorName: string | null | undefined): string => {
  if (!counselorName) return '/ivysummit-portal';
  
  // Map counselor names to portal routes
  const portalRoutes: Record<string, string> = {
    'ivysummit': '/ivysummit-portal',
    // Add more partner routes here as needed
  };
  
  return portalRoutes[counselorName.toLowerCase()] || '/ivysummit-portal';
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isFounder, isCounselor, counselorName, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // Redirect founders to founder portal
        if (isFounder) {
          navigate('/founder-portal', { replace: true });
        }
        // Redirect counselors to their counselor portal
        else if (isCounselor && counselorName) {
          const portalRoute = getCounselorPortalRoute(counselorName);
          navigate(portalRoute, { replace: true });
        }
        // Regular users go to schools
        else {
          navigate('/schools', { replace: true });
        }
      } else {
        // User is not logged in, show landing page
        setIsLoading(false);
      }
    }
  }, [user, isFounder, isCounselor, counselorName, authLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Landing page content for non-authenticated users
  return (
    <div className="landing-page min-h-screen bg-black font-instrument-sans relative">
      <DynamicBackground />
      <div className="relative z-10">
        <HeroSection />
        <DemoVideoSection />
        <MBASection />
        <PricingSection />
        <FounderProfile />
        <FAQSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;