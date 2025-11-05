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
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-inter mb-4 sm:mb-5 leading-tight">
            <span className="text-brand-orange">Manage your entire application</span>
            <br />
            <span className="text-brand-orange">All in one place.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-12 items-center">
          {/* Left Side - Text Content */}
          <div ref={textRef} className={`scroll-fade-in lg:col-span-2 ${textVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Instantly perfect your essays
            </h3>
          </div>

          {/* Right Side - Video */}
          <div ref={containerRef} className={`flex justify-center lg:justify-end scroll-slide-right lg:col-span-3 ${videoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-3xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500 inline-block">
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
        </div>

        {/* Resume Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-12 items-center mt-12 sm:mt-16 md:mt-20">
          {/* Left Side - Video */}
          <div ref={resumeContainerRef} className={`flex justify-center lg:justify-start scroll-slide-left lg:col-span-3 ${resumeVideoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-3xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500 inline-block">
                <video
                  ref={resumeVideoRef}
                  className="w-full h-auto block"
                  src="/Website Previews/resume-wide.mp4"
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
          <div ref={resumeTextRef} className={`scroll-fade-in lg:col-span-2 ${resumeTextVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Build your resume within minutes
            </h3>
          </div>
        </div>

        {/* LOR Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-12 items-center mt-12 sm:mt-16 md:mt-20">
          {/* Left Side - Text Content */}
          <div ref={lorTextRef} className={`scroll-fade-in lg:col-span-2 ${lorTextVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Stay on top of deadlines and LORs.
            </h3>
          </div>

          {/* Right Side - Video */}
          <div ref={lorContainerRef} className={`flex justify-center lg:justify-end scroll-slide-right lg:col-span-3 ${lorVideoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-3xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500 inline-block">
                <video
                  ref={lorVideoRef}
                  className="w-full h-auto block"
                  src="/Website Previews/lor-wide.mp4"
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

