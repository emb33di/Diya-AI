import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import "@/styles/landing.css";


const Pricing = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-page min-h-screen bg-black">
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

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Manage your entire application</CardDescription>
              <div className="text-3xl font-bold">₹0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Voice onboarding call with Diya</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Deadline tracking and reminders</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>All your essays, in one place</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Resume management</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Limited access to LOR templates, successful essays, and sample resumes</span>
                </div>
              </div>
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={() => navigate('/auth')}
              >
                Get Started For Free
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-primary hover:shadow-lg transition-shadow relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription>AI-powered counseling</CardDescription>
              <div className="text-3xl font-bold">₹10,000<span className="text-lg font-normal text-muted-foreground">/one-time</span></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="font-medium">All features in Free, plus:</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Unlimited access to Diya essay feedback and scoring</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Unlimited access to Diya resume enhancements</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Full access to templates and successful essays</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Access to weekly webinars and college guidance videos</span>
                </div>
              </div>
              <Button className="w-full mt-6">
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>

          {/* Expert Plan */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Expert</CardTitle>
              <CardDescription>Application review from the founder</CardDescription>
              <div className="text-3xl font-bold">₹30,000<span className="text-lg font-normal text-muted-foreground">/one-time</span></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="font-medium">All features in Pro, plus:</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Full application review report from our Founder</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Includes 5 College Essays + Common App</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>2 day turnaround on review</span>
                </div>
              </div>
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={() => navigate('/auth')}
              >
                Upgrade to Expert
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
          
          <div className="mt-8 text-xs text-muted-foreground">
            <p>
              By subscribing to any plan, you agree to our{" "}
              <Link to="/terms-of-service" className="text-primary hover:text-primary/80">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="text-primary hover:text-primary/80">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Pricing;