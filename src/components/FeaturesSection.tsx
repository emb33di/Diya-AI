import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
const FeaturesSection = () => {
  const navigate = useNavigate();
  const {
    elementRef: headerRef,
    isVisible: headerVisible
  } = useScrollAnimation();
  const {
    elementRef: featuresRef,
    isVisible: featuresVisible
  } = useScrollAnimation();
  const features = [{
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>,
    title: "Pick the Right Schools",
    description: "No form filling required. Just talk to Diya and she will analyze your academic background, extracurriculars, interests,and aspirations to create the perfect college list."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>,
    title: "Essay Writing & Management",
    description: "Manage all your essays in one place, and with Diya's AI essay writing assistant, you can get instantfeedback on your essays and improve them."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>,
    title: "Deadline Tracking",
    description: "Never miss an important deadline again with Diya. She sends you weekly reminders to keep you on track—be it LORs, predicted scores, or application deadlines."
 } ];
  return <section id="features" className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-16 sm:mb-20 md:mb-24 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-inter mb-6 sm:mb-8 leading-tight">
            <span className="text-foreground">Your Complete Admissions Hub</span>
            <span className="block leading-relaxed" style={{color: '#D07D00'}}>
              Powered by Diya
            </span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">Diya is your one-stop solution for managing the entire college admissions process for undergraduate and graduate programs. </p>
        </div>

        {/* Features Grid */}
        <div ref={featuresRef} className={`scroll-scale-in ${featuresVisible ? 'animate' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div key={index} className={`group cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''} h-full`} style={{
                transitionDelay: `${index * 0.1}s`
              }}>
                <div className="bg-card/40 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-primary/20 p-6 sm:p-8 hover:border-primary/40 hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full flex flex-col">
                  {/* Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 shadow-glow group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300" style={{backgroundColor: '#D07D00'}}>
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 font-inter">
                    {feature.title}
                  </h3>
                  <p className="text-white leading-relaxed text-sm sm:text-base flex-grow">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>
    </section>;
};
export default FeaturesSection;