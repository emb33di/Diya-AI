import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  EyeOff, 
  FileText, 
  GitCompare,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Star,
  Lightbulb,
  TrendingUp,
  Users,
  Award,
  Code,
  Heart,
  BookOpen,
  Globe,
  Plus
} from 'lucide-react';
import { StructuredResumeData } from '@/types/resume';

interface EnhancedResumeComparisonProps {
  originalResume: StructuredResumeData;
  improvedResume: StructuredResumeData | null;
  onViewResume: () => void;
}

const EnhancedResumeComparison: React.FC<EnhancedResumeComparisonProps> = ({
  originalResume,
  improvedResume,
  onViewResume
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'diff' | 'original-only'>('side-by-side');
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personalInfo', 'summary']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const getSectionIcon = (section: string) => {
    const icons: Record<string, React.ReactNode> = {
      personalInfo: <Users className="h-4 w-4" />,
      summary: <FileText className="h-4 w-4" />,
      education: <BookOpen className="h-4 w-4" />,
      workExperience: <Award className="h-4 w-4" />,
      projects: <Code className="h-4 w-4" />,
      skills: <Star className="h-4 w-4" />,
      extracurriculars: <Users className="h-4 w-4" />,
      volunteerExperience: <Heart className="h-4 w-4" />,
      awards: <Award className="h-4 w-4" />,
      publications: <BookOpen className="h-4 w-4" />,
      languages: <Globe className="h-4 w-4" />,
      additionalInfo: <Plus className="h-4 w-4" />
    };
    return icons[section] || <FileText className="h-4 w-4" />;
  };

  const renderDiffText = (original: string, improved: string) => {
    if (!improved || original === improved) {
      return <span className="text-gray-700">{original}</span>;
    }

    // Simple diff highlighting - in a real implementation, you'd use a proper diff library
    const words = original.split(' ');
    const improvedWords = improved.split(' ');
    
    return (
      <div className="space-y-2">
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <div className="text-xs text-red-600 font-medium mb-1">Original:</div>
          <span className="text-red-700">{original}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="text-xs text-green-600 font-medium mb-1">Improved:</div>
          <span className="text-green-700">{improved}</span>
        </div>
      </div>
    );
  };

  const renderResumeSection = (resume: StructuredResumeData, title: string, isImproved: boolean = false) => {
    const isExpanded = expandedSections.has('personalInfo');
    
    return (
      <Card className={`h-full ${isImproved ? 'border-green-200 bg-green-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <FileText className="h-5 w-5" />
            <span>{title}</span>
            {isImproved && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Personal Information */}
          <div>
            <h3 className="font-semibold text-lg mb-2">{resume.personalInfo.fullName}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{resume.personalInfo.email}</p>
              <p>{resume.personalInfo.phone}</p>
              <p>{resume.personalInfo.address.city}, {resume.personalInfo.address.state}</p>
              {resume.personalInfo.linkedinUrl && (
                <p>LinkedIn: {resume.personalInfo.linkedinUrl}</p>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {resume.summary && (
            <div>
              <h4 className="font-medium mb-2">Professional Summary</h4>
              {viewMode === 'diff' && improvedResume ? (
                renderDiffText(resume.summary, improvedResume.summary || '')
              ) : (
                <p className="text-sm text-muted-foreground">{resume.summary}</p>
              )}
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Education</h4>
              <div className="space-y-3">
                {resume.education.map((edu, index) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-3">
                    <div className="font-medium">{edu.institution}</div>
                    <div className="text-sm text-muted-foreground">
                      {edu.degree} in {edu.fieldOfStudy}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(edu.graduationDate)} • {edu.location}
                    </div>
                    {edu.gpa && (
                      <div className="text-sm text-muted-foreground">GPA: {edu.gpa}</div>
                    )}
                    {edu.honors && edu.honors.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Honors: {edu.honors.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {resume.workExperience.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Work Experience</h4>
              <div className="space-y-3">
                {resume.workExperience.map((work, index) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-3">
                    <div className="font-medium">{work.position}</div>
                    <div className="text-sm text-muted-foreground">{work.company}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(work.startDate)} - {work.isCurrentPosition ? 'Present' : formatDate(work.endDate)} • {work.location}
                    </div>
                    {viewMode === 'diff' && improvedResume && improvedResume.workExperience[index] ? (
                      renderDiffText(work.description, improvedResume.workExperience[index].description)
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
                    )}
                    {work.achievements.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-1">
                        {work.achievements.map((achievement, i) => (
                          <li key={i} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resume.projects.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Projects</h4>
              <div className="space-y-3">
                {resume.projects.map((project, index) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-3">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(project.startDate)} - {formatDate(project.endDate)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Technologies: {project.technologies.join(', ')}
                    </div>
                    {viewMode === 'diff' && improvedResume && improvedResume.projects[index] ? (
                      renderDiffText(project.description, improvedResume.projects[index].description)
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    )}
                    {project.achievements.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-1">
                        {project.achievements.map((achievement, i) => (
                          <li key={i} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          <div>
            <h4 className="font-medium mb-2">Skills</h4>
            <div className="space-y-2">
              {resume.skills.technical.length > 0 && (
                <div>
                  <div className="text-sm font-medium">Technical Skills</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {resume.skills.technical.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {resume.skills.languages.length > 0 && (
                <div>
                  <div className="text-sm font-medium">Programming Languages</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {resume.skills.languages.map((lang, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {resume.skills.soft.length > 0 && (
                <div>
                  <div className="text-sm font-medium">Soft Skills</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {resume.skills.soft.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extracurriculars */}
          {resume.extracurriculars.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Extracurriculars</h4>
              <div className="space-y-3">
                {resume.extracurriculars.map((extra, index) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-3">
                    <div className="font-medium">{extra.role}</div>
                    <div className="text-sm text-muted-foreground">{extra.organization}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(extra.startDate)} - {formatDate(extra.endDate)}
                    </div>
                    {viewMode === 'diff' && improvedResume && improvedResume.extracurriculars[index] ? (
                      renderDiffText(extra.description, improvedResume.extracurriculars[index].description)
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{extra.description}</p>
                    )}
                    {extra.achievements.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-1">
                        {extra.achievements.map((achievement, i) => (
                          <li key={i} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderComparisonView = () => {
    if (viewMode === 'original-only') {
      return (
        <div className="grid grid-cols-1">
          {renderResumeSection(originalResume, "Your Resume", false)}
        </div>
      );
    }

    if (viewMode === 'diff') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GitCompare className="h-5 w-5 text-purple-500" />
                <span>Change Comparison</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Side-by-side comparison of original vs improved content
              </p>
            </CardHeader>
          </Card>
          
          {improvedResume ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderResumeSection(originalResume, "Original Resume", false)}
              {renderResumeSection(improvedResume, "AI Enhanced Resume", true)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <p>No improved version available for comparison.</p>
                <p className="text-sm mt-2">The AI analysis is still processing or no improvements were suggested.</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // Side-by-side view
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderResumeSection(originalResume, "Original Resume", false)}
        {improvedResume ? (
          renderResumeSection(improvedResume, "AI Enhanced Resume", true)
        ) : (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI Enhancement Coming Soon</h3>
              <p className="text-muted-foreground text-center">
                The AI is analyzing your resume and will provide an enhanced version shortly.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <span>Enhanced Resume Comparison</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHighlightChanges(!highlightChanges)}
              >
                {highlightChanges ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {highlightChanges ? 'Hide' : 'Show'} Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewResume}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Full Resume
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="diff">Diff View</TabsTrigger>
              <TabsTrigger value="original-only">Original Only</TabsTrigger>
            </TabsList>

            <TabsContent value={viewMode}>
              {renderComparisonView()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
};

export default EnhancedResumeComparison;
