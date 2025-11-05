import { useState, useRef } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Play } from "lucide-react";

const HeroSection = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { elementRef: containerRef, isVisible: videoVisible } = useScrollAnimation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayButton, setShowPlayButton] = useState(true);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setShowPlayButton(false);
    }
  };

  const handleVideoPause = () => {
    setShowPlayButton(true);
  };

  const handleVideoEnd = () => {
    setShowPlayButton(true);
  };

  return <section className="min-h-screen flex items-center px-4 sm:px-6 pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          {/* Top Center - Heading */}
          <div className="text-center mb-8 sm:mb-12">
            {/* Meet Diya AI Header */}
            <div ref={headerRef} className={`scroll-fade-in ${headerVisible ? 'animate' : ''} mb-4`}>
              <span className="gold-shimmer text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-wider uppercase">Meet Diya</span>
            </div>

            {/* Hero Headline */}
            <div ref={contentRef} className={`scroll-fade-in ${contentVisible ? 'animate' : ''}`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight tracking-tight font-inter">
                India's AI Admissions Counselor
              </h1>
            </div>
          </div>

          {/* Video - Directly Below Heading */}
          <div ref={containerRef} className={`flex justify-center scroll-fade-in ${videoVisible ? 'animate' : ''} relative z-40 w-full mb-8 sm:mb-12`}>
            <div className="max-w-4xl w-full">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500">
                <div className="aspect-video bg-black relative group">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    src="/Website Previews/Website Demo Video.mp4"
                    playsInline
                    controls
                    onPause={handleVideoPause}
                    onEnded={handleVideoEnd}
                    aria-label="Website demo video"
                  />
                  {/* Play Button Overlay */}
                  {showPlayButton && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer hover:bg-black/50 transition-all duration-300"
                      onClick={handlePlayClick}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.8)] transition-all duration-300 hover:scale-110">
                        <Play className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white ml-1" fill="white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className={`text-center scroll-fade-in scroll-stagger-1 ${contentVisible ? 'animate' : ''}`}>
            <p className="text-lg sm:text-xl md:text-2xl gold-shimmer font-medium">
              Built by Indian alumni from Harvard and UChicago for Indian students.
            </p>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;