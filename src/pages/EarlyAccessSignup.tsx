import { useNavigate } from "react-router-dom";
import DynamicBackground from "@/components/DynamicBackground";
import LandingNavigation from "@/components/LandingNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import "@/styles/landing.css";

const EarlyAccessSignup = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page min-h-screen bg-black font-instrument-sans relative">
      <DynamicBackground />
      <div className="relative z-10">
        <LandingNavigation />
        
        <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-32">
          <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-border shadow-elegant shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-4 font-inter">
                  Early Access Program
                </h2>
                <p className="text-muted-foreground mb-6 font-nunito text-base leading-relaxed">
                  Thank you for your interest in our early access program! Given our high demand, we have closed early access. Please sign up for the website using the link below!
                </p>
              </div>
              
              <Button 
                onClick={() => navigate('/auth?mode=signup')}
                className="w-full h-12 text-white shadow-lg hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-all duration-200"
                style={{ backgroundColor: '#D07D00' }}
              >
                Sign Up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EarlyAccessSignup;
