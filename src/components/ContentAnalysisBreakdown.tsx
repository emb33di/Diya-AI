import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  Users,
  Lightbulb
} from 'lucide-react';
import { ResumeFeedbackData } from '@/types/resume';

interface ContentAnalysisBreakdownProps {
  feedback: ResumeFeedbackData;
}

const ContentAnalysisBreakdown: React.FC<ContentAnalysisBreakdownProps> = ({ feedback }) => {
  const { content_analysis, format_analysis } = feedback;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <TrendingUp className="h-4 w-4 text-blue-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const contentMetrics = [
    {
      key: 'experience_quality',
      label: 'Experience Quality',
      score: content_analysis.experience_quality,
      icon: Award,
      color: 'blue',
      description: 'How well experiences are presented and described',
      tips: [
        'Use action verbs to start bullet points',
        'Include specific technologies and tools used',
        'Highlight unique responsibilities and challenges',
        'Show progression and growth over time'
      ]
    },
    {
      key: 'skills_demonstration',
      label: 'Skills Demonstration',
      score: content_analysis.skills_demonstration,
      icon: Zap,
      color: 'purple',
      description: 'How effectively skills are showcased and proven',
      tips: [
        'Provide concrete examples of skill usage',
        'Include certifications and relevant coursework',
        'Show skills in context of projects and work',
        'Balance technical and soft skills'
      ]
    },
    {
      key: 'impact_quantification',
      label: 'Impact Quantification',
      score: content_analysis.impact_quantification,
      icon: BarChart3,
      color: 'green',
      description: 'How well achievements and results are quantified',
      tips: [
        'Include specific numbers and percentages',
        'Show before/after comparisons',
        'Quantify time saved, money earned, or efficiency gained',
        'Use metrics that matter to your target audience'
      ]
    }
  ];

  const formatMetrics = [
    {
      key: 'structure_score',
      label: 'Structure & Organization',
      score: format_analysis.structure_score,
      icon: Target,
      color: 'blue',
      description: 'How well the resume is organized and structured',
      tips: [
        'Use consistent formatting throughout',
        'Organize sections logically',
        'Maintain proper spacing and alignment',
        'Use clear section headers'
      ]
    },
    {
      key: 'readability_score',
      label: 'Readability',
      score: format_analysis.readability_score,
      icon: Users,
      color: 'purple',
      description: 'How easy the resume is to read and understand',
      tips: [
        'Use bullet points for easy scanning',
        'Keep sentences concise and clear',
        'Use consistent verb tenses',
        'Avoid jargon and acronyms'
      ]
    },
    {
      key: 'visual_appeal_score',
      label: 'Visual Appeal',
      score: format_analysis.visual_appeal_score,
      icon: Star,
      color: 'green',
      description: 'How visually appealing and professional the resume looks',
      tips: [
        'Use a clean, professional font',
        'Maintain consistent styling',
        'Use white space effectively',
        'Ensure good contrast and readability'
      ]
    }
  ];

  const renderMetricCard = (metric: typeof contentMetrics[0]) => {
    const IconComponent = metric.icon;
    
    return (
      <Card key={metric.key} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-${metric.color}-100`}>
                <IconComponent className={`h-5 w-5 text-${metric.color}-600`} />
              </div>
              <div>
                <CardTitle className="text-lg">{metric.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{metric.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{metric.score}/100</div>
              <Progress value={metric.score} className="w-20 h-2 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            {getScoreIcon(metric.score)}
            <Badge className={getScoreColor(metric.score)}>
              {getScoreLabel(metric.score)}
            </Badge>
          </div>
          
          {metric.score < 70 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800 mb-2">Improvement Tips:</p>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {metric.tips.map((tip, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {metric.score >= 70 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">Strength:</p>
                  <p className="text-sm text-green-700">
                    This area is performing well! Keep up the good work.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderOverallContentScore = () => {
    const contentAverage = (content_analysis.experience_quality + 
                           content_analysis.skills_demonstration + 
                           content_analysis.impact_quantification) / 3;
    
    const formatAverage = (format_analysis.structure_score + 
                           format_analysis.readability_score + 
                           format_analysis.visual_appeal_score) / 3;
    
    const overallAverage = (contentAverage + formatAverage) / 2;

    return (
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Overall Content & Format Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{contentAverage.toFixed(1)}/100</div>
              <div className="text-sm text-muted-foreground mb-3">Content Quality</div>
              <Progress value={contentAverage} className="h-3" />
              <div className="text-xs text-muted-foreground mt-2">
                Experience + Skills + Impact
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{formatAverage.toFixed(1)}/100</div>
              <div className="text-sm text-muted-foreground mb-3">Format Quality</div>
              <Progress value={formatAverage} className="h-3" />
              <div className="text-xs text-muted-foreground mt-2">
                Structure + Readability + Visual Appeal
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{overallAverage.toFixed(1)}/100</div>
              <div className="text-sm text-muted-foreground mb-3">Overall Quality</div>
              <Progress value={overallAverage} className="h-3" />
              <Badge className={getScoreColor(overallAverage)}>
                {getScoreLabel(overallAverage)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span>Content & Format Analysis</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of content quality and formatting effectiveness
          </p>
        </CardHeader>
      </Card>

      {renderOverallContentScore()}

      {/* Content Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Award className="h-5 w-5 text-blue-600" />
          <span>Content Quality Analysis</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contentMetrics.map(renderMetricCard)}
        </div>
      </div>

      {/* Format Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Star className="h-5 w-5 text-purple-600" />
          <span>Format Quality Analysis</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formatMetrics.map(renderMetricCard)}
        </div>
      </div>
    </div>
  );
};

export default ContentAnalysisBreakdown;
