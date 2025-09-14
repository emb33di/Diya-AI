import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mic, ArrowRight, GraduationCap, Target, Heart } from 'lucide-react';
import VoiceOrb from './VoiceOrb';

interface OnboardingLockProps {
  pageName: string;
}

const OnboardingLock: React.FC<OnboardingLockProps> = ({ pageName }) => {
  const navigate = useNavigate();

  const features = [
    {
      icon: GraduationCap,
      title: "Personalized School Recommendations",
      description: "Get matched with colleges that fit your unique profile and goals"
    },
    {
      icon: Target,
      title: "Strategic Application Planning",
      description: "Develop a comprehensive strategy for your college applications"
    },
    {
      icon: Heart,
      title: "AI-Powered Guidance",
              description: "Receive personalized advice from our AI counselor, Diya"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-32 h-32 mb-4">
            <VoiceOrb
              isListening={false}
              isSpeaking={false}
              isThinking={false}
              audioLevel={0}
              audioOutputLevel={0}
              className="w-full h-full"
            />
          </div>
          <CardTitle className="text-2xl">Complete Your Onboarding</CardTitle>
          <p className="text-muted-foreground">
            To access {pageName}, you need to complete your initial conversation with Diya, your AI college counselor.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">What You'll Get After Onboarding:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-4 rounded-lg bg-muted/30 border">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-sm mb-2">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Onboarding Process */}
          <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-medium">Chat with Diya</h4>
                <p className="text-sm text-muted-foreground">
                  Share your interests, goals, and experiences naturally
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    <span>Tell Diya about your academic background and interests</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Share your career goals and college preferences</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Discuss your extracurricular activities and achievements</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Get personalized school recommendations based on your profile</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Button 
              onClick={() => navigate('/onboarding')} 
              size="lg" 
              className="w-full sm:w-auto"
            >
              Start Your Onboarding
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This conversation helps us understand you better and provide personalized recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingLock; 