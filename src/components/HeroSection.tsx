import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const HeroSection = () => {
  const navigate = useNavigate();
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { elementRef: videoRef, isVisible: videoVisible } = useScrollAnimation();

  return <section className="min-h-screen flex items-center px-4 sm:px-6 pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center min-h-[70vh]">
          {/* Left Side - Text Content */}
          <div>
            {/* Meet Diya AI Header */}
            <div ref={headerRef} className={`scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
              <span className="gold-shimmer text-lg sm:text-xl md:text-2xl font-semibold tracking-wider uppercase">Meet Diya AI</span>
            </div>

            {/* Hero Headline */}
            <div ref={contentRef} className={`space-y-2 mb-6 sm:mb-8 scroll-slide-left ${contentVisible ? 'animate' : ''}`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-tight tracking-tight font-inter">
                India's AI College Counselor 
              </h1>
            </div>

            {/* Credentials */}
            <div className={`mt-8 sm:mt-12 scroll-fade-in scroll-stagger-1 ${contentVisible ? 'animate' : ''}`}>
              <p className="text-lg sm:text-xl md:text-2xl gold-shimmer font-medium">
                Built by Indian alumni from Harvard, Dartmouth, and UChicago.
              </p>
            </div>

            {/* Social Media Links */}
            <div className={`mt-8 sm:mt-10 scroll-fade-in scroll-stagger-2 ${contentVisible ? 'animate' : ''}`}>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">Follow us:</span>
                <div className="flex space-x-3">
                  {/* Instagram */}
                  <a 
                    href="https://www.instagram.com/meetdiyaai/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
                    aria-label="Follow us on Instagram"
                  >
                    <svg 
                      className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-300" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>

                  {/* Facebook */}
                  <a 
                    href="https://www.facebook.com/profile.php?id=61579586417145" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
                    aria-label="Follow us on Facebook"
                  >
                    <svg 
                      className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-300" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>

                  {/* LinkedIn */}
                  <a 
                    href="https://www.linkedin.com/company/108495382" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group p-2 rounded-full bg-blue-700 hover:bg-blue-800 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
                    aria-label="Follow us on LinkedIn"
                  >
                    <svg 
                      className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-300" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Right Side - Video */}
          <div ref={videoRef} className={`flex justify-center lg:justify-end scroll-slide-right ${videoVisible ? 'animate' : ''} relative z-40`}>
            <div className="max-w-2xl w-full">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500">
                <div className="aspect-video bg-black">
                  <iframe
                    className="w-full h-full rounded-xl sm:rounded-2xl bg-black"
                    src="https://www.youtube.com/embed/pGkF2Nb4_6A?rel=0&modestbranding=1&showinfo=0"
                    title="Diya AI College Counselor Introduction"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;