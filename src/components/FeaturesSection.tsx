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
    title: "School List Builder",
    description: "Have a voice call with Diya just like you would with a counselor and she will create your perfect college list."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>,
    title: "Write All Your Essays",
    description: "All your essays in one place and with Diya's AI essay assistant get instant actionable feedback on your essays."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>,
    title: "Stay on Top of Your Deadlines",
    description: "Diya helps you stay on top of your deadlines to ensure you don't miss any important dates."
 } ];
  return <section id="features" className="py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-10 md:mb-12 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-inter mb-4 sm:mb-5 leading-tight">
            <span className="text-brand-orange">Meet Your AI Admissions Assistant</span>

          </h2>
        </div>

        {/* Features Grid */}
        <div ref={featuresRef} className={`scroll-scale-in ${featuresVisible ? 'animate' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {features.map((feature, index) => (
              <div key={index} className={`group cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''} h-full`} style={{
                transitionDelay: `${index * 0.1}s`
              }}>
                <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-primary/20 p-4 sm:p-5 hover:border-primary/40 hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full flex flex-col">
                  {/* Icon */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 mx-auto shadow-glow group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300" style={{backgroundColor: '#D07D00'}}>
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 font-inter text-center">
                    {feature.title}
                  </h3>
                  <p className="text-white leading-relaxed text-base flex-grow text-center">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three Additional Cards - Personalized, Affordable, By Indians for Indians */}
        <div ref={featuresRef} className={`grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mt-6 sm:mt-8 scroll-scale-in ${featuresVisible ? 'animate' : ''}`}>
          <div className={`group cursor-pointer transition-all duration-300 hover:scale-100 active:scale-[0.99] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''}`} style={{ transitionDelay: '0.1s' }}>
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-primary/20 p-4 sm:p-5 text-center hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow" style={{backgroundColor: '#D07D00'}}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 font-inter">Personalized</h3>
              <p className="text-base text-white leading-relaxed">
                Diya tailors advice to your profile, goals, and aspirations. Every student gets a customized roadmap to success.
              </p>
            </div>
          </div>

          <div className={`group cursor-pointer transition-all duration-300 hover:scale-100 active:scale-[0.99] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''}`} style={{ transitionDelay: '0.25s' }}>
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-primary/20 p-4 sm:p-5 text-center hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow" style={{backgroundColor: '#D07D00'}}>
                <span className="text-xl sm:text-2xl font-bold text-white">₹</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 font-inter">Affordable</h3>
              <p className="text-base text-white leading-relaxed">
                Not everyone can afford an admissions counselor. Diya is designed to be affordable and accessible to everyone. 
              </p>
            </div>
          </div>

          <div className={`group cursor-pointer transition-all duration-300 hover:scale-100 active:scale-[0.99] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''}`} style={{ transitionDelay: '0.4s' }}>
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-primary/20 p-4 sm:p-5 text-center hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow" style={{backgroundColor: '#D07D00'}}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 font-inter">By Indians, For Indians</h3>
              <p className="text-base text-white leading-relaxed">
                Diya understands the Indian grading systems, preferences, and how little exposure we have to the foreign application process.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>;
};
export default FeaturesSection;