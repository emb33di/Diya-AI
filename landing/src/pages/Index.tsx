import HeroSection from "@/components/HeroSection";
import Navigation from "@/components/Navigation";
import StarryBackground from "@/components/StarryBackground";
import FeaturesSection from "@/components/FeaturesSection";
import MBASection from "@/components/MBASection";
import FAQSection from "@/components/FAQSection";
import BenefitsSection from "@/components/BenefitsSection";
import PricingSection from "@/components/PricingSection";
import FounderProfile from "@/components/FounderProfile";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-inter relative">
      <StarryBackground />
      <Navigation />
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
  );
};

export default Index;
