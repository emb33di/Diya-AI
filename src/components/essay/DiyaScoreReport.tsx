import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  MessageSquare, 
  Sparkles, 
  CheckCircle,
  ArrowRight,
  Target,
  Zap
} from 'lucide-react';

interface AgentScore {
  score: number;
  maxScore: number;
  agentType: 'big-picture' | 'tone' | 'clarity';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface DiyaScoreReportProps {
  isVisible: boolean;
  scores: {
    bigPicture?: number;
    tone?: number;
    clarity?: number;
  };
  onViewComments: () => void;
  onClose: () => void;
}

const CircularProgress: React.FC<{
  score: number;
  maxScore: number;
  color: string;
  size?: number;
}> = ({ score, maxScore, color, size = 120 }) => {
  const percentage = (score / maxScore) * 100;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${color}`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {score}
          </div>
          <div className="text-xs text-gray-500">
            /{maxScore}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiyaScoreReport: React.FC<DiyaScoreReportProps> = ({
  isVisible,
  scores,
  onViewComments,
  onClose
}) => {
  if (!isVisible) return null;

  const agentScores: AgentScore[] = [
    {
      score: scores.bigPicture || 0,
      maxScore: 100,
      agentType: 'big-picture',
      label: 'Overall Essay',
      description: 'How well you addressed the prompt',
      icon: <Target className="h-6 w-6" />,
      color: scores.bigPicture && scores.bigPicture >= 80 ? 'text-green-500' : 
             scores.bigPicture && scores.bigPicture >= 60 ? 'text-yellow-500' : 'text-red-500'
    },
    {
      score: scores.tone || 0,
      maxScore: 10,
      agentType: 'tone',
      label: 'Voice & Tone',
      description: 'Authenticity and personal voice',
      icon: <Sparkles className="h-6 w-6" />,
      color: scores.tone && scores.tone >= 8 ? 'text-green-500' : 
             scores.tone && scores.tone >= 6 ? 'text-yellow-500' : 'text-red-500'
    },
    {
      score: scores.clarity || 0,
      maxScore: 10,
      agentType: 'clarity',
      label: 'Clarity',
      description: 'Precision and conciseness',
      icon: <Zap className="h-6 w-6" />,
      color: scores.clarity && scores.clarity >= 8 ? 'text-green-500' : 
             scores.clarity && scores.clarity >= 6 ? 'text-yellow-500' : 'text-red-500'
    }
  ];

  const overallScore = scores.bigPicture || 0;
  const overallGrade = overallScore >= 80 ? 'Excellent' : 
                      overallScore >= 60 ? 'Good' : 
                      overallScore >= 40 ? 'Needs Work' : 'Requires Attention';

  const overallColor = overallScore >= 80 ? 'text-green-600' : 
                      overallScore >= 60 ? 'text-yellow-600' : 
                      overallScore >= 40 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl bg-white shadow-2xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full">
              <Star className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-gray-800">
                Diya Score Report
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Your essay analysis is complete
              </p>
            </div>
          </div>
          
          {/* Overall Grade */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Badge 
              variant="secondary" 
              className={`text-lg px-4 py-2 ${overallColor} bg-opacity-20`}
            >
              {overallGrade}
            </Badge>
            <span className="text-2xl font-bold text-gray-800">
              {overallScore}/100
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {/* Score Rings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {agentScores.map((agent) => (
              <div key={agent.agentType} className="text-center">
                <div className="flex justify-center mb-4">
                  <CircularProgress
                    score={agent.score}
                    maxScore={agent.maxScore}
                    color={agent.color}
                    size={140}
                  />
                </div>
                
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className={`p-2 rounded-lg ${agent.color} bg-opacity-20`}>
                    {agent.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {agent.label}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {agent.description}
                </p>
                
                <div className={`text-2xl font-bold ${agent.color}`}>
                  {agent.score}/{agent.maxScore}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-gray-600">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Analysis complete</span>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="px-6"
              >
                Close
              </Button>
              <Button 
                onClick={onViewComments}
                className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Refresh to See Comments
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiyaScoreReport;
