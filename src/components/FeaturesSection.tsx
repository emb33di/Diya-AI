import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
const FeaturesSection = () => {
  const navigate = useNavigate();
  const {
    elementRef: headerRef,
    isVisible: headerVisible
  } = useScrollAnimation();
  const {
    elementRef: featuresRef,
    isVisible: featuresVisible
  } = useScrollAnimation();
  const features = [{
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>,
    title: "School List Builder",
    description: "Have a voice call with Diya just like you would with a counselor and she will create your perfect college list."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>,
    title: "Write All Your Essays",
    description: "All your essays in one place and with Diya's AI essay assistant get instant actionable feedback on your essays."
  }, {
    icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>,
    title: "Stay on Top of Your Deadlines",
    description: "Diya helps you stay on top of your deadlines to ensure you don't miss any important dates."
 } ];
  return <section id="features" className="py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Section is now empty - content moved to DemoVideoSection */}
      </div>
    </section>;
};
export default FeaturesSection;