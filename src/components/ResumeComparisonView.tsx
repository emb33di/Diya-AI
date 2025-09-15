import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertCircle, 
  Star, 
  Download, 
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { StructuredResumeData, ResumeFeedbackData } from '@/types/resume';

interface ResumeComparisonViewProps {
  originalResume: StructuredResumeData;
  improvedResume: StructuredResumeData | null;
  feedback: ResumeFeedbackData;
  onDownload: (fileType: 'pdf' | 'docx') => void;
  onViewResume: () => void;
  resumeDataId?: string; // Add this to identify which resume to download
}

const ResumeComparisonView: React.FC<ResumeComparisonViewProps> = ({
  originalResume,
  improvedResume,
  feedback,
  onDownload,
  onViewResume,
  resumeDataId
}) => {
  const [showComparison, setShowComparison] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const renderResumeSection = (resume: StructuredResumeData, title: string, isImproved: boolean = false) => (
    <Card className={`h-full ${isImproved ? 'border-green-200 bg-green-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <FileText className="h-5 w-5" />
          <span>{title}</span>
          {isImproved && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
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
            <p className="text-sm text-muted-foreground">{resume.summary}</p>
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
                  <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
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
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
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

        {/* Extracurricular Activities */}
        {resume.extracurriculars.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Extracurricular Activities</h4>
            <div className="space-y-3">
              {resume.extracurriculars.map((extra, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-3">
                  <div className="font-medium">{extra.role}</div>
                  <div className="text-sm text-muted-foreground">{extra.organization}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(extra.startDate)} - {formatDate(extra.endDate)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{extra.description}</p>
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

  return (
    <div className="space-y-6">
      {/* Feedback Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Resume Analysis Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Overall Score</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {feedback.overall_score}/100
              </div>
              <Progress value={feedback.overall_score} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="font-medium">College Readiness</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {feedback.college_readiness_score}/100
              </div>
              <Progress value={feedback.college_readiness_score} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-green-500" />
                <span className="font-medium">Format Score</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((feedback.format_analysis.structure_score + feedback.format_analysis.readability_score + feedback.format_analysis.visual_appeal_score) / 3)}/100
              </div>
              <Progress value={Math.round((feedback.format_analysis.structure_score + feedback.format_analysis.readability_score + feedback.format_analysis.visual_appeal_score) / 3)} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Strengths</h4>
              <ul className="space-y-1">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-green-600 flex items-start space-x-2">
                    <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="space-y-2">
              <h4 className="font-medium text-red-700">Areas for Improvement</h4>
              <ul className="space-y-1">
                {feedback.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mt-6">
            <h4 className="font-medium mb-2">Actionable Suggestions</h4>
            <ul className="space-y-1">
              {feedback.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                  <span className="text-primary font-bold">{index + 1}.</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Resume Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resume Comparison</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showComparison ? 'Hide' : 'Show'} Comparison
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewResume}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Resume
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showComparison && improvedResume ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderResumeSection(originalResume, "Original Resume", false)}
              {renderResumeSection(improvedResume, "AI Enhanced Resume", true)}
            </div>
          ) : (
            <div className="grid grid-cols-1">
              {renderResumeSection(originalResume, "Your Resume", false)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle>Download Enhanced Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button onClick={() => onDownload('pdf')} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
            <Button onClick={() => onDownload('docx')} variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Download DOCX</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Download the AI-enhanced version of your resume in your preferred format.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeComparisonView;
