import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { useNavigate } from "react-router-dom";

const MBASection = () => {
  const navigate = useNavigate();
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: contentRef, isVisible: contentVisible } = useScrollAnimation();

  const programTypes = [
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
      title: "Undergraduate",
      description: "",
      examples: ["Liberal Arts", "Engineering", "Business", "Pre-Med", "Computer Science"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "MBA",
      description: "",
      examples: ["Full-time MBA", "Part-time MBA", "Executive MBA", "Online MBA"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      title: "LLM",
      description: "",
      examples: ["Corporate Law", "International Law", "Tax Law", "Intellectual Property"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "Masters",
      description: "",
      examples: ["MS Computer Science", "MS Data Science", "MS Finance", "MA Economics", "MS Engineering"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "PhD",
      description: "",
      examples: ["STEM PhD", "Humanities PhD", "Social Sciences PhD", "Professional Doctorates"]
    }
  ];

  return (
    <section id="programs" className="py-12 sm:py-16 md:py-20 lg:py-16 xl:py-20 2xl:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-12 md:mb-14 lg:mb-10 xl:mb-12 2xl:mb-16 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white font-inter mb-4 sm:mb-6 lg:mb-4 xl:mb-6 leading-tight">
            Who Can Use Diya?
            <span className="block leading-relaxed text-white">
              Every Student, Every Program
            </span>
          </h2>
        </div>

        {/* Program Types - Vertical Timeline Style */}
        <div ref={contentRef} className={`scroll-scale-in ${contentVisible ? 'animate' : ''}`}>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="space-y-6 md:space-y-8">
                {programTypes.map((program, index) => {
                  return (
                    <button
                      key={index}
                      onClick={() => navigate('/auth')}
                      className={`relative w-full group scroll-fade-in ${contentVisible ? 'animate' : ''}`}
                      style={{ transitionDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-6 md:gap-8">
                        {/* Icon Circle - Left Side */}
                        <div className="relative flex-shrink-0 z-10">
                          {/* Outer glow ring */}
                          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl group-hover:bg-primary/40 group-hover:scale-150 transition-all duration-500"></div>
                          
                          {/* Icon container */}
                          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center border-4 border-black/50 shadow-[0_0_20px_hsl(var(--primary)/0.4)] group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] group-hover:scale-110 transition-all duration-300">
                            <div className="text-white scale-110">
                              {program.icon}
                            </div>
                          </div>
                        </div>

                        {/* Content - Right Side */}
                        <div className="flex-1">
                          <div className="relative">
                            {/* Hover glow effect */}
                            <div className="absolute -inset-4 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
                            
                            <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-5 md:p-6 border border-primary/20 group-hover:border-primary/40 group-hover:bg-gradient-to-r group-hover:from-primary/15 group-hover:via-primary/10 group-hover:to-transparent transition-all duration-300">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="text-xl md:text-2xl font-bold text-foreground font-inter group-hover:text-primary transition-colors duration-300">
                                    {program.title}
                                  </h3>
                                </div>
                                
                                {/* Arrow indicator */}
                                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 border border-primary/20 group-hover:border-primary/40 transition-all duration-300 group-hover:translate-x-1">
                                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MBASection;
