import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const FounderProfile = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: profileRef, isVisible: profileVisible } = useScrollAnimation();

  return (
    <section id="founder" className="py-8 sm:py-12 md:py-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Founder Profile Box */}
        <div ref={profileRef} className={`rounded-2xl sm:rounded-3xl border border-primary/20 p-6 sm:p-8 hover:border-primary/40 hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 scroll-scale-in ${profileVisible ? 'animate' : ''}`}>
          {/* Section Header */}
          <div ref={headerRef} className={`text-left mb-6 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
            <h2 className="text-xl sm:text-2xl md:text-3xl text-center font-extrabold font-medium font-inter mb-4 leading-tight" style={{color: '#D07D00'}}>
              Meet Our Founder
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-8">
          {/* Left Side: Photo, Name, and Schools */}
          <div className="flex-shrink-0 text-center w-full sm:w-auto">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-border/30 shadow-sm mx-auto mb-4">
              <img 
                src="/founder_pic.jpeg"
                alt="Mihir Bedi - Founder" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to a placeholder if image doesn't exist
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%236b7280'%3EAdd Founder Photo%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            
            <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground mb-3 font-inter">
              Mihir Bedi
            </h3>
            
            <p className="text-sm sm:text-base font-medium text-foreground mb-3">
              University of Chicago | Harvard Law School
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a 
                href="https://www.linkedin.com/in/mihir-bedi-2444b1182/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              
              <a 
                href="mailto:mihir@meetdiya.com"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Email
              </a>
            </div>
          </div>

          {/* Right Side: Body Text */}
          <div className="flex-1 text-left sm:text-left">
            <p className="text-base sm:text-lg text-white leading-relaxed">
            Raised in Delhi and a graduate of DPS R.K. Puram, Mihir studied Economics at the University of Chicago and is now pursuing his law degree at Harvard Law School. Having navigated the competitive admissions process himself twice, Mihir brings first-hand insight into what top global universities seek. He founded Diya AI to make world-class admissions guidance affordable, transparent, and accessible to every student in India.
            </p>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderProfile;
