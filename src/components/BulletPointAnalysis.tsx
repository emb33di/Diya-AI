import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Star, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { ResumeFeedbackData } from '@/types/resume';

interface BulletPointAnalysisProps {
  feedback: ResumeFeedbackData;
}

interface BulletPointItem {
  bullet: string;
  score: number;
  suggestion: string;
}

const BulletPointAnalysis: React.FC<BulletPointAnalysisProps> = ({ feedback }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 7) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 5) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Fair';
    if (score >= 3) return 'Poor';
    return 'Very Poor';
  };

  const renderBulletPointSection = (title: string, sectionKey: keyof typeof feedback.bullet_point_scores, icon: React.ReactNode) => {
    const bullets = feedback.bullet_point_scores[sectionKey] as BulletPointItem[];
    if (!bullets || bullets.length === 0) return null;

    const averageScore = bullets.reduce((sum, bullet) => sum + bullet.score, 0) / bullets.length;
    const needsImprovement = bullets.filter(bullet => bullet.score < 7).length;
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <Card key={sectionKey} className="mb-4">
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {icon}
                  <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className={getScoreColor(Math.round(averageScore))}>
                        <Star className="h-3 w-3 mr-1" />
                        Avg: {averageScore.toFixed(1)}/10
                      </Badge>
                      <Badge variant="secondary">
                        {bullets.length} bullet{bullets.length !== 1 ? 's' : ''}
                      </Badge>
                      {needsImprovement > 0 && (
                        <Badge variant="destructive">
                          {needsImprovement} need{needsImprovement !== 1 ? '' : 's'} improvement
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={averageScore * 10} className="w-24 h-2" />
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {bullets.map((bullet, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        "{bullet.bullet}"
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge className={getScoreColor(bullet.score)}>
                          {getScoreIcon(bullet.score)}
                          <span className="ml-1">{bullet.score}/10 - {getScoreLabel(bullet.score)}</span>
                        </Badge>
                        {bullet.score < 7 && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Needs Improvement
                          </Badge>
                        )}
                        {bullet.score >= 7 && (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Good to Go
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {bullet.score < 7 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-orange-800 mb-1">AI Suggestion:</p>
                          <p className="text-sm text-orange-700">{bullet.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {bullet.score >= 7 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-800 mb-1">Strength:</p>
                          <p className="text-sm text-green-700">{bullet.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Detailed Bullet Point Analysis</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI analysis of individual bullet points with specific improvement suggestions
          </p>
        </CardHeader>
      </Card>

      {renderBulletPointSection(
        "Work Experience",
        "work_experience",
        <TrendingUp className="h-5 w-5 text-blue-500" />
      )}

      {renderBulletPointSection(
        "Projects",
        "projects", 
        <Lightbulb className="h-5 w-5 text-purple-500" />
      )}

      {renderBulletPointSection(
        "Extracurricular Activities",
        "extracurriculars",
        <Star className="h-5 w-5 text-green-500" />
      )}

      {feedback.bullet_point_scores.volunteer_experience && 
        renderBulletPointSection(
          "Volunteer Experience",
          "volunteer_experience",
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        )
      }

      {feedback.bullet_point_scores.awards && 
        renderBulletPointSection(
          "Awards & Recognition",
          "awards",
          <Star className="h-5 w-5 text-yellow-500" />
        )
      }
    </div>
  );
};

export default BulletPointAnalysis;
