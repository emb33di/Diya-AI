import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "@/styles/landing.css";


const Pricing = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-page min-h-screen bg-background">
      <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">
      
      <div className="container mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your college application journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="text-3xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Common App Statement of Purpose</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>School Selection Tool</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Deadline Tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Basic AI Writing Assistance</span>
                </div>
              </div>
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-2 border-primary hover:shadow-lg transition-shadow relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Premium</CardTitle>
              <CardDescription>Complete college application support</CardDescription>
              <div className="text-3xl font-bold">$150<span className="text-lg font-normal text-muted-foreground">/one-time</span></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="font-medium">Everything in Free, plus:</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Up to 10 School Applications</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Unlimited Supplemental Essays</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>24/7 AI Counselor Access</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Personalized Strategy Sessions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Real-time Collaboration</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Priority Support</span>
                </div>
              </div>
              <Button className="w-full mt-6">
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <h3 className="text-xl font-semibold mb-4">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">
            Contact our team for personalized guidance on choosing the right plan
          </p>
          <Button variant="outline">Contact Support</Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Pricing;