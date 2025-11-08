import { useState } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/utils/analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PricingSection = () => {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<"USD" | "INR">("INR");
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: cardRef, isVisible: cardVisible } = useScrollAnimation();

  const handleGetStartedClick = () => {
    trackEvent('cta_click', {
      cta_type: 'get_started',
      page: 'pricing',
      button_text: 'Get Started'
    });
    navigate('/auth?mode=signup');
  };

  return (
    <section id="plans" className="py-8 sm:py-12 md:py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-12 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 leading-tight text-white">
            One Price, Unlimited Access
          </h2>
        </div>

        {/* Single Pricing Card - Left Features, Right Price */}
        <div className="max-w-5xl mx-auto">
          <div ref={cardRef} className={`rounded-2xl sm:rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/5 to-primary/10 p-8 sm:p-10 lg:p-12 hover:shadow-[0_0_40px_hsl(var(--primary)/0.3)] transition-all duration-300 scroll-scale-in ${cardVisible ? 'animate' : ''}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left Side - Features */}
              <div>
                <h4 className="text-xl sm:text-2xl font-semibold text-brand-orange mb-6">What's included:</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-base sm:text-lg text-white">Unlimited AI Essay Reviews</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-base sm:text-lg text-white">Resume AI and Formatting</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-base sm:text-lg text-white">LOR Management and Professional LOR templates</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Price */}
              <div className="text-center">
                <div className="mb-4">
                  <div className="mb-3">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary">
                      {currency === "USD" ? "$90 USD" : "₹7,999"}
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl text-white mb-3">Everything you need for your college application journey</p>
                  <Select value={currency} onValueChange={(value: "USD" | "INR") => setCurrency(value)}>
                    <SelectTrigger className="w-32 bg-primary/25 border-primary/40 text-white hover:bg-primary/35 focus:ring-primary mx-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-primary/25 border-primary/40 backdrop-blur-sm">
                      <SelectItem value="USD" className="text-white focus:bg-primary/35">USD</SelectItem>
                      <SelectItem value="INR" className="text-white focus:bg-primary/35">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Centered Button */}
            <div className="text-center mt-8">
              <Button 
                onClick={handleGetStartedClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 text-lg"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
