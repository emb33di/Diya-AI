import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { trackEvent } from "@/utils/analytics";

const CTASection = () => {
  const navigate = useNavigate();
  const { elementRef: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  const handleGetStartedClick = () => {
    trackEvent('cta_click', {
      cta_type: 'get_started_for_free',
      page: 'cta_section',
      button_text: 'Get Started For Free'
    });
    navigate('/auth?mode=signup');
  };

  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/5 to-background">
      <div className="max-w-7xl mx-auto">
        {/* CTA Section */}
        <div ref={ctaRef} className={`text-center scroll-fade-in ${ctaVisible ? 'animate' : ''}`}>
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground font-inter">Ready to take control of your future?</h2>
            <div className="flex justify-center">
              <Button 
                onClick={handleGetStartedClick} 
                size="lg" 
                className="text-base sm:text-lg rounded-xl sm:rounded-2xl font-semibold text-white shadow-lg hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-all duration-200 my-0 mx-0 px-4 sm:px-[10px] py-3 sm:py-[10px] touch-manipulation"
              >
                Get Started For Free
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
