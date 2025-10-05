import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import OnboardingGuard from "@/components/OnboardingGuard";
import GradientBackground from "@/components/GradientBackground";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useApplicationProgress } from "@/hooks/useApplicationProgress";
import { Link, useNavigate } from "react-router-dom";

import { BookOpen, Calendar, CheckCircle, Target, Users, PenTool, Clock, AlertCircle } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const { 
    essays, 
    deadlines, 
    schoolCategories, 
    upcomingDeadlines, 
    loading, 
    error 
  } = useDashboardData();
  const { 
    completionPercentage: profileCompletion, 
    completedFields, 
    totalFields, 
    missingFields, 
    loading: profileLoading, 
    error: profileError 
  } = useProfileCompletion();
  const { 
    progressPercentage: applicationProgressPercentage,
    completedTasks,
    totalTasks,
    schoolsWithTasks,
    loading: applicationProgressLoading 
  } = useApplicationProgress();


  // Get user's display name with consistent fallback logic
  const displayName = (() => {
    // Priority order: full_name -> email username -> 'Student'
    if (profile?.full_name && profile.full_name.trim()) {
      return profile.full_name.trim();
    }
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      return emailUsername || 'Student';
    }
    return 'Student';
  })();

  // Profile completion is now calculated by the useProfileCompletion hook

  // Calculate overall application progress (profile + tasks)
  const overallProgress = Math.round((profileCompletion + applicationProgressPercentage) / 2);

  // Filter deadlines due this week (next 7 days)
  const thisWeekDeadlines = upcomingDeadlines.filter(deadline => {
    const daysRemaining = deadline.regularDecisionDeadline ? 
      Math.ceil((new Date(deadline.regularDecisionDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return daysRemaining >= 0 && daysRemaining <= 7;
  });

  // Format deadline tasks from this week's deadlines
  const thisWeekTasks = thisWeekDeadlines.map(deadline => {
    const daysRemaining = deadline.regularDecisionDeadline ? 
      Math.ceil((new Date(deadline.regularDecisionDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    let dueText = '';
    if (daysRemaining === 0) dueText = 'Today';
    else if (daysRemaining === 1) dueText = 'Tomorrow';
    else dueText = `${daysRemaining} days`;

    return {
      title: `Submit ${deadline.schoolName} application`,
      due: dueText,
      urgent: daysRemaining <= 3,
      overdue: false
    };
  });

  const schoolCategoryIcons = {
    reach: Target,
    target: CheckCircle,
    safety: Users
  };

  const schoolCategoryColors = {
    reach: "text-accent",
    target: "text-primary", 
    safety: "text-success"
  };

  if (authLoading || loading || profileLoading || applicationProgressLoading) {
    return (
      <OnboardingGuard pageName="Dashboard">
        <GradientBackground>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {authLoading ? 'Loading authentication...' : profileLoading ? 'Calculating profile completion...' : 'Loading your dashboard...'}
              </p>
            </div>
          </div>
        </GradientBackground>
      </OnboardingGuard>
    );
  }

  if (authError) {
    return (
      <OnboardingGuard pageName="Dashboard">
        <GradientBackground>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
              <p className="text-muted-foreground mb-4">{authError}</p>
              <Button onClick={() => navigate('/dashboard', { replace: true })}>Try Again</Button>
            </div>
          </div>
        </GradientBackground>
      </OnboardingGuard>
    );
  }

  if (error) {
    return (
      <OnboardingGuard pageName="Dashboard">
        <GradientBackground>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error loading dashboard</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/dashboard', { replace: true })}>Try Again</Button>
            </div>
          </div>
        </GradientBackground>
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard pageName="Dashboard">
        <GradientBackground>
          <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Welcome back, {displayName}!</h1>
          <p className="text-muted-foreground text-lg">
            You're making great progress on your college applications. Keep up the momentum!
          </p>
        </div>

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-8">
          {/* Left Side - Progress Ring */}
          <div className="flex flex-col items-center order-1 lg:order-1">
            <Card className="bg-gradient-card shadow-lg w-full max-w-md lg:max-w-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-semibold">
                  Application Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                <CircularProgress 
                  value={overallProgress} 
                  size={180} 
                  strokeWidth={12}
                  className="text-primary"
                >
                  <div className="text-center">
                    <div className="text-3xl lg:text-4xl font-bold text-primary">
                      {overallProgress}%
                    </div>
                    <div className="text-sm lg:text-base text-muted-foreground">
                      Complete
                    </div>
                  </div>
                </CircularProgress>
                <div className="text-center">
                  <p className="text-sm lg:text-base text-muted-foreground">
                    {completedTasks}/{totalTasks} tasks completed across {schoolsWithTasks} schools
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Deadlines and Categories */}
          <div className="space-y-4 order-2 lg:order-2">
            {/* Due This Week */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>Due This Week</CardTitle>
                </div>
                <CardDescription>
                  Deadlines and tasks due in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {thisWeekTasks.length > 0 ? (
                  thisWeekTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`h-2 w-2 rounded-full ${
                          task.urgent ? 'bg-warning' : 'bg-success'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {task.due}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/deadlines">View</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nothing due this week</p>
                    <p className="text-sm">Make sure to relax a bit!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* School Categories */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle>School Categories</CardTitle>
                </div>
                <CardDescription>
                  Your organized college list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {schoolCategories.map((category) => {
                  const IconComponent = schoolCategoryIcons[category.category];
                  const colorClass = schoolCategoryColors[category.category];
                  
                  return (
                    <div key={category.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-5 w-5 ${colorClass}`} />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">{category.count} schools</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/schools">View List</Link>
                      </Button>
                    </div>
                  );
                })}
                
                {schoolCategories.every(cat => cat.count === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No schools added yet</p>
                    <p className="text-sm mb-4">Start building your college list</p>
                    <Button asChild>
                      <Link to="/schools">Add Schools</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 lg:mt-8">
          <h2 className="text-lg lg:text-xl font-display font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2" asChild>
              <Link to="/essays">
                <PenTool className="h-6 w-6 text-primary" />
                <span className="text-sm">Start New Essay</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2" asChild>
              <Link to="/deadlines">
                <Calendar className="h-6 w-6 text-primary" />
                <span className="text-sm">View Deadlines</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2" asChild>
              <Link to="/schools">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="text-sm">Research Schools</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2" asChild>
              <Link to="/profile">
                <Users className="h-6 w-6 text-primary" />
                <span className="text-sm">View Profile</span>
              </Link>
            </Button>
          </div>
        </div>
        </main>
        </GradientBackground>
    </OnboardingGuard>
  );
};

export default Dashboard;