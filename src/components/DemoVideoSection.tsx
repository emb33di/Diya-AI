import { useEffect, useRef } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const DemoVideoSection = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: textRef, isVisible: textVisible } = useScrollAnimation();
  const { elementRef: containerRef, isVisible: videoVisible } = useScrollAnimation();
  const { elementRef: resumeTextRef, isVisible: resumeTextVisible } = useScrollAnimation();
  const { elementRef: resumeContainerRef, isVisible: resumeVideoVisible } = useScrollAnimation();
  const { elementRef: lorTextRef, isVisible: lorTextVisible } = useScrollAnimation();
  const { elementRef: lorContainerRef, isVisible: lorVideoVisible } = useScrollAnimation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeVideoRef = useRef<HTMLVideoElement>(null);
  const lorVideoRef = useRef<HTMLVideoElement>(null);

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

  // Ensure resume video loops continuously
  useEffect(() => {
    const video = resumeVideoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {
        // Silently handle play errors
      });
    };

    video.addEventListener('ended', handleEnded);
    
    // Ensure video plays when it comes into view
    if (resumeVideoVisible) {
      video.play().catch(() => {
        // Silently handle play errors
      });
    }

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [resumeVideoVisible]);

  // Ensure LOR video loops continuously
  useEffect(() => {
    const video = lorVideoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {
        // Silently handle play errors
      });
    };

    video.addEventListener('ended', handleEnded);
    
    // Ensure video plays when it comes into view
    if (lorVideoVisible) {
      video.play().catch(() => {
        // Silently handle play errors
      });
    }

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [lorVideoVisible]);

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Section Header */}
        <div ref={headerRef} className={`text-center mb-8 sm:mb-10 md:mb-12 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-inter mb-4 sm:mb-5 leading-tight">
            <span className="text-brand-orange"> Your AI Admissions Assistant</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left Side - Text Content */}
          <div ref={textRef} className={`scroll-fade-in ${textVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Perfect your essays using our AI tool in no time
            </h3>
          </div>

          {/* Right Side - Video */}
          <div ref={containerRef} className={`flex justify-center lg:justify-end scroll-slide-right ${videoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-2xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500 inline-block">
                  <video
                    ref={videoRef}
                    className="w-full h-auto block"
                    src="/Website Previews/Essays.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-label="Essays demo video"
                  />
              </div>
            </div>
          </div>
        </div>

        {/* Resume Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center mt-12 sm:mt-16 md:mt-20">
          {/* Left Side - Video */}
          <div ref={resumeContainerRef} className={`flex justify-center lg:justify-start scroll-slide-left ${resumeVideoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-2xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500 inline-block">
                <video
                  ref={resumeVideoRef}
                  className="w-full h-auto block"
                  src="/Website Previews/Resume.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Resume demo video"
                />
              </div>
            </div>
          </div>

          {/* Right Side - Text Content */}
          <div ref={resumeTextRef} className={`scroll-fade-in ${resumeTextVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Format your resume perfectly within seconds
            </h3>
          </div>
        </div>

        {/* LOR Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center mt-12 sm:mt-16 md:mt-20">
          {/* Left Side - Text Content */}
          <div ref={lorTextRef} className={`scroll-fade-in ${lorTextVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Get direct personalized guidance on managing your LORs
            </h3>
          </div>

          {/* Right Side - Video */}
          <div ref={lorContainerRef} className={`flex justify-center lg:justify-end scroll-slide-right ${lorVideoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-2xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500 inline-block">
                <video
                  ref={lorVideoRef}
                  className="w-full h-auto block"
                  src="/Website Previews/LOR.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="LOR demo video"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoVideoSection;

