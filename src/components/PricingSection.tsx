import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const navigate = useNavigate();
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: cardRef1, isVisible: card1Visible } = useScrollAnimation();
  const { elementRef: cardRef2, isVisible: card2Visible } = useScrollAnimation();
  const { elementRef: cardRef3, isVisible: card3Visible } = useScrollAnimation();

  return (
    <section id="pricing" className="py-8 sm:py-12 md:py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-12 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{color: '#D07D00'}}>
            The Best Admissions Guidance, At An Affordable Price
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white max-w-2xl mx-auto leading-relaxed">
            Start your journey to top universities with our affordable, expert-designed plans
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto justify-items-center">
          {/* Free Plan */}
          <div ref={cardRef1} className={`rounded-2xl sm:rounded-3xl border border-primary/20 p-6 sm:p-8 hover:border-primary/40 hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 scroll-scale-in ${card1Visible ? 'animate' : ''} flex flex-col`}>
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-brand-orange mb-2">
                Free
              </h3>
              <div className="mb-4">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary">₹0</span>
                <p className="text-sm text-white mt-1">Manage your entire application</p>
              </div>
            </div>

            <div className="mb-8 flex-1">
              <h4 className="text-base sm:text-lg font-semibold text-brand-orange mb-4">What this includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Voice onboarding call with Diya</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Deadline and progress tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Manage all your essays in one place</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Resume management and formatting</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Limited access to LOR templates, successful essays, and sample resumes</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Pro Plan */}
          <div ref={cardRef2} className={`rounded-2xl sm:rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/5 to-primary/10 p-6 sm:p-8 hover:shadow-[0_0_40px_hsl(var(--primary)/0.3)] transition-all duration-300 scroll-scale-in ${card2Visible ? 'animate' : ''} relative flex flex-col`}>
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-medium">
                Most Popular
              </span>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-brand-orange mb-2">
                Pro
              </h3>
              <div className="mb-4">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary">₹10,000</span>
                <p className="text-sm text-white mt-1">AI-powered counseling and feedback</p>
              </div>
            </div>

            <div className="mb-8 flex-1">
              <h4 className="text-base sm:text-lg font-semibold text-brand-orange mb-4">What this includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white font-medium">All features in Free, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Unlimited access to Diya essay feedback and scoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Unlimited access to Diya resume formatting and downloads</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Access to the entire library of successful LORs, resumes, and essays</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">Access to weekly webinars and college guidance videos</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Expert Plan - Temporarily commented out */}
          {/* <div ref={cardRef3} className={`rounded-2xl sm:rounded-3xl border border-primary/20 p-6 sm:p-8 hover:border-primary/40 hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 scroll-scale-in ${card3Visible ? 'animate' : ''} flex flex-col`}>
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Expert
              </h3>
              <div className="mb-4">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary">₹30,000</span>
                <p className="text-sm text-muted-foreground mt-1">Application review from the founder</p>
              </div>
            </div>

            <div className="mb-8 flex-1">
              <h4 className="text-base sm:text-lg font-semibold text-brand-orange mb-4">What this includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground font-medium">All features in Pro, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Full application review report from our Founder</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Includes 5 College Essays + Common App</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">2 day turnaround on review</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => navigate('/auth?mode=signup')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-auto"
            >
              Upgrade to Expert
            </Button>
          </div> */}
        </div>

        {/* Centered Button */}
        <div className="text-center mt-8 sm:mt-12">
          <Button 
            onClick={() => navigate('/auth?mode=signup')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 text-lg"
          >
            Get Started Today for Free
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
