import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lightbulb, MessageSquare, Heart, Target } from 'lucide-react';

export interface TopicItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // e.g. 'text-blue-500'
  bgColor: string; // e.g. 'bg-blue-500/10'
  completed: boolean;
}

export interface TopicsAndTipsProps {
  topics: TopicItem[];
}

const TopicsAndTips: React.FC<TopicsAndTipsProps> = ({ topics }) => {
  return (
    <>
      {/* Conversation Topics */}
      <Card className="lg:col-span-3 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            What We'll Explore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topics.map((topic) => (
              <div
                key={topic.name}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  topic.completed ? 'bg-primary/10' : 'bg-muted/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    topic.completed ? topic.bgColor : 'bg-muted/50'
                  }`}
                >
                  <topic.icon
                    className={`w-4 h-4 ${topic.completed ? topic.color : 'text-muted-foreground'}`}
                  />
                </div>
                <span
                  className={`text-sm flex-1 ${
                    topic.completed ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {topic.name}
                </span>
                {topic.completed && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Conversation Tips */}
      <Card className="lg:col-span-7 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Helpful Tips for Your Conversation with Diya</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[
                {
                  icon: MessageSquare,
                  title: 'Chat Naturally',
                  description:
                    "Talk to Diya just like you would a friend or counselor. She's here to listen and understand you.",
                  color: 'text-blue-500',
                },
                {
                  icon: Heart,
                  title: 'Be Yourself',
                  description:
                    'Share what truly matters to you. Diya wants to know the real you, not what you think sounds good.',
                  color: 'text-red-500',
                },
              ].map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1`}>
                    <tip.icon className={`w-4 h-4 ${tip.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: Target,
                  title: 'Share Stories',
                  description:
                    'Tell Diya about moments that shaped you - your successes, challenges, and dreams for the future.',
                  color: 'text-green-500',
                },
                {
                  icon: CheckCircle,
                  title: 'Ask Anything',
                  description:
                    "Feel free to ask Diya questions about college, your future, or anything that's on your mind.",
                  color: 'text-purple-500',
                },
              ].map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1`}>
                    <tip.icon className={`w-4 h-4 ${tip.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">Remember:</span> Diya is here to support you. This conversation helps us understand who you are to create your personalized college journey. We keep everything you say confidential.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TopicsAndTips;
