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
            <h2 className="text-lg sm:text-xl md:text-2xl text-center font-extrabold font-medium font-inter mb-4 leading-tight" style={{color: '#D07D00'}}>
              Meet Our Founder
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
          {/* Left Side: Photo, Name, and Schools */}
          <div className="flex-shrink-0 text-center">
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
            
            <p className="text-sm sm:text-base font-medium text-foreground">
              University of Chicago | Harvard Law School
            </p>
          </div>

          {/* Right Side: Body Text */}
          <div className="flex-1 text-left sm:text-left">
            <p className="text-sm sm:text-base text-white leading-relaxed">
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
