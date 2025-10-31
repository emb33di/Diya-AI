import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import HeroSection from "@/components/HeroSection";
import StarryBackground from "@/components/StarryBackground";
import FeaturesSection from "@/components/FeaturesSection";
import MBASection from "@/components/MBASection";
import FAQSection from "@/components/FAQSection";
import PricingSection from "@/components/PricingSection";
import FounderProfile from "@/components/FounderProfile";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import "@/styles/landing.css";

const Index = () => {
  const navigate = useNavigate();
  const { user, isFounder, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // Redirect founders to founder portal, others to dashboard
        navigate(isFounder ? '/founder-portal' : '/dashboard', { replace: true });
      } else {
        // User is not logged in, show landing page
        setIsLoading(false);
      }
    }
  }, [user, isFounder, authLoading, navigate]);

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
    <div className="landing-page min-h-screen bg-black font-inter relative">
      <StarryBackground />
      <div className="relative z-10">
        <HeroSection />
        <FeaturesSection />
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