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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>,
    title: "Diya - Your 24/7 Counselor",
    description: "Diya is just like any other counselor, but smarter and available 24/7. Ask her questions about colleges, financial aid applications, essay prompts or whatever is on your mind about your admissions journey."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>,
    title: "Pick the Right Schools",
    description: "Diya analyzes your academic background, extracurriculars, interests,and aspirations to create the perfect college list. She offers you hyper-personalized school recommendations that work for you."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>,
    title: "Essay Writing & Management",
    description: "Diya track all your essays across different schools and helps you choose between essay prompts. She remembers your stories to help you craft compelling narratives that showcase your unique voice."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>,
    title: "Deadline Tracking",
    description: "Never miss an important deadline again with Diya. She automatically tracks all application deadlines, makes sure you get your letters of recommendation and predicted scores on time, sending you timely reminders."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>,
    title: "Exclusive Webinar Access",
    description: "Learn directly from experts and current students about different schools, application strategies, and insider tips with Diya. Access our library of webinars featuring alumni and admissions officers."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>,
    title: "Build Your Story Early",
    description: "Students can start working with Diya as early as 9th grade. Diya helps you build a holistic application, identifying volunteering opportunities and extracurriculars to build a strong story and profile."
  }];
  return <section id="features" className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-16 sm:mb-20 md:mb-24 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground font-inter mb-6 sm:mb-8 leading-tight">
            Your Complete Admissions Hub
            <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent leading-relaxed">
              Powered by Diya
            </span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">Diya is your one-stop solution for managing the entire college admissions process for undergraduate and graduate programs. From initial research to final submission, Diya has got you covered.</p>
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
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center mb-6 shadow-glow group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300">
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 font-inter">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base flex-grow">
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