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
      title: "College/Undergraduate",
      description: "High school students applying to undergraduate programs worldwide. Diya helps with college selection, essay writing, extracurricular planning, and application management.",
      examples: ["Liberal Arts", "Engineering", "Business", "Pre-Med", "Computer Science"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "MBA Programs",
      description: "Working professionals seeking to advance their careers through business education. Diya provides guidance on school selection, GMAT/GRE prep, essays, and career transitions.",
      examples: ["Full-time MBA", "Part-time MBA", "Executive MBA", "Online MBA"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      title: "LLM Programs",
      description: "Law graduates pursuing advanced legal education abroad. Diya helps with law school selection, application essays, recommendation letters, and career planning in international law.",
      examples: ["Corporate Law", "International Law", "Tax Law", "Intellectual Property"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "Masters Programs",
      description: "Graduates seeking specialized knowledge in their field. Diya assists with program selection, research proposals, academic essays, and career advancement strategies.",
      examples: ["MS Computer Science", "MS Data Science", "MS Finance", "MA Economics", "MS Engineering"]
    },
    {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "PhD Programs",
      description: "Advanced researchers pursuing doctoral studies. Diya helps with research proposal development, faculty matching, funding applications, and academic career planning.",
      examples: ["STEM PhD", "Humanities PhD", "Social Sciences PhD", "Professional Doctorates"]
    }
  ];

  return (
    <section id="programs" className="py-12 sm:py-16 md:py-20 lg:py-16 xl:py-20 2xl:py-24 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/5 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-12 md:mb-14 lg:mb-10 xl:mb-12 2xl:mb-16 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-brand-orange font-inter mb-4 sm:mb-6 lg:mb-4 xl:mb-6 leading-tight">
            Who Can Use Diya?
            <span className="block leading-relaxed text-brand-orange">
              Every Student, Every Program
            </span>
          </h2>
        </div>

        {/* Program Types Table */}
        <div ref={contentRef} className={`scroll-scale-in ${contentVisible ? 'animate' : ''}`}>
          <div className="max-w-2xl mx-auto">
            <div className="bg-card/20 backdrop-blur-sm rounded-2xl border border-primary/20 p-6 lg:p-6 xl:p-8">
              <div className="space-y-3 lg:space-y-3 xl:space-y-4">
                {programTypes.map((program, index) => (
                  <button
                    key={index} 
                    onClick={() => navigate('/auth')}
                    className={`w-full flex items-center space-x-4 p-3 lg:p-3 xl:p-4 rounded-xl hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer scroll-fade-in ${contentVisible ? 'animate' : ''} group`} 
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    {/* Checkmark */}
                    <div className="flex-shrink-0 w-7 h-7 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-[#D07D00] rounded-full flex items-center justify-center group-hover:shadow-[0_0_15px_hsl(25,100%,50%)] transition-all duration-200">
                      <svg className="w-4 h-4 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {/* Program Name */}
                    <h3 className="text-base sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-semibold text-foreground font-inter group-hover:text-primary transition-colors duration-200">
                      {program.title}
                    </h3>

                    {/* Arrow Icon */}
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-4 h-4 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MBASection;
