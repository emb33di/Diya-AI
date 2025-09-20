import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Calendar, Clock, CheckCircle2, AlertCircle, Star, Target, Shield, Filter, RefreshCw, Loader2 } from "lucide-react";
import OnboardingGuard from "@/components/OnboardingGuard";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/integrations/supabase/client";
import { 
  DeadlineService,
  type UserDeadline 
} from "@/services/deadlineService";

const Deadlines = () => {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState<UserDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);

  // Fetch user's deadlines
  useEffect(() => {
    fetchDeadlines();
  }, []);

  // Auto-sync deadlines for existing schools that don't have them
  useEffect(() => {
    const syncExistingDeadlines = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if any schools don't have regular decision deadlines
        const { data: schoolRecommendations } = await supabase
          .from('school_recommendations')
          .select('id, school, regular_decision_deadline')
          .eq('student_id', user.id)
          .is('regular_decision_deadline', null);

        if (schoolRecommendations && schoolRecommendations.length > 0) {
          // Auto-sync deadlines for schools that don't have them
          const { data: deadlineSyncData, error: deadlineSyncError } = await supabase.functions.invoke('auto-sync-deadlines', {
            body: { user_id: user.id },
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            }
          });

          if (!deadlineSyncError && deadlineSyncData?.schools_updated > 0) {
            console.log('Auto-synced deadlines for existing schools:', deadlineSyncData);
            // Refresh the deadlines after syncing
            fetchDeadlines();
          }
        }
      } catch (error) {
        console.warn('Error auto-syncing existing deadlines:', error);
      }
    };

    syncExistingDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Get user's deadlines
      const userDeadlinesResponse = await DeadlineService.getUserDeadlines(user.id);
      if (userDeadlinesResponse.success) {
        setDeadlines(userDeadlinesResponse.deadlines);
        // Calculate stats from deadlines
        const deadlineStats = {
          total: userDeadlinesResponse.deadlines.length,
          critical: userDeadlinesResponse.deadlines.filter(d => d.urgencyLevel === 'critical').length,
          high: userDeadlinesResponse.deadlines.filter(d => d.urgencyLevel === 'high').length,
          medium: userDeadlinesResponse.deadlines.filter(d => d.urgencyLevel === 'medium').length,
          low: userDeadlinesResponse.deadlines.filter(d => d.urgencyLevel === 'low').length,
          completed: userDeadlinesResponse.deadlines.filter(d => d.applicationStatus === 'completed').length,
          inProgress: userDeadlinesResponse.deadlines.filter(d => d.applicationStatus === 'in_progress').length,
          notStarted: userDeadlinesResponse.deadlines.filter(d => d.applicationStatus === 'not_started').length
        };
        setStats(deadlineStats);
      } else {
        setError(userDeadlinesResponse.error || "Failed to load deadlines");
      }
    } catch (err) {
      console.error('Error fetching deadlines:', err);
      setError("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  };

  // Sync deadlines from the JSON data
  const handleSyncDeadlines = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      console.log('Starting deadline sync for user:', user.id);
      const result = await DeadlineService.syncDeadlinesForUser(user.id);
      console.log('Sync result:', result);
      
      await fetchDeadlines(); // Refresh the data
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error syncing deadlines:', err);
      setError("Failed to sync deadlines");
    } finally {
      setSyncing(false);
    }
  };

  // Update application status
  const handleStatusUpdate = async (schoolId: string, newStatus: 'not_started' | 'in_progress' | 'completed' | 'overdue') => {
    try {
      const success = await DeadlineService.updateApplicationStatus(schoolId, newStatus);
      
      if (success) {
        // Update local state
        setDeadlines(prev => prev.map(d => 
          d.id === schoolId ? { ...d, applicationStatus: newStatus } : d
        ));
        
        // Refresh stats by recalculating from current deadlines
        const updatedDeadlines = deadlines.map(d => 
          d.id === schoolId ? { ...d, applicationStatus: newStatus } : d
        );
        const deadlineStats = {
          total: updatedDeadlines.length,
          critical: updatedDeadlines.filter(d => d.urgencyLevel === 'critical').length,
          high: updatedDeadlines.filter(d => d.urgencyLevel === 'high').length,
          medium: updatedDeadlines.filter(d => d.urgencyLevel === 'medium').length,
          low: updatedDeadlines.filter(d => d.urgencyLevel === 'low').length,
          completed: updatedDeadlines.filter(d => d.applicationStatus === 'completed').length,
          inProgress: updatedDeadlines.filter(d => d.applicationStatus === 'in_progress').length,
          notStarted: updatedDeadlines.filter(d => d.applicationStatus === 'not_started').length
        };
        setStats(deadlineStats);
      } else {
        setError("Failed to update application status");
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError("Failed to update application status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'not_started': return 'bg-gray-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'not_started': return <AlertCircle className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'reach': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'target': return <Target className="h-4 w-4 text-blue-500" />;
      case 'safety': return <Shield className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'text-red-600 font-semibold';
      case 'high': return 'text-orange-600 font-semibold';
      case 'medium': return 'text-yellow-600 font-semibold';
      default: return 'text-muted-foreground';
    }
  };

  const getUrgencyBadgeColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDisplayDeadline = (deadline: UserDeadline) => {
    // Debug logging
    console.log(`School: ${deadline.schoolName}, Deadline: "${deadline.regularDecisionDeadline}"`);
    
    // Only show Regular Decision deadlines
    // Handle both null values and "null" strings
    if (deadline.regularDecisionDeadline && 
        deadline.regularDecisionDeadline !== 'null' && 
        deadline.regularDecisionDeadline.trim() !== '') {
      return { 
        type: 'Regular Decision', 
        date: deadline.regularDecisionDeadline 
      };
    }

    return { type: 'No deadline set', date: null };
  };

  const calculateProgress = (tasks: any[]) => {
    const completedTasks = tasks.filter(task => task.completed).length;
    return (completedTasks / tasks.length) * 100;
  };

  const filteredDeadlines = deadlines.filter(deadline => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return deadline.urgencyLevel === 'critical' || deadline.urgencyLevel === 'high';
    return deadline.category === filter;
  });

  const sortedDeadlines = filteredDeadlines.sort((a, b) => {
    // Sort by urgency first, then by days remaining
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    
    if (urgencyDiff !== 0) return urgencyDiff;
    
    // If same urgency, sort by days remaining
    if (a.daysRemaining === null && b.daysRemaining === null) return 0;
    if (a.daysRemaining === null) return 1;
    if (b.daysRemaining === null) return -1;
    
    return a.daysRemaining - b.daysRemaining;
  });

  if (loading) {
    return (
      <OnboardingGuard pageName="Deadlines">
        <ProfileCompletionGuard pageName="Deadlines">
          <GradientBackground>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading deadlines...</p>
              </div>
            </div>
          </GradientBackground>
        </ProfileCompletionGuard>
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard pageName="Deadlines">
      <ProfileCompletionGuard pageName="Deadlines">
        <GradientBackground>
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">Application Deadlines</h1>
              <p className="text-muted-foreground text-lg">
                Track your progress and stay on top of important deadlines
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleSyncDeadlines}
                disabled={syncing}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>{syncing ? 'Syncing...' : 'Sync Deadlines'}</span>
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Deadlines are automatically synced when schools are added
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex space-x-2">
                  <Button 
                    variant={filter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={filter === 'urgent' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('urgent')}
                  >
                    Urgent
                  </Button>
                  <Button 
                    variant={filter === 'reach' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('reach')}
                  >
                    Reach
                  </Button>
                  <Button 
                    variant={filter === 'target' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('target')}
                  >
                    Target
                  </Button>
                  <Button 
                    variant={filter === 'safety' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('safety')}
                  >
                    Safety
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Schools</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-red-600">{stats.critical + stats.high}</div>
                <div className="text-sm text-muted-foreground">Urgent</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </Card>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Deadlines Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedDeadlines.map((deadline) => (
              <Card key={deadline.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        {getCategoryIcon(deadline.category)}
                        <span>{deadline.schoolName}</span>
                      </CardTitle>
                      
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getDisplayDeadline(deadline).date
                              ? `${getDisplayDeadline(deadline).type}: ${new Date(getDisplayDeadline(deadline).date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                              : 'No date set'
                            }
                          </span>
                        </div>
                        

                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getUrgencyBadgeColor(deadline.urgencyLevel)}>
                        {deadline.urgencyLevel.toUpperCase()}
                      </Badge>
                      
                      <Select
                        value={deadline.applicationStatus}
                        onValueChange={(value: any) => handleStatusUpdate(deadline.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{deadline.tasks.filter(t => t.completed).length}/{deadline.tasks.length} completed</span>
                    </div>
                    <Progress value={calculateProgress(deadline.tasks)} className="h-2" />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <h4 className="font-medium text-sm">Required Tasks:</h4>
                  <div className="space-y-2">
                    {deadline.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            task.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-muted-foreground'
                          }`}>
                            {task.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {sortedDeadlines.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deadlines found</h3>
                <p className="text-muted-foreground mb-4">
                  {deadlines.length === 0 
                    ? "You haven't added any schools to your list yet. Add schools to see their deadlines here."
                    : "Try adjusting your filter to see more deadlines."
                  }
                </p>
                {deadlines.length === 0 && (
                  <Button onClick={() => navigate('/schools')}>
                    Add Schools
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
        </GradientBackground>
      </ProfileCompletionGuard>
    </OnboardingGuard>
  );
};

export default Deadlines;