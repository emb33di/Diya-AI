import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePaywall } from "@/hooks/usePaywall";
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
import { Badge } from "@/components/ui/badge";
import { LogOut, CreditCard, ChevronDown, Settings, Crown } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, onboardingCompleted, signOut } = useAuth();
  const { userTier, isPro } = usePaywall();
  
  // Derive state from useAuth hook instead of maintaining separate state
  const isAuthenticated = !!user;
  const loading = authLoading;
  
  // Get first name from profile
  const userFirstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.first_name || '';

  // Debug logging for auth state
  useEffect(() => {
    console.log('[HEADER] Auth state:', {
      hasUser: Boolean(user),
      userId: user?.id,
      hasProfile: Boolean(profile),
      loading: authLoading,
      isAuthenticated,
      path: location.pathname
    });
  }, [user, profile, authLoading, isAuthenticated, location.pathname]);

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
  const isBlogPage = location.pathname === '/blog' || location.pathname.startsWith('/blog/');
  const isCounselorsPage = location.pathname === '/counselors';
  const isIvyReadinessPage = location.pathname === '/ivyreadiness' || location.pathname.startsWith('/ivyreadiness');
  const isEarlyAccessPage = location.pathname === '/earlyaccess';
  const isPasswordResetPage = location.pathname === '/password-reset';
  const isLoggedIn = !isLandingPage && !isPublicInfoPage && !isBlogPage && !isIvyReadinessPage && location.pathname !== '/auth';
  const showUnauthenticatedNav = isLandingPage || isBlogPage || isCounselorsPage;

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
  
  // Don't render header on early access page or password reset page
  if (isEarlyAccessPage || isPasswordResetPage) {
    return null;
  }
  
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-transparent">
      <div className={`container mx-auto flex h-20 items-center px-6 relative ${
        isAuthenticated ? 'justify-between md:justify-between' : 'justify-between'
      }`}>
        {/* Logo */}
        <Link to={loading ? "/" : (isAuthenticated ? "/dashboard" : "/")} className="flex items-center space-x-2 flex-shrink-0">
          <img 
            src={location.pathname === "/" || location.pathname === "/auth" || location.pathname === "/counselors" ? "/DiyaLogo White.svg" : "/DiyaLogo.svg"} 
            alt="Diya Logo" 
            className="h-24 w-24" 
          />
        </Link>
        
        {/* Authenticated Navigation */}
        {isAuthenticated && (
          <>
            {/* Desktop Navigation */}
            <nav className={`hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8 px-2 py-1.5 lg:px-3 xl:px-4 lg:py-2 rounded-full border transition-all duration-200 flex-shrink min-w-0 ${
              location.pathname === '/schools' || location.pathname === '/resume' || 
              location.pathname === '/essays' || location.pathname === '/lor'
                ? 'border-primary/50' 
                : 'border-gray-300/30'
            }`}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      to="/schools" 
                      className={`text-xs lg:text-sm font-medium transition-colors px-2 py-0.5 lg:px-3 lg:py-1 ${
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
                      className={`text-xs lg:text-sm font-medium transition-colors px-2 py-0.5 lg:px-3 lg:py-1 ${
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
                      className={`text-xs lg:text-sm font-medium transition-colors px-2 py-0.5 lg:px-3 lg:py-1 ${
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
                      className={`text-xs lg:text-sm font-medium transition-colors px-2 py-0.5 lg:px-3 lg:py-1 ${
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`text-xs lg:text-sm font-medium transition-colors px-2 py-0.5 lg:px-3 lg:py-1 flex items-center gap-1 ${
                          isActive('/blog')
                            ? 'text-black border border-primary/50 bg-primary/10 rounded-full' 
                            : 'text-black hover:text-black'
                        }`}>
                          Resources
                          <ChevronDown className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link to="/blog" className="flex items-center">
                            Blog
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </nav>
            
            {/* Mobile Navigation - Centered */}
            <div className="md:hidden absolute left-1/2 transform -translate-x-1/2">
              <MobileNavigation />
            </div>
          </>
        )}
        
        {/* Unauthenticated Navigation - Centered */}
        {!isAuthenticated && showUnauthenticatedNav && (
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10 flex items-center gap-1">
                  {isCounselorsPage ? 'For Counselors' : 'For Students'}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-[hsl(220_25%_8%)] border-[hsl(220_25%_12%)]">
                <DropdownMenuItem
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
                  className="text-white focus:bg-[hsl(220_20%_15%)] focus:text-white"
                >
                  For Students
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/counselors" className="flex items-center text-white focus:bg-[hsl(220_20%_15%)] focus:text-white">
                    For Counselors
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button 
              onClick={() => {
                if (location.pathname === '/') {
                  const element = document.getElementById('plans');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate('/#plans');
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
            <button 
              onClick={() => navigate('/blog')} 
              className="h-12 px-4 text-base font-medium text-white hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
            >
              Blog
            </button>
          </div>
        )}
        
        {/* Auth Buttons */}
        <div className="flex items-center space-x-6 flex-shrink-0">
          {!isAuthenticated ? (
            <>
              <Link 
                to="/auth?mode=signin" 
                className={`hidden md:block text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  isBlogPage || isIvyReadinessPage
                    ? 'text-black hover:text-gray-700' 
                    : 'text-white hover:text-white/80'
                }`}
              >
                Sign In
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-all duration-200 hover:bg-primary text-white">
                  Get Started
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
                  <Link to="/profile" className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      {getInitialsAvatar(userFirstName || 'User')}
                      <span>Profile</span>
                    </div>
                    <Badge 
                      variant={isPro ? "default" : "secondary"}
                      className={isPro ? "bg-primary" : ""}
                    >
                      {isPro && <Crown className="h-3 w-3 mr-1" />}
                      {userTier}
                    </Badge>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscription" className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Subscription</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => {
                    await signOut();
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