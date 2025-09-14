import { Button } from "@/components/ui/button";
import Logo from "@/components/LandingLogo";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const Navigation = () => {
  const navigate = useNavigate();
  const { elementRef: navRef, isVisible: navVisible } = useScrollAnimation({ threshold: 0.5 });
  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  const handleLogoClick = () => {
    navigate('/');
  };
  return <nav ref={navRef} className={`fixed top-0 left-0 right-0 z-50 scroll-fade-in backdrop-blur-lg bg-black/30 border-b border-white/20 ${navVisible ? 'animate' : ''}`}>
      <div className="container mx-auto px-4 sm:px-6 py-0.5">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <button onClick={handleLogoClick} className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200 focus:outline-none rounded-lg p-1">
            <Logo />
          </button>

          {/* Navigation Links - Centered */}
          <div className="hidden md:flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
            <button 
              onClick={() => handleScrollTo('features')} 
              className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
            >
              About Diya
            </button>
            <button 
              onClick={() => handleScrollTo('programs')} 
              className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
            >
              Students
            </button>
            <button 
              onClick={() => handleScrollTo('pricing')} 
              className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
            >
              Pricing
            </button>
            <button 
              onClick={() => handleScrollTo('founder')} 
              className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
            >
              Team
            </button>
            <button 
              onClick={() => handleScrollTo('faq')} 
              className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
            >
              FAQs
            </button>
          </div>

          {/* Get Started Button */}
          <Button onClick={() => navigate('/auth')} className="text-sm sm:text-base rounded-lg sm:rounded-xl font-semibold text-white shadow-lg hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-all duration-200 my-0 mx-2 sm:mx-[40px] px-3 sm:px-[10px] py-2 sm:py-[10px] touch-manipulation">
            Get Started
          </Button>
        </div>
      </div>
    </nav>;
};
export default Navigation;