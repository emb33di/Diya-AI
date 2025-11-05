import { useEffect, useRef } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/utils/analytics";

const DemoVideoSection = () => {
  const navigate = useNavigate();
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

  const handleTryNowClick = (section: string) => {
    trackEvent('cta_click', {
      cta_type: 'try_now',
      page: 'demo_video_section',
      section: section,
      button_text: 'Try Diya'
    });
    navigate('/auth?mode=signup');
  };

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
            <Button 
              onClick={() => handleTryNowClick('essays')} 
              className="mt-4 sm:mt-6 text-sm sm:text-base font-semibold text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#D07D00' }}
            >
              Try Diya
            </Button>
          </div>

          {/* Right Side - Video */}
          <div ref={containerRef} className={`flex justify-center lg:justify-end scroll-slide-right lg:col-span-3 ${videoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
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
            <div className="w-full max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
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
            <Button 
              onClick={() => handleTryNowClick('resume')} 
              className="mt-4 sm:mt-6 text-sm sm:text-base font-semibold text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#D07D00' }}
            >
              Try Diya
            </Button>
          </div>
        </div>

        {/* LOR Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-12 items-center mt-12 sm:mt-16 md:mt-20">
          {/* Left Side - Text Content */}
          <div ref={lorTextRef} className={`scroll-fade-in lg:col-span-2 ${lorTextVisible ? 'animate' : ''}`}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground leading-tight tracking-tight font-inter mb-4">
              Stay on top of deadlines and LORs.
            </h3>
            <Button 
              onClick={() => handleTryNowClick('lor')} 
              className="mt-4 sm:mt-6 text-sm sm:text-base font-semibold text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#D07D00' }}
            >
              Try Diya
            </Button>
          </div>

          {/* Right Side - Video */}
          <div ref={lorContainerRef} className={`flex justify-center lg:justify-end scroll-slide-right lg:col-span-3 ${lorVideoVisible ? 'animate' : ''}`}>
            <div className="w-full max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
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

