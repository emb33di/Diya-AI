import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, 
  Crown, 
  Heart, 
  Users, 
  Star, 
  TrendingUp,
  Award,
  BookOpen,
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ResumeFeedbackData } from '@/types/resume';

interface AcademicAnalysisVisualizationProps {
  feedback: ResumeFeedbackData;
}

const AcademicAnalysisVisualization: React.FC<AcademicAnalysisVisualizationProps> = ({ feedback }) => {
  const { academic_analysis } = feedback;

  const getDepthColor = (depth: number) => {
    if (depth >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (depth >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (depth >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDepthLabel = (depth: number) => {
    if (depth >= 0.8) return 'Excellent Depth';
    if (depth >= 0.6) return 'Good Depth';
    if (depth >= 0.4) return 'Fair Depth';
    return 'Limited Depth';
  };

  const renderAchievementList = (achievements: string[], title: string, icon: React.ReactNode, color: string) => {
    if (!achievements || achievements.length === 0) return null;

    return (
      <Card className={`border-${color}-200 bg-${color}-50/30`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            {icon}
            <span>{title}</span>
            <Badge variant="secondary" className={`bg-${color}-100 text-${color}-800`}>
              {achievements.length} item{achievements.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-start space-x-2 p-2 bg-white rounded-lg border">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{achievement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCollegeReadinessIndicators = () => {
    const indicators = [
      {
        label: 'Academic Excellence',
        value: academic_analysis.academic_achievements.length,
        max: 5,
        icon: GraduationCap,
        color: 'blue',
        description: 'Academic achievements and honors'
      },
      {
        label: 'Leadership Experience',
        value: academic_analysis.leadership_roles.length,
        max: 5,
        icon: Crown,
        color: 'purple',
        description: 'Leadership roles and responsibilities'
      },
      {
        label: 'Community Service',
        value: academic_analysis.community_service.length,
        max: 5,
        icon: Heart,
        color: 'red',
        description: 'Community service and volunteer work'
      },
      {
        label: 'Extracurricular Depth',
        value: Math.round(academic_analysis.extracurricular_depth * 10),
        max: 10,
        icon: Users,
        color: 'green',
        description: 'Depth of involvement in activities'
      }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <span>College Readiness Indicators</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Key metrics that admissions officers look for
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indicators.map((indicator, index) => {
              const IconComponent = indicator.icon;
              const percentage = (indicator.value / indicator.max) * 100;
              
              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className={`h-5 w-5 text-${indicator.color}-600`} />
                      <span className="font-medium text-gray-900">{indicator.label}</span>
                    </div>
                    <Badge variant="outline" className={`text-${indicator.color}-600 border-${indicator.color}-300`}>
                      {indicator.value}/{indicator.max}
                    </Badge>
                  </div>
                  
                  <Progress value={percentage} className="h-2" />
                  
                  <p className="text-xs text-muted-foreground">{indicator.description}</p>
                  
                  {percentage >= 80 && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Strong
                    </Badge>
                  )}
                  {percentage >= 60 && percentage < 80 && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Good
                    </Badge>
                  )}
                  {percentage < 60 && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Improvement
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOverallAssessment = () => {
    const totalAchievements = academic_analysis.academic_achievements.length + 
                             academic_analysis.leadership_roles.length + 
                             academic_analysis.community_service.length;
    
    const overallScore = Math.min(totalAchievements * 20 + (academic_analysis.extracurricular_depth * 20), 100);
    
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Overall Academic Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{overallScore}/100</div>
              <div className="text-sm text-muted-foreground mb-3">Academic Profile Score</div>
              <Progress value={overallScore} className="h-3" />
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{totalAchievements}</div>
              <div className="text-sm text-muted-foreground mb-3">Total Achievements</div>
              <div className="text-xs text-muted-foreground">
                Academic + Leadership + Service
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {Math.round(academic_analysis.extracurricular_depth * 100)}%
              </div>
              <div className="text-sm text-muted-foreground mb-3">Extracurricular Depth</div>
              <Badge className={getDepthColor(academic_analysis.extracurricular_depth)}>
                {getDepthLabel(academic_analysis.extracurricular_depth)}
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
            <GraduationCap className="h-5 w-5 text-blue-500" />
            <span>Academic Analysis</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive analysis of academic achievements and college readiness
          </p>
        </CardHeader>
      </Card>

      {renderOverallAssessment()}

      {renderCollegeReadinessIndicators()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderAchievementList(
          academic_analysis.academic_achievements,
          "Academic Achievements",
          <BookOpen className="h-5 w-5 text-blue-600" />,
          "blue"
        )}

        {renderAchievementList(
          academic_analysis.leadership_roles,
          "Leadership Roles",
          <Crown className="h-5 w-5 text-purple-600" />,
          "purple"
        )}

        {renderAchievementList(
          academic_analysis.community_service,
          "Community Service",
          <Heart className="h-5 w-5 text-red-600" />,
          "red"
        )}
      </div>

      {/* Extracurricular Depth Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <span>Extracurricular Depth Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Depth of Involvement</span>
              <Badge className={getDepthColor(academic_analysis.extracurricular_depth)}>
                {getDepthLabel(academic_analysis.extracurricular_depth)}
              </Badge>
            </div>
            
            <Progress value={academic_analysis.extracurricular_depth * 100} className="h-3" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">Limited (0-25%)</div>
                <div className="text-xs text-muted-foreground">Basic participation</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">Fair (25-50%)</div>
                <div className="text-xs text-muted-foreground">Regular involvement</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">Good (50-75%)</div>
                <div className="text-xs text-muted-foreground">Active participation</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">Excellent (75-100%)</div>
                <div className="text-xs text-muted-foreground">Deep commitment</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademicAnalysisVisualization;
