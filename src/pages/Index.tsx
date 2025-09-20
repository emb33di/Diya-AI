import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import StarryBackground from "@/components/StarryBackground";
import FeaturesSection from "@/components/FeaturesSection";
import MBASection from "@/components/MBASection";
import FAQSection from "@/components/FAQSection";
import BenefitsSection from "@/components/BenefitsSection";
import PricingSection from "@/components/PricingSection";
import FounderProfile from "@/components/FounderProfile";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import "@/styles/landing.css";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // User is logged in, redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          // User is not logged in, show landing page
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

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
        <BenefitsSection />
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