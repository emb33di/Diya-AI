import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, MessageCircle, Clock, Users, BookOpen, Target, Heart, Lightbulb, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import "@/styles/landing.css";
const AboutDiya = () => {
  return <div className="landing-page min-h-screen bg-black">
    <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-7xl font-display font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Meet Diya
          </h1>
          
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Your AI College Counselor designed to guide students through their college journey
          </p>
          
          <p className="text-lg text-foreground/80 mb-8 max-w-3xl mx-auto">
            24/7 personalized guidance that learns, adapts, and grows with each student
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Badge variant="secondary" className="px-4 py-2">
              <Brain className="w-4 h-4 mr-2" />
              AI-Powered
            </Badge>
            <Badge variant="secondary" className="px-4 py-2">
              <Clock className="w-4 h-4 mr-2" />
              24/7 Available
            </Badge>
            
            <Badge variant="secondary" className="px-4 py-2">
              <Target className="w-4 h-4 mr-2" />
              Personalized
            </Badge>
          </div>

          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-white">
              Start Your Journey with Diya
            </Button>
          </Link>
        </div>

        {/* What Makes Diya Special */}
        <section className="mb-16">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            What Makes Diya Different
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Natural Conversations</h3>
                <p className="text-muted-foreground">
                  Diya communicates like a real counselor, understanding context and building meaningful relationships with students.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Personalized Guidance</h3>
                <p className="text-muted-foreground">
                  Every recommendation is tailored to the student's unique profile, interests, and college aspirations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Privacy & Trust</h3>
                <p className="text-muted-foreground">
                  Your conversations with Diya are secure and confidential, creating a safe space for honest discussion.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How Diya is Trained */}
        <section className="mb-16">
          <div className="bg-secondary/20 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-display font-bold text-center mb-8">
              How Diya is Trained
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">College Admissions Expertise</h3>
                      <p className="text-muted-foreground">
                        Trained on thousands of successful college applications, admission requirements, and counseling best practices.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Real Counselor Insights</h3>
                      <p className="text-muted-foreground">
                        Built with input from experienced college counselors to understand student needs and concerns.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Continuous Learning</h3>
                      <p className="text-muted-foreground">
                        Diya learns from each interaction, staying updated with the latest college trends and requirements.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Trained to Help With:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>College selection and fit assessment</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Application strategy and timeline</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Essay brainstorming and guidance</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Extracurricular planning</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Financial aid and scholarship guidance</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Academic planning and course selection</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-primary rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-3xl font-display font-bold mb-4">
            Ready to Start Your College Journey?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who have found their perfect college match with Diya's guidance.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              Get Started For Free
            </Button>
          </Link>
        </section>
      </div>
    </div>
  </div>;
};
export default AboutDiya;