import { useState, useEffect, useRef } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import MountainWaves from "@/components/MountainWaves";
import { Button } from "@/components/ui/button";
import IvyReadinessReport from "@/components/IvyReadinessReport";

const HeroSection = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { elementRef: containerRef, isVisible: videoVisible } = useScrollAnimation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [showIvyReport, setShowIvyReport] = useState(false);
  const fullText = "Meet Diya";

  // Typing animation effect - runs every 10 seconds
  useEffect(() => {
    if (!headerVisible) return;

    const startTypingAnimation = () => {
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

      return typingInterval;
    };

    // Start the first animation immediately
    let typingInterval = startTypingAnimation();

    // Set up interval to restart animation every 10 seconds
    const restartInterval = setInterval(() => {
      if (typingInterval) {
        clearInterval(typingInterval);
      }
      typingInterval = startTypingAnimation();
    }, 10000); // 10 seconds

    return () => {
      if (typingInterval) {
        clearInterval(typingInterval);
      }
      clearInterval(restartInterval);
    };
  }, [headerVisible, fullText]);

  // Ensure essays video loops continuously
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {
        // Silently handle play errors
      });
    };

    video.addEventListener('ended', handleEnded);
    
    // Ensure video plays when it comes into view
    if (videoVisible) {
      video.play().catch(() => {
        // Silently handle play errors
      });
    }

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoVisible]);

  return <section className="min-h-screen flex items-center justify-center px-4 sm:px-6 pt-8 sm:pt-12 pb-2 sm:pb-12 relative overflow-hidden">
      <MountainWaves />
      <div className="max-w-7xl mx-auto w-full relative z-20">
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          {/* Top Center - Heading */}
          <div className="text-center">
            {/* Meet Diya AI Header */}
            <div ref={headerRef} className={`scroll-fade-in ${headerVisible ? 'animate' : ''} mb-4`}>
              <span className="meet-diya-text text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-wider font-inter" style={{ color: '#D07D00' }}>
                {displayedText}
                {showCursor && <span className="animate-pulse" style={{ color: '#D07D00' }}>|</span>}
              </span>
            </div>

            {/* Hero Headline */}
            <div ref={contentRef} className={`scroll-fade-in ${contentVisible ? 'animate' : ''}`}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight tracking-tight font-inter">
                Beat the January Deadline
                <br />
                Fix your application in minutes
              </h1>
            </div>

            {/* Credentials */}
            <div className={`text-center scroll-fade-in scroll-stagger-1 ${contentVisible ? 'animate' : ''} mt-4 sm:mt-6`}>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white font-medium">
                Built by Indian alumni from Harvard and UChicago.
              </p>
            </div>
          </div>

          {/* Essay Demo Video */}
          <div ref={containerRef} className={`flex justify-center scroll-fade-in ${videoVisible ? 'animate' : ''} relative z-30 w-full mt-8 sm:mt-12`}>
            <div className="w-full max-w-[90%] sm:max-w-md md:max-w-2xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500">
                <video
                  ref={videoRef}
                  className="w-full h-auto block"
                  src="/Website Previews/essays-wide.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Essays demo video"
                />
              </div>
            </div>
          </div>

          {/* Free Essay Scoring Button */}
          <div className={`flex justify-center scroll-fade-in ${videoVisible ? 'animate' : ''} relative z-30 w-full mt-6 sm:mt-8`}>
            <Button
              onClick={() => setShowIvyReport(true)}
              className="text-base sm:text-lg md:text-xl font-semibold text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:opacity-90 transition-opacity shadow-lg"
              style={{ backgroundColor: '#D07D00' }}
            >
              Upload your essay and get Harvard-grade feedback for free
            </Button>
          </div>
        </div>
      </div>
      
      {/* Ivy Readiness Report Modal */}
      {showIvyReport && (
        <IvyReadinessReport
          open={showIvyReport}
          onOpenChange={setShowIvyReport}
        />
      )}
    </section>;
};
export default HeroSection;