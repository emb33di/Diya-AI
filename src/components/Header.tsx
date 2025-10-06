import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserFirstName, fetchUserProfileData } from "@/utils/userNameUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userFirstName, setUserFirstName] = useState<string>('');
  const { onboardingCompleted, loading: onboardingLoading } = useAuth();
  
  const fetchUserProfile = async (userId: string) => {
    try {
      // Get user data for metadata fallback
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch profile data using centralized utility
      const profile = await fetchUserProfileData(userId);
      
      // Get first name using centralized logic
      const firstName = getUserFirstName(profile, user, '');
      setUserFirstName(firstName);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserFirstName('');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
        
        // Don't await profile fetch to avoid blocking the UI
        if (user) {
          fetchUserProfile(user.id);
        } else {
          setUserFirstName('');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
        setUserFirstName('');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserFirstName('');
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Handle hash scrolling when navigating from other pages
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const elementId = location.hash.substring(1); // Remove the # from hash
      const element = document.getElementById(elementId);
      if (element) {
        // Small delay to ensure the page has loaded and ScrollToTop has run
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      }
    }
  }, [location.pathname, location.hash]);
  
  const isActive = (path: string) => location.pathname === path;
  const isLandingPage = location.pathname === '/';
  const isPublicInfoPage = location.pathname === '/pricing' || location.pathname === '/about';
  const isLoggedIn = !isLandingPage && !isPublicInfoPage && location.pathname !== '/auth';

  // Create a simple name initials circle with blue-to-orange gradient
  const getInitialsAvatar = (firstName: string) => {
    // Get initials from first name
    const initials = firstName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2); // Max 2 characters
    
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center shadow-lg">
        <span className="text-white text-sm font-semibold">
          {initials || 'U'}
        </span>
      </div>
    );
  };
  
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-transparent">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        {/* Logo */}
        <Link to={loading ? "/" : (isAuthenticated ? "/dashboard" : "/")} className="flex items-center space-x-2">
          <img 
            src={location.pathname === "/" || location.pathname === "/auth" ? "/DiyaLogo White.svg" : "/DiyaLogo.svg"} 
            alt="Diya Logo" 
            className="h-24 w-24" 
          />
        </Link>
        
        {/* Authenticated Navigation */}
        {isAuthenticated && (
          <nav className={`hidden md:flex items-center space-x-8 px-4 py-2 rounded-full border transition-all duration-200 ${
            location.pathname === '/onboarding' || location.pathname === '/dashboard' || 
            location.pathname === '/schools' || location.pathname === '/resume' || 
            location.pathname === '/essays' || location.pathname === '/lor' || 
            location.pathname === '/deadlines'
              ? 'border-primary/50' 
              : 'border-gray-300/30'
          }`}>
            {onboardingLoading ? (
              <span className="text-sm font-medium text-gray-400 px-3 py-1">
                Onboarding
              </span>
            ) : onboardingCompleted === true ? (
              <button 
                className="text-sm font-medium transition-colors text-gray-400 cursor-not-allowed px-3 py-1"
                disabled
              >
                Onboarding
              </button>
            ) : (
              <Link 
                to="/onboarding" 
                className={`text-sm font-medium transition-colors px-3 py-1 ${
                  isActive('/onboarding') 
                    ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                    : 'text-black hover:text-black'
                }`}
              >
                Onboarding
              </Link>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/dashboard" 
                    className={`text-sm font-medium transition-colors px-3 py-1 ${
                      isActive('/dashboard') 
                        ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                        : 'text-black hover:text-black'
                    }`}
                  >
                    Dashboard
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/schools" 
                    className={`text-sm font-medium transition-colors px-3 py-1 ${
                      isActive('/schools') 
                        ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                        : 'text-black hover:text-black'
                    }`}
                  >
                    Schools
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/resume" 
                    className={`text-sm font-medium transition-colors px-3 py-1 ${
                      isActive('/resume') 
                        ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                        : 'text-black hover:text-black'
                    }`}
                  >
                    Resume
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/essays" 
                    className={`text-sm font-medium transition-colors px-3 py-1 ${
                      isActive('/essays') 
                        ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                        : 'text-black hover:text-black'
                    }`}
                  >
                    Essays
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/lor" 
                    className={`text-sm font-medium transition-colors px-3 py-1 ${
                      isActive('/lor') 
                        ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                        : 'text-black hover:text-black'
                    }`}
                  >
                    LOR
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link 
                    to="/deadlines" 
                    className={`text-sm font-medium transition-colors px-3 py-1 ${
                      isActive('/deadlines') 
                        ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                        : 'text-black hover:text-black'
                    }`}
                  >
                    Progress
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            <Link 
              to="/blog" 
              className={`text-sm font-medium transition-colors px-3 py-1 ${
                isActive('/blog') 
                  ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                  : 'text-black hover:text-black'
              }`}
            >
              Blog
            </Link>
          </nav>
        )}
        
        {/* Unauthenticated Navigation - Centered */}
        {!isAuthenticated && isLandingPage && (
          <div className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => {
                if (location.pathname === '/') {
                  const element = document.getElementById('features');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/#features');
                }
              }} 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
            >
              About Diya
            </button>
            <button 
              onClick={() => {
                if (location.pathname === '/') {
                  const element = document.getElementById('programs');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/#programs');
                }
              }} 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
            >
              Students
            </button>
            <button 
              onClick={() => {
                if (location.pathname === '/') {
                  const element = document.getElementById('pricing');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/#pricing');
                }
              }} 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
            >
              Pricing
            </button>
            <button 
              onClick={() => {
                if (location.pathname === '/') {
                  const element = document.getElementById('founder');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/#founder');
                }
              }} 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
            >
              Founder
            </button>
            <button 
              onClick={() => {
                if (location.pathname === '/') {
                  const element = document.getElementById('faq');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/#faq');
                }
              }} 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
            >
              FAQs
            </button>
            <Link 
              to="/blog" 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10 flex items-center"
            >
              Blog
            </Link>
          </div>
        )}
        
        {/* Auth Buttons */}
        <div className="flex items-center space-x-6">
          {!isAuthenticated ? (
            <>
              <Link 
                to="/auth?mode=signin" 
                className="text-sm font-medium text-white hover:text-white/80 transition-colors duration-200 cursor-pointer"
              >
                Sign In
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-all duration-200 hover:bg-primary text-white">
                  Get Started For Free
                </Button>
              </Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" className="flex items-center space-x-2">
                  {getInitialsAvatar(userFirstName || 'User')}
                  <span className="text-sm font-medium">
                    {userFirstName || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center space-x-2">
                    {getInitialsAvatar(userFirstName || 'User')}
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    // Redirect to auth page after sign out
                    navigate('/auth', { replace: true });
                  }}
                  className="flex items-center space-x-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;