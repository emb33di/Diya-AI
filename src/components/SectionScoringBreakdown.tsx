import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  User, 
  FileText, 
  GraduationCap, 
  Briefcase, 
  Code, 
  Award, 
  Users, 
  Heart, 
  BookOpen, 
  Globe,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { ResumeFeedbackData } from '@/types/resume';

interface SectionScoringBreakdownProps {
  feedback: ResumeFeedbackData;
}

const SectionScoringBreakdown: React.FC<SectionScoringBreakdownProps> = ({ feedback }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 7) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 5) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Fair';
    if (score >= 3) return 'Poor';
    return 'Very Poor';
  };

  const sectionConfig = [
    { key: 'personal_info', label: 'Personal Information', icon: User, color: 'blue' },
    { key: 'summary', label: 'Professional Summary', icon: FileText, color: 'purple' },
    { key: 'education', label: 'Education', icon: GraduationCap, color: 'green' },
    { key: 'work_experience', label: 'Work Experience', icon: Briefcase, color: 'blue' },
    { key: 'projects', label: 'Projects', icon: Code, color: 'purple' },
    { key: 'skills', label: 'Skills', icon: Award, color: 'yellow' },
    { key: 'extracurriculars', label: 'Extracurriculars', icon: Users, color: 'green' },
    { key: 'volunteer_experience', label: 'Volunteer Experience', icon: Heart, color: 'red' },
    { key: 'awards', label: 'Awards', icon: Star, color: 'yellow' },
    { key: 'publications', label: 'Publications', icon: BookOpen, color: 'blue' },
    { key: 'languages', label: 'Languages', icon: Globe, color: 'purple' },
    { key: 'additional_info', label: 'Additional Info', icon: Plus, color: 'gray' }
  ];

  const sections = sectionConfig.map(config => ({
    ...config,
    score: feedback.section_scores[config.key as keyof typeof feedback.section_scores]
  }));

  const excellentSections = sections.filter(s => s.score >= 9);
  const goodSections = sections.filter(s => s.score >= 7 && s.score < 9);
  const fairSections = sections.filter(s => s.score >= 5 && s.score < 7);
  const poorSections = sections.filter(s => s.score < 5);

  const averageScore = sections.reduce((sum, section) => sum + section.score, 0) / sections.length;

  const renderSectionCard = (section: typeof sections[0]) => {
    const IconComponent = section.icon;
    
    return (
      <Card key={section.key} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-${section.color}-100`}>
                <IconComponent className={`h-5 w-5 text-${section.color}-600`} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{section.label}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  {getScoreIcon(section.score)}
                  <span className="text-sm text-gray-600">{getScoreLabel(section.score)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{section.score}/10</div>
              <Progress value={section.score * 10} className="w-20 h-2 mt-1" />
            </div>
          </div>
          
          <Badge className={getScoreColor(section.score)}>
            {section.score >= 7 ? 'Good to Go' : 'Needs Improvement'}
          </Badge>
        </CardContent>
      </Card>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{excellentSections.length}</div>
            <div className="text-sm text-green-600">Excellent Sections</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{goodSections.length}</div>
            <div className="text-sm text-blue-600">Good Sections</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{fairSections.length}</div>
            <div className="text-sm text-yellow-600">Fair Sections</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{poorSections.length}</div>
            <div className="text-sm text-red-600">Poor Sections</div>
          </CardContent>
        </Card>
      </div>

      {/* Average Score */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-bold text-primary mb-2">{averageScore.toFixed(1)}/10</div>
          <div className="text-lg text-muted-foreground mb-4">Average Section Score</div>
          <Progress value={averageScore * 10} className="h-3" />
        </CardContent>
      </Card>

      {/* All Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(renderSectionCard)}
      </div>
    </div>
  );

  const renderByCategory = (categorySections: typeof sections, title: string, color: string) => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="outline" className={`text-${color}-600 border-${color}-300`}>
          {categorySections.length} section{categorySections.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categorySections.map(renderSectionCard)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Section-by-Section Analysis</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed scoring breakdown for each resume section
          </p>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="excellent">Excellent ({excellentSections.length})</TabsTrigger>
          <TabsTrigger value="good">Good ({goodSections.length})</TabsTrigger>
          <TabsTrigger value="needs-work">Needs Work ({fairSections.length + poorSections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="excellent">
          {excellentSections.length > 0 ? (
            renderByCategory(excellentSections, "Excellent Sections", "green")
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No sections scored excellent yet. Keep improving!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="good">
          {goodSections.length > 0 ? (
            renderByCategory(goodSections, "Good Sections", "blue")
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <p>No sections scored good yet. Focus on the areas that need improvement!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="needs-work">
          <div className="space-y-6">
            {fairSections.length > 0 && renderByCategory(fairSections, "Fair Sections (Minor Improvements Needed)", "yellow")}
            {poorSections.length > 0 && renderByCategory(poorSections, "Poor Sections (Major Improvements Needed)", "red")}
            {fairSections.length === 0 && poorSections.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All sections are performing well! Great job!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SectionScoringBreakdown;
