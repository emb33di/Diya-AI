import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const BenefitsSection = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: featuresRef, isVisible: featuresVisible } = useScrollAnimation();

  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/5 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-12 sm:mb-16 md:mb-20 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{color: '#D07D00'}}>
            Why Diya is the right fit for you?
          </h2>
        </div>

        {/* Three-Part Feature Section */}
        <div ref={featuresRef} className={`grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-20 sm:mb-24 md:mb-28 scroll-scale-in ${featuresVisible ? 'animate' : ''}`}>
          <div className={`group cursor-pointer transition-all duration-300 hover:scale-100 active:scale-[0.99] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''}`} style={{ transitionDelay: '0.1s' }}>
            <div className="bg-card/30 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-primary/20 p-4 sm:p-6 md:p-8 text-center hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow" style={{backgroundColor: '#D07D00'}}>
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4 font-inter">Personalized</h3>
              <p className="text-sm sm:text-base text-white leading-relaxed">
                Diya understands that you are unique, and tailors advice to your profile, goals, and aspirations. Every student gets a customized roadmap to success.
              </p>
            </div>
          </div>

          <div className={`group cursor-pointer transition-all duration-300 hover:scale-100 active:scale-[0.99] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''}`} style={{ transitionDelay: '0.25s' }}>
            <div className="bg-card/30 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-primary/20 p-4 sm:p-6 md:p-8 text-center hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow" style={{backgroundColor: '#D07D00'}}>
                <span className="text-2xl sm:text-3xl font-bold text-white">₹</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4 font-inter">Affordable</h3>
              <p className="text-sm sm:text-base text-white leading-relaxed">
                Admissions counselors charge exorbitant fees that not everyone can afford. Diya democratizes premium college advice and assistance at a fraction of the cost.
              </p>
            </div>
          </div>

          <div className={`group cursor-pointer transition-all duration-300 hover:scale-100 active:scale-[0.99] touch-manipulation scroll-fade-in ${featuresVisible ? 'animate' : ''}`} style={{ transitionDelay: '0.4s' }}>
            <div className="bg-card/30 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-primary/20 p-4 sm:p-6 md:p-8 text-center hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 h-full">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow" style={{backgroundColor: '#D07D00'}}>
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4 font-inter">By Indians, For Indians</h3>
              <p className="text-sm sm:text-base text-white leading-relaxed">
                Built by Indians for Indians. As Indian alumni from Harvard and Dartmouth, we understand the unique challenges and opportunities for Indian students to shine in their applications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;