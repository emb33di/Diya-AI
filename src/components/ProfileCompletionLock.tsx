import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  Target,
  Heart,
  DollarSign,
  MapPin,
  BookOpen
} from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

interface ProfileCompletionLockProps {
  pageName: string;
  missingFields: string[];
}

const ProfileCompletionLock: React.FC<ProfileCompletionLockProps> = ({ 
  pageName, 
  missingFields 
}) => {
  const navigate = useNavigate();
  const { completionPercentage, completedFields, totalFields } = useProfileCompletion();

  // Map field keys to user-friendly names
  const getFieldDisplayName = (fieldKey: string): string => {
    const fieldMap: Record<string, string> = {
      'full_name': 'Full Name',
      'preferred_name': 'Preferred Name',
      'email_address': 'Email Address',
      'country_code': 'Country Code',
      'phone_number': 'Phone Number',
      'applying_to': 'Applying To',
      'masters_field_of_focus': 'Masters Field of Focus',
      'high_school_name': 'High School Name',
      'high_school_graduation_year': 'High School Graduation Year',
      'school_board': 'School Board',
      'year_of_study': 'Year of Study',
      'class_10_score': 'Class 10 Grade',
      'class_11_score': 'Class 11 Grade',
      'class_12_half_yearly_score': 'Class 12 Half-Yearly Grade',
      'undergraduate_cgpa': 'Undergraduate CGPA',
      'intended_majors': 'Intended Major(s)',
      'ideal_college_size': 'Ideal College Size',
      'ideal_college_setting': 'Ideal College Setting',
      'geographic_preference': 'Geographic Preference',
      'must_haves': 'Must-Haves',
      'deal_breakers': 'Deal-Breakers',
      'college_budget': 'College Budget',
      'financial_aid_importance': 'Financial Aid Importance',
      'scholarship_interests': 'Scholarship Interests',
      'has_sat_scores': 'SAT Scores',
      'has_act_scores': 'ACT Scores'
    };
    return fieldMap[fieldKey] || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Group missing fields by category
  const getFieldCategory = (fieldKey: string): string => {
    const categoryMap: Record<string, string> = {
      'full_name': 'Personal Information',
      'preferred_name': 'Personal Information',
      'email_address': 'Personal Information',
      'country_code': 'Personal Information',
      'phone_number': 'Personal Information',
      'applying_to': 'Personal Information',
      'masters_field_of_focus': 'Personal Information',
      'high_school_name': 'Academic Profile',
      'high_school_graduation_year': 'Academic Profile',
      'school_board': 'Academic Profile',
      'year_of_study': 'Academic Profile',
      'class_10_score': 'Academic Profile',
      'class_11_score': 'Academic Profile',
      'class_12_half_yearly_score': 'Academic Profile',
      'undergraduate_cgpa': 'Academic Profile',
      'intended_majors': 'Personal Information',
      'ideal_college_size': 'College Preferences',
      'ideal_college_setting': 'College Preferences',
      'geographic_preference': 'College Preferences',
      'must_haves': 'College Preferences',
      'deal_breakers': 'College Preferences',
      'college_budget': 'Financial Information',
      'financial_aid_importance': 'Financial Information',
      'scholarship_interests': 'Financial Information',
      'has_sat_scores': 'Test Scores',
      'has_act_scores': 'Test Scores'
    };
    return categoryMap[fieldKey] || 'Other';
  };

  // Group missing fields by category
  const groupedMissingFields = missingFields.reduce((acc, field) => {
    const category = getFieldCategory(field);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {} as Record<string, string[]>);

  const features = [
    {
      icon: GraduationCap,
      title: "Personalized Recommendations",
      description: "Get matched with colleges that fit your unique profile"
    },
    {
      icon: Target,
      title: "Strategic Planning",
      description: "Develop a comprehensive application strategy"
    },
    {
      icon: Heart,
      title: "AI-Powered Guidance",
      description: "Receive personalized advice from Diya, your AI counselor"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <p className="text-muted-foreground">
            To access {pageName}, you need to complete your profile information. 
            This helps us provide you with personalized college recommendations and guidance.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Profile Completion</h3>
              <Badge variant="outline" className="text-sm">
                {completedFields} of {totalFields} fields completed
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <p className="text-sm text-muted-foreground text-center">
              {completionPercentage}% complete
            </p>
          </div>

          {/* Missing Fields Section */}
          {missingFields.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Required fields missing:</strong> Please complete the following information to access all features.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Missing Information
                </h4>
                {Object.entries(groupedMissingFields).map(([category, fields]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {category === 'Personal Information' && <User className="h-4 w-4 text-blue-500" />}
                      {category === 'Academic Profile' && <GraduationCap className="h-4 w-4 text-green-500" />}
                      {category === 'College Preferences' && <Target className="h-4 w-4 text-purple-500" />}
                      {category === 'Financial Information' && <DollarSign className="h-4 w-4 text-yellow-500" />}
                      {category === 'Test Scores' && <BookOpen className="h-4 w-4 text-orange-500" />}
                      <span className="font-medium text-sm">{category}</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {fields.map((field) => (
                        <div key={field} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-muted-foreground">
                            {getFieldDisplayName(field)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What you'll get with a complete profile:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <feature.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => navigate('/profile')}
              className="w-full sm:w-auto"
              size="lg"
            >
              Complete Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCompletionLock;
