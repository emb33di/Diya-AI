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
import { useEffect } from "react";

import { BookOpen, Calendar, CheckCircle, Target, Users, PenTool, Clock, AlertCircle } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const { 
    essays, 
    deadlines, 
    schoolCategories, 
    upcomingDeadlines,
    upcomingLorDeadlines,
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

  useEffect(() => {
    console.log('[DASHBOARD_DEBUG] Loading flags snapshot', {
      authLoading,
      dashboardDataLoading: loading,
      profileLoading,
      applicationProgressLoading,
    });
  }, [authLoading, loading, profileLoading, applicationProgressLoading]);

  useEffect(() => {
    console.log('[DASHBOARD_DEBUG] Data snapshot', {
      essaysCount: essays.length,
      deadlinesCount: deadlines.length,
      schoolCategoriesCount: schoolCategories.length,
      upcomingDeadlinesCount: upcomingDeadlines.length,
      upcomingLorDeadlinesCount: upcomingLorDeadlines.length,
    });
  }, [essays, deadlines, schoolCategories, upcomingDeadlines, upcomingLorDeadlines]);

  useEffect(() => {
    if (authError || error) {
      console.log('[DASHBOARD_DEBUG] Error state detected', {
        authError,
        dashboardError: error,
      });
    }
  }, [authError, error]);

  useEffect(() => {
    if (!authLoading && !loading && !profileLoading && !applicationProgressLoading) {
      console.log('[DASHBOARD_DEBUG] Ready to render dashboard content', {
        userId: user?.id ?? null,
        profileId: profile?.id ?? null,
        displayName,
      });
    }
  }, [authLoading, loading, profileLoading, applicationProgressLoading, user?.id, profile?.id, displayName]);

  // Profile completion is now calculated by the useProfileCompletion hook

  // Use only task completion for progress ring
  const overallProgress = applicationProgressPercentage;

  // Filter deadlines due this week (next 7 days) - including custom deadlines
  const thisWeekDeadlines = upcomingDeadlines.filter(deadline => {
    // Get the effective deadline date
    const effectiveDeadline = deadline.useCustomDeadline && deadline.customDeadline 
      ? deadline.customDeadline 
      : deadline.regularDecisionDeadline;
    
    const daysRemaining = effectiveDeadline ? 
      Math.ceil((new Date(effectiveDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return daysRemaining >= 0 && daysRemaining <= 7;
  });

  // Format deadline tasks from this week's deadlines
  const thisWeekTasks = thisWeekDeadlines.map(deadline => {
    // Get the effective deadline date
    const effectiveDeadline = deadline.useCustomDeadline && deadline.customDeadline 
      ? deadline.customDeadline 
      : deadline.regularDecisionDeadline;
    
    const daysRemaining = effectiveDeadline ? 
      Math.ceil((new Date(effectiveDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    let dueText = '';
    if (daysRemaining === 0) dueText = 'Today';
    else if (daysRemaining === 1) dueText = 'Tomorrow';
    else dueText = `${daysRemaining} days`;

    // Add indicator for custom deadlines
    const deadlineType = deadline.useCustomDeadline && deadline.customDeadline ? 'Personal' : 'Regular';
    const title = `Submit ${deadline.schoolName} application (${deadlineType})`;

    return {
      title,
      due: dueText,
      urgent: daysRemaining <= 3,
      overdue: false,
      linkTo: '/deadlines'
    };
  });

  // Include LOR deadlines due this week (already filtered to next 5 in hook)
  const thisWeekLorTasks = (upcomingLorDeadlines || []).filter(ld => ld.daysRemaining <= 7).map(ld => {
    const daysRemaining = ld.daysRemaining;
    let dueText = '';
    if (daysRemaining === 0) dueText = 'Today';
    else if (daysRemaining === 1) dueText = 'Tomorrow';
    else dueText = `${daysRemaining} days`;

    let title = '';
    if (ld.deadlineType === 'reach_out') {
      title = `Reach out to ${ld.recommenderName}`;
    } else if (ld.deadlineType === 'check_in') {
      title = `Check-in with ${ld.recommenderName}`;
    } else {
      title = `Submit LOR for ${ld.recommenderName}`;
    }

    return {
      title,
      due: dueText,
      urgent: daysRemaining <= 3,
      overdue: false,
      linkTo: '/lor'
    };
  });

  const combinedThisWeekTasks = [...thisWeekTasks, ...thisWeekLorTasks]
    .sort((a, b) => {
      // Sort by urgency (urgent first), then by days text parsed to number when possible
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      const parseDays = (t: { due: string }) => t.due === 'Today' ? 0 : t.due === 'Tomorrow' ? 1 : parseInt(t.due.replace(/[^0-9]/g, ''), 10) || 9999;
      return parseDays(a) - parseDays(b);
    })
    .slice(0, 7);

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
    console.log('[DASHBOARD_DEBUG] Rendering loading fallback', {
      authLoading,
      dashboardDataLoading: loading,
      profileLoading,
      applicationProgressLoading,
    });
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
    console.log('[DASHBOARD_DEBUG] Rendering auth error state', { authError });
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
    console.log('[DASHBOARD_DEBUG] Rendering dashboard error state', { error });
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
          <p className="hidden md:block text-muted-foreground text-lg">
            You're making great progress on your college applications. Keep up the momentum!
          </p>
        </div>

        {/* Top Row - Progress Ring and Due This Week */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 mb-6">
          {/* Left Side - Progress Ring */}
          <div className="flex flex-col items-center">
            <Card className="bg-gradient-card shadow-lg w-full h-[400px] flex flex-col">
              <CardHeader className="text-center pb-4 flex-shrink-0">
                <CardTitle className="text-xl font-semibold">
                  Application Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center md:space-y-4 flex-1">
                <div className="flex-1 flex items-center justify-center md:flex-initial">
                  <CircularProgress 
                    value={overallProgress} 
                    size={160} 
                    strokeWidth={12}
                    className="text-primary"
                  >
                    <div className="text-center">
                      <div className="text-2xl lg:text-3xl font-bold text-primary">
                        {overallProgress}%
                      </div>
                      <div className="text-xs lg:text-sm text-muted-foreground">
                        Complete
                      </div>
                    </div>
                  </CircularProgress>
                </div>
                <div className="text-center mt-auto md:mt-0">
                  <p className="text-xs lg:text-sm text-muted-foreground">
                    {completedTasks}/{totalTasks} tasks completed across {schoolsWithTasks} schools
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Due This Week */}
          <div>
            <Card className="shadow-lg h-[400px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>Due This Week</CardTitle>
                </div>
                <CardDescription>
                  Deadlines and tasks due in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 overflow-y-auto flex-1">
                {combinedThisWeekTasks.length > 0 ? (
                  combinedThisWeekTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
                        <Link to={task.linkTo}>View</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nothing due this week</p>
                    <p className="text-xs">Make sure to relax a bit!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* School Categories - Full Width Below */}
        <div className="mb-6">
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
            <CardContent className="space-y-3">
              {schoolCategories.map((category) => {
                const IconComponent = schoolCategoryIcons[category.category];
                const colorClass = schoolCategoryColors[category.category];
                
                return (
                  <div key={category.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
                <div className="text-center py-6 text-muted-foreground">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No schools added yet</p>
                  <p className="text-xs mb-3">Start building your college list</p>
                  <Button size="sm" asChild>
                    <Link to="/schools">Add Schools</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 lg:mt-6">
          <h2 className="text-lg lg:text-xl font-display font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-3">
            <Button variant="outline" className="h-auto p-3 flex-col space-y-1" asChild>
              <Link to="/essays">
                <PenTool className="h-5 w-5 text-primary" />
                <span className="text-xs">Start New Essay</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex-col space-y-1" asChild>
              <Link to="/deadlines">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-xs">View Deadlines</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex-col space-y-1" asChild>
              <Link to="/schools">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-xs">Research Schools</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex-col space-y-1" asChild>
              <Link to="/profile">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs">View Profile</span>
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