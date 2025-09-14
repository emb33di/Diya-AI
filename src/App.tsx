import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
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
import ConversationHistory from "./pages/ConversationHistory";
import Resume from "./pages/Resume";
import Signup from "./pages/Signup";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/essays" element={<Essays />} />
          <Route path="/schools" element={<SchoolList />} />
          <Route path="/deadlines" element={<Deadlines />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/about-diya" element={<AboutDiya />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/conversation-history" element={<ConversationHistory />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/signup" element={<Signup />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
