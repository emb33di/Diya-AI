import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const navigate = useNavigate();
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: cardRef1, isVisible: card1Visible } = useScrollAnimation();
  const { elementRef: cardRef2, isVisible: card2Visible } = useScrollAnimation();

  return (
    <section id="pricing" className="py-8 sm:py-12 md:py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-12 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 leading-tight gold-shimmer">
            The Best Admissions Guidance, At An Affordable Price
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start your journey to top universities with our affordable, expert-guided plans
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Essential Plan */}
          <div ref={cardRef1} className={`rounded-2xl sm:rounded-3xl border border-primary/20 p-6 sm:p-8 hover:border-primary/40 hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 scroll-scale-in ${card1Visible ? 'animate' : ''} flex flex-col`}>
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Essential
              </h3>
              <div className="mb-4">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary">₹8,500</span>
                <p className="text-sm text-muted-foreground mt-1">Covers up to 5 schools</p>
              </div>
            </div>

            <div className="mb-8 flex-1">
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-4">What this includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">AI school list generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Deadline tracking and active reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Webinars from top graduates and admissions officers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Essay brainstorming for up to 5 schools</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">AI essay improvements for up to 5 schools</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-auto"
            >
              Get Started
            </Button>
          </div>

          {/* Premium Plan */}
          <div ref={cardRef2} className={`rounded-2xl sm:rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/5 to-primary/10 p-6 sm:p-8 hover:shadow-[0_0_40px_hsl(var(--primary)/0.3)] transition-all duration-300 scroll-scale-in ${card2Visible ? 'animate' : ''} relative flex flex-col`}>
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-medium">
                Most Popular
              </span>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Premium
              </h3>
              <div className="mb-4">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary">₹15,000</span>
                <p className="text-sm text-muted-foreground mt-1">Covers up to 15 schools</p>
              </div>
            </div>

            <div className="mb-8 flex-1">
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-4">What this includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">AI school list generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Deadline tracking and active reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground">Webinars from top graduates and admissions officers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground font-medium">Essay brainstorming for up to 15 schools</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground font-medium">AI Essay Improvements for up to 15 schools</span>
                </li>                
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground font-medium">Full application review by an expert</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground font-medium">One-on-one session with an expert advisor</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-muted-foreground font-medium">Premier access to all incoming features like scholarship matching, financial aid assistance, and volunteer program matching.</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-auto"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
