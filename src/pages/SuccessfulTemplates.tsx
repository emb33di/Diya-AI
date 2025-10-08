import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { FileText, ExternalLink, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TemplateDocument {
  id: string;
  title: string;
  description: string;
  category: 'essay' | 'resume' | 'lor';
  programType: 'MBA' | 'Masters' | 'Undergraduate' | 'Law' | 'PhD';
  type: string;
  school?: string;
  rating: number;
  url: string;
  thumbnail?: string;
}

const SuccessfulTemplates = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'essay' | 'resume' | 'lor'>('all');
  const [templates, setTemplates] = useState<TemplateDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to load templates from the templates folder
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templateFiles: TemplateDocument[] = [];

      // Define the template categories and their corresponding folders
      const categories = [
        { key: 'essay', folder: 'essays', label: 'Essay' },
        { key: 'resume', folder: 'resumes', label: 'Resume' },
        { key: 'lor', folder: 'LORs', label: 'LOR' }
      ];

      // For now, we'll use a simple approach since we can't directly read the file system
      // In a real implementation, this would be handled by a backend API
      // For now, we'll check if the UChicago essay exists and add it
      const uChicagoEssay: TemplateDocument = {
        id: 'uchicago-essay',
        title: 'UChicago Essay Supplement',
        description: 'A successful essay supplement for University of Chicago applications',
        category: 'essay',
        programType: 'Undergraduate',
        type: 'Essay Supplement',
        school: 'University of Chicago',
        rating: 4.8,
        url: '/templates/essays/Undergraduate/UChicago%20Essay%20Supplement.pdf'
      };

      templateFiles.push(uChicagoEssay);
      setTemplates(templateFiles);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const categories = [
    { key: 'all', label: 'All Templates', count: templates.length },
    { key: 'essay', label: 'Successful Essays', count: templates.filter(t => t.category === 'essay').length },
    { key: 'resume', label: 'Successful Resumes', count: templates.filter(t => t.category === 'resume').length },
    { key: 'lor', label: 'LOR Templates', count: templates.filter(t => t.category === 'lor').length },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'essay':
        return <FileText className="h-5 w-5" />;
      case 'resume':
        return <Award className="h-5 w-5" />;
      case 'lor':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essay':
        return 'bg-blue-100 text-blue-800';
      case 'resume':
        return 'bg-green-100 text-green-800';
      case 'lor':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgramTypeColor = (programType: string) => {
    switch (programType) {
      case 'MBA':
        return 'bg-orange-100 text-orange-800';
      case 'Masters':
        return 'bg-indigo-100 text-indigo-800';
      case 'Undergraduate':
        return 'bg-teal-100 text-teal-800';
      case 'Law':
        return 'bg-red-100 text-red-800';
      case 'PhD':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
      <Helmet>
        <title>Successful Templates | Essay, Resume & LOR Examples | Diya AI</title>
        <meta name="description" content="Access proven templates from successful applicants to top universities. Download essay examples, resume templates, and letter of recommendation samples." />
        <meta name="keywords" content="essay templates, resume templates, LOR templates, college application examples, successful essays, MBA essays, personal statements" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://diya-ai.com/successful-templates" />
        <meta property="og:title" content="Successful Templates | Essay, Resume & LOR Examples | Diya AI" />
        <meta property="og:description" content="Access proven templates from successful applicants to top universities. Download essay examples, resume templates, and letter of recommendation samples." />
        <meta property="og:image" content="https://diya-ai.com/og-templates-image.jpg" />
        <meta property="og:site_name" content="Diya AI" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://diya-ai.com/successful-templates" />
        <meta property="twitter:title" content="Successful Templates | Essay, Resume & LOR Examples | Diya AI" />
        <meta property="twitter:description" content="Access proven templates from successful applicants to top universities. Download essay examples, resume templates, and letter of recommendation samples." />
        <meta property="twitter:image" content="https://diya-ai.com/og-templates-image.jpg" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://diya-ai.com/successful-templates" />
      </Helmet>
      
      {/* Header Section */}
      <div className="border-b" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Successful Templates
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
              Access proven templates from successful applicants to top universities and companies
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm sm:text-base">Loading templates...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Category Filter */}
              <div className="mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map(category => (
                <Button
                  key={category.key}
                  variant={selectedCategory === category.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.key as any)}
                  className="flex items-center gap-2"
                >
                  {getCategoryIcon(category.key)}
                  {category.label}
                  <Badge variant="secondary" className="ml-1">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="space-y-8">
            {selectedCategory === 'all' ? (
              // Show templates grouped by category with headings
              <>
                {/* Successful Essays Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Successful Essays</h2>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {templates.filter(t => t.category === 'essay').length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.filter(template => template.category === 'essay').map(template => (
                      <Card key={template.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getCategoryIcon(template.category)}
                              <Badge className={getCategoryColor(template.category)}>
                                {template.type}
                              </Badge>
                              <Badge className={getProgramTypeColor(template.programType)}>
                                {template.programType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Award className="h-4 w-4" />
                              {template.rating}
                            </div>
                          </div>
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                            {template.title}
                          </CardTitle>
                          {template.school && (
                            <p className="text-sm text-gray-600 font-medium">
                              {template.school}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm mb-4 line-clamp-2">
                            {template.description}
                          </CardDescription>
                          
                          <div className="space-y-3">
                            <div className="flex gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
                                onClick={() => window.open(template.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open Template
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Successful Resumes Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Award className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Successful Resumes</h2>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {templates.filter(t => t.category === 'resume').length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.filter(template => template.category === 'resume').map(template => (
                      <Card key={template.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getCategoryIcon(template.category)}
                              <Badge className={getCategoryColor(template.category)}>
                                {template.type}
                              </Badge>
                              <Badge className={getProgramTypeColor(template.programType)}>
                                {template.programType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Award className="h-4 w-4" />
                              {template.rating}
                            </div>
                          </div>
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                            {template.title}
                          </CardTitle>
                          {template.school && (
                            <p className="text-sm text-gray-600 font-medium">
                              {template.school}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm mb-4 line-clamp-2">
                            {template.description}
                          </CardDescription>
                          
                          <div className="space-y-3">
                            <div className="flex gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
                                onClick={() => window.open(template.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open Template
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* LOR Templates Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <FileText className="h-6 w-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-gray-900">LOR Templates</h2>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {templates.filter(t => t.category === 'lor').length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.filter(template => template.category === 'lor').map(template => (
                      <Card key={template.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getCategoryIcon(template.category)}
                              <Badge className={getCategoryColor(template.category)}>
                                {template.type}
                              </Badge>
                              <Badge className={getProgramTypeColor(template.programType)}>
                                {template.programType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Award className="h-4 w-4" />
                              {template.rating}
                            </div>
                          </div>
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                            {template.title}
                          </CardTitle>
                          {template.school && (
                            <p className="text-sm text-gray-600 font-medium">
                              {template.school}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm mb-4 line-clamp-2">
                            {template.description}
                          </CardDescription>
                          
                          <div className="space-y-3">
                            <div className="flex gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
                                onClick={() => window.open(template.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open Template
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Show filtered templates without headings
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTemplates.map(template => (
                  <Card key={template.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(template.category)}
                          <Badge className={getCategoryColor(template.category)}>
                            {template.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Award className="h-4 w-4" />
                          {template.rating}
                        </div>
                      </div>
                      <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                        {template.title}
                      </CardTitle>
                      {template.school && (
                        <p className="text-sm text-gray-600 font-medium">
                          {template.school}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm mb-4 line-clamp-2">
                        {template.description}
                      </CardDescription>
                      
                      <div className="space-y-3">
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
                            onClick={() => window.open(template.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open Template
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 sm:py-16 px-4">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">No templates found</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                Try selecting a different category to find what you're looking for.
              </p>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-12 sm:py-16" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">Need Personalized Help?</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600 px-4">
            Get custom templates and expert guidance tailored to your specific goals
          </p>
          <Button size="lg" className="hover:shadow-lg transition-all w-full sm:w-auto" style={{ backgroundColor: '#D07D00', color: 'white' }}>
            Get Personalized Templates
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuccessfulTemplates;
