import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AuthenticationGuard from "./components/AuthenticationGuard";
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
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Resume from "./pages/Resume";
import Signup from "./pages/Signup";
import LOR from "./pages/LOR";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
        scrollRestoration="manual"
      >
        <ScrollToTop />
        <Header />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/about-diya" element={<AboutDiya />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />

          {/* Protected routes - require authentication */}
          <Route path="/dashboard" element={<AuthenticationGuard><Dashboard /></AuthenticationGuard>} />
          <Route path="/essays" element={<AuthenticationGuard><Essays /></AuthenticationGuard>} />
          <Route path="/schools" element={<AuthenticationGuard><SchoolList /></AuthenticationGuard>} />
          <Route path="/deadlines" element={<AuthenticationGuard><Deadlines /></AuthenticationGuard>} />
          <Route path="/profile" element={<AuthenticationGuard><Profile /></AuthenticationGuard>} />
          <Route path="/onboarding" element={<AuthenticationGuard><Onboarding /></AuthenticationGuard>} />
          <Route path="/resume" element={<AuthenticationGuard><Resume /></AuthenticationGuard>} />
          <Route path="/lor" element={<AuthenticationGuard><LOR /></AuthenticationGuard>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
