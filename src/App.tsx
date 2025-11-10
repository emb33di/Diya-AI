import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "./components/Header";
import ProtectedLayout from "./components/ProtectedLayout";
import FounderGuard from "./components/FounderGuard";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Essays from "./pages/Essays";
import SchoolList from "./pages/SchoolList";
import Deadlines from "./pages/Deadlines";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import AboutDiya from "./pages/AboutDia";
import Counselors from "./pages/Counselors";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Resume from "./pages/Resume";
import EarlyAccessSignup from "./pages/EarlyAccessSignup";
import LOR from "./pages/LOR";
import FounderPortal from "./pages/FounderPortal";
import FounderEssayReview from "./pages/FounderEssayReview";
import FounderFeedbackPage from "./pages/FounderFeedbackPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Contact from "./pages/Contact";
import IvyReadiness from "./pages/IvyReadiness";
import SuccessfulExamples from "./pages/SuccessfulExamples";
import DebugErrors from "./pages/DebugErrors";
import Subscription from "./pages/Subscription";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import PasswordReset from "./pages/PasswordReset";
import PaymentSuccess from "./pages/PaymentSuccess";
import { initAnalytics } from "./lib/ga/init";
import RouteTracker from "./lib/ga/RouteTracker";
import LogRocketRouteTracker from "./lib/logrocket/LogRocketRouteTracker";
import LogRocketUserTracker from "./lib/logrocket/LogRocketUserTracker";


const queryClient = new QueryClient();

const App = () => {
  // Initialize analytics
  initAnalytics();
  
  return (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <RouteTracker />
            <LogRocketRouteTracker />
            <LogRocketUserTracker />
            <Header />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-diya" element={<AboutDiya />} />
            <Route path="/counselors" element={<Counselors />} />
            <Route path="/earlyaccess" element={<EarlyAccessSignup />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/ivyreadiness" element={<IvyReadiness />} />
            <Route path="/successful-examples" element={<SuccessfulExamples />} />
            {import.meta.env.DEV && <Route path="/debug-errors" element={<DebugErrors />} />}

            {/* Protected routes - require authentication */}
            {/* Using layout route pattern: single guard instance persists across all protected routes */}
            <Route element={<ProtectedLayout />}>
              {/* Temporarily disabled routes - keeping code but removing from navigation */}
              {/* <Route path="/dashboard" element={<Dashboard />} /> */}
              {/* <Route path="/onboarding" element={<Onboarding />} /> */}
              {/* <Route path="/deadlines" element={<Deadlines />} /> */}
              <Route path="/essays" element={<Essays />} />
              <Route path="/essays/:essayId/expert-reviews" element={<FounderFeedbackPage />} />
              <Route path="/schools" element={<SchoolList />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/checkout" element={<Payments />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/lor" element={<LOR />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
            </Route>

            {/* Founder Portal Routes */}
            <Route path="/founder-portal" element={<FounderGuard><FounderPortal /></FounderGuard>} />
            <Route path="/founder-portal/:escalationId" element={<FounderGuard><FounderEssayReview /></FounderGuard>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
