import { useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const HeroSection = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { elementRef: containerRef, isVisible: videoVisible } = useScrollAnimation();
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const fullText = "Meet Diya";

  // Typing animation effect
  useEffect(() => {
    if (!headerVisible) return;

    let currentIndex = 0;
    setDisplayedText("");
    setShowCursor(true);

    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // Hide cursor after a short delay
        setTimeout(() => setShowCursor(false), 500);
      }
    }, 100); // 100ms delay between each character

    return () => clearInterval(typingInterval);
  }, [headerVisible, fullText]);

  return <section className="min-h-screen flex items-center px-4 sm:px-6 pt-8 sm:pt-12 pb-2 sm:pb-12">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          {/* Top Center - Heading */}
          <div className="text-center mb-8 sm:mb-12">
            {/* Meet Diya AI Header */}
            <div ref={headerRef} className={`scroll-fade-in ${headerVisible ? 'animate' : ''} mb-4`}>
              <span className="meet-diya-text text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-wider font-inter" style={{ color: '#D07D00' }}>
                {displayedText}
                {showCursor && <span className="animate-pulse">|</span>}
              </span>
            </div>

            {/* Hero Headline */}
            <div ref={contentRef} className={`scroll-fade-in ${contentVisible ? 'animate' : ''}`}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight tracking-tight font-inter">
                India's AI Admissions Counselor
              </h1>
            </div>

            {/* Credentials */}
            <div className={`text-center scroll-fade-in scroll-stagger-1 ${contentVisible ? 'animate' : ''} mt-4 sm:mt-6`}>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl gold-shimmer font-medium">
                Built by Indian alumni from Harvard and UChicago.
              </p>
            </div>
          </div>

          {/* Video - Directly Below Heading */}
          <div ref={containerRef} className={`flex justify-center scroll-fade-in ${videoVisible ? 'animate' : ''} relative z-40 w-full mb-2 sm:mb-12`}>
            <div className="w-full max-w-[90%] sm:max-w-md md:max-w-2xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500">
                <div className="aspect-video bg-black relative">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/UNiRgMcLbfY?rel=0&modestbranding=1"
                    title="Website demo video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;