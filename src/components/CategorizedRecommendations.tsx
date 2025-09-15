import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  FileText, 
  Award, 
  TrendingUp,
  CheckCircle,
  Clock,
  Star,
  Target,
  Zap,
  Users,
  BookOpen,
  Heart
} from 'lucide-react';
import { ResumeFeedbackData } from '@/types/resume';

interface CategorizedRecommendationsProps {
  feedback: ResumeFeedbackData;
}

const CategorizedRecommendations: React.FC<CategorizedRecommendationsProps> = ({ feedback }) => {
  const [implementedItems, setImplementedItems] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState('content');

  const toggleImplemented = (itemId: string) => {
    const newImplemented = new Set(implementedItems);
    if (newImplemented.has(itemId)) {
      newImplemented.delete(itemId);
    } else {
      newImplemented.add(itemId);
    }
    setImplementedItems(newImplemented);
  };

  const recommendationCategories = [
    {
      key: 'content',
      label: 'Content Improvements',
      icon: BookOpen,
      color: 'blue',
      items: feedback.recommendations.content_improvements,
      description: 'Enhance the substance and quality of your resume content'
    },
    {
      key: 'format',
      label: 'Format Improvements',
      icon: FileText,
      color: 'purple',
      items: feedback.recommendations.format_improvements,
      description: 'Improve the structure, layout, and visual presentation'
    },
    {
      key: 'skills',
      label: 'Skill Additions',
      icon: Award,
      color: 'green',
      items: feedback.recommendations.skill_additions,
      description: 'Add relevant skills that strengthen your profile'
    },
    {
      key: 'experience',
      label: 'Experience Enhancements',
      icon: TrendingUp,
      color: 'orange',
      items: feedback.recommendations.experience_enhancements,
      description: 'Enhance how you present your experiences and achievements'
    }
  ];

  const renderRecommendationItem = (item: string, index: number, categoryKey: string) => {
    const itemId = `${categoryKey}-${index}`;
    const isImplemented = implementedItems.has(itemId);
    
    return (
      <div key={itemId} className={`border rounded-lg p-4 transition-all ${
        isImplemented ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-3">
              <div className={`p-1 rounded-full ${
                isImplemented ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {isImplemented ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${
                  isImplemented ? 'text-green-800 line-through' : 'text-gray-700'
                }`}>
                  {item}
                </p>
                {isImplemented && (
                  <Badge variant="outline" className="mt-2 bg-green-100 text-green-800 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Implemented
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleImplemented(itemId)}
            className={`ml-3 ${
              isImplemented 
                ? 'text-green-600 hover:text-green-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {isImplemented ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Undo
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1" />
                Mark Done
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderCategory = (category: typeof recommendationCategories[0]) => {
    const IconComponent = category.icon;
    const implementedCount = category.items.filter((_, index) => 
      implementedItems.has(`${category.key}-${index}`)
    ).length;
    
    return (
      <TabsContent key={category.key} value={category.key}>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                    <IconComponent className={`h-5 w-5 text-${category.color}-600`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {implementedCount}/{category.items.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`bg-${category.color}-500 h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${(implementedCount / category.items.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {category.items.map((item, index) => 
              renderRecommendationItem(item, index, category.key)
            )}
          </div>

          {category.items.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No specific recommendations for this category!</p>
                <p className="text-sm mt-2">This area is already performing well.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    );
  };

  const renderOverview = () => {
    const totalItems = recommendationCategories.reduce((sum, cat) => sum + cat.items.length, 0);
    const totalImplemented = recommendationCategories.reduce((sum, cat) => 
      sum + cat.items.filter((_, index) => implementedItems.has(`${cat.key}-${index}`)).length, 0
    );
    
    const completionPercentage = totalItems > 0 ? (totalImplemented / totalItems) * 100 : 0;

    return (
      <TabsContent value="overview">
        <div className="space-y-6">
          {/* Progress Overview */}
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Recommendations Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{totalImplemented}</div>
                  <div className="text-sm text-muted-foreground mb-3">Completed</div>
                  <div className="text-xs text-muted-foreground">out of {totalItems} total</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{totalItems - totalImplemented}</div>
                  <div className="text-sm text-muted-foreground mb-3">Remaining</div>
                  <div className="text-xs text-muted-foreground">recommendations</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{completionPercentage.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground mb-3">Complete</div>
                  <Progress value={completionPercentage} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendationCategories.map((category) => {
              const IconComponent = category.icon;
              const implementedCount = category.items.filter((_, index) => 
                implementedItems.has(`${category.key}-${index}`)
              ).length;
              const completionRate = category.items.length > 0 ? (implementedCount / category.items.length) * 100 : 100;
              
              return (
                <Card key={category.key} className="hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => setSelectedTab(category.key)}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                        <IconComponent className={`h-5 w-5 text-${category.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{category.label}</h3>
                        <p className="text-xs text-muted-foreground">{category.items.length} items</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{implementedCount}/{category.items.length}</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </TabsContent>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>Categorized Recommendations</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Organized improvement suggestions with progress tracking
          </p>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content ({feedback.recommendations.content_improvements.length})</TabsTrigger>
          <TabsTrigger value="format">Format ({feedback.recommendations.format_improvements.length})</TabsTrigger>
          <TabsTrigger value="skills">Skills ({feedback.recommendations.skill_additions.length})</TabsTrigger>
          <TabsTrigger value="experience">Experience ({feedback.recommendations.experience_enhancements.length})</TabsTrigger>
        </TabsList>

        {renderOverview()}
        {recommendationCategories.map(renderCategory)}
      </Tabs>
    </div>
  );
};

export default CategorizedRecommendations;
