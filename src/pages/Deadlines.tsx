import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Calendar, CheckCircle2, AlertCircle, Star, Target, Shield, Filter, Loader2, Edit3 } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/integrations/supabase/client";
import { 
  DeadlineService,
  type UserDeadline 
} from "@/services/deadlineService";
import { getUserProgramType } from "@/utils/userProfileUtils";

const Deadlines = () => {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState<UserDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);

  // Single useEffect to fetch everything on initial load
  useEffect(() => {
    const initializeDeadlines = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Step 1: Check if any schools need deadline syncing
        const { data: schoolRecommendations } = await supabase
          .from('school_recommendations')
          .select('id, school, regular_decision_deadline')
          // @ts-ignore - Supabase type inference issue with student_id column
          .eq('student_id', user.id)
          .is('regular_decision_deadline', null);

        // Step 2: Auto-sync deadlines if needed (before fetching)
        if (schoolRecommendations && schoolRecommendations.length > 0) {
          try {
            const { data: deadlineSyncData, error: deadlineSyncError } = await supabase.functions.invoke('auto-sync-deadlines', {
              body: { user_id: user.id },
              headers: {
                Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              }
            });

            if (!deadlineSyncError && deadlineSyncData?.schools_updated > 0) {
              console.log('Auto-synced deadlines for existing schools:', deadlineSyncData);
            }
          } catch (syncError) {
            console.warn('Error auto-syncing existing deadlines:', syncError);
            // Continue with fetch even if sync fails
          }
        }

        // Step 3: Fetch all deadlines once
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
        console.error('Error initializing deadlines:', err);
        setError("Failed to load deadlines");
      } finally {
        setLoading(false);
      }
    };

    initializeDeadlines();
  }, []); // Only run once on mount



  // Handle task completion toggle - surgical update
  const handleTaskToggle = async (schoolId: string, taskType: string, completed: boolean) => {
    try {
      const success = await DeadlineService.updateTaskCompletion(schoolId, taskType, completed);
      
      if (success) {
        // Update local state surgically - only update the specific task
        setDeadlines(prev => {
          const updatedDeadlines = prev.map(d => 
            d.id === schoolId ? {
              ...d,
              tasks: d.tasks.map(task => 
                task.type === taskType ? { ...task, completed } : task
              )
            } : d
          );
          
          // Recalculate stats surgically from updated deadlines (no server refetch)
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
          
          return updatedDeadlines;
        });
      } else {
        setError("Failed to update task completion");
      }
    } catch (err) {
      console.error('Error updating task completion:', err);
      setError("Failed to update task completion");
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

  // Simple custom deadline handler - surgical update
  const handleUpdateCustomDeadline = async (schoolId: string, deadlineDate: Date | undefined) => {
    try {
      const dateString = deadlineDate ? deadlineDate.toISOString().split('T')[0] : null;
      const success = await DeadlineService.updateCustomDeadline(schoolId, dateString, true);
      
      if (success) {
        setDeadlines(prev => prev.map(d => 
          d.id === schoolId ? { ...d, customDeadline: dateString, useCustomDeadline: true } : d
        ));
        setEditingDeadline(null);
      } else {
        setError("Failed to update custom deadline");
      }
    } catch (err) {
      console.error('Error updating custom deadline:', err);
      setError("Failed to update custom deadline");
    }
  };

  const getDisplayDeadline = (deadline: UserDeadline) => {
    // If using custom deadline, show the custom deadline
    if (deadline.useCustomDeadline && deadline.customDeadline) {
      return { 
        type: 'Personal Deadline', 
        date: deadline.customDeadline,
        isCustom: true
      };
    }
    
    // Fall back to official deadlines
    if (deadline.regularDecisionDeadline && 
        deadline.regularDecisionDeadline !== 'null' && 
        deadline.regularDecisionDeadline.trim() !== '') {
      return { 
        type: 'Regular Decision', 
        date: deadline.regularDecisionDeadline,
        isCustom: false
      };
    }

    return { type: 'No deadline set', date: null, isCustom: false };
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
      <GradientBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading deadlines...</p>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
        <GradientBackground>
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold mb-2">Application Deadlines</h1>
              <p className="text-muted-foreground text-base lg:text-lg">
                Track your progress and stay on top of important deadlines
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter:</span>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <Button 
                    variant={filter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="text-xs sm:text-sm"
                  >
                    All
                  </Button>
                  <Button 
                    variant={filter === 'reach' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('reach')}
                    className="text-xs sm:text-sm"
                  >
                    Reach
                  </Button>
                  <Button 
                    variant={filter === 'target' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('target')}
                    className="text-xs sm:text-sm"
                  >
                    Target
                  </Button>
                  <Button 
                    variant={filter === 'safety' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('safety')}
                    className="text-xs sm:text-sm"
                  >
                    Safety
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-8">
              <Card className="text-center p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs lg:text-sm text-muted-foreground">Total Schools</div>
              </Card>
              <Card className="text-center p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs lg:text-sm text-muted-foreground">Completed</div>
              </Card>
              <Card className="text-center p-3 lg:p-4">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                <div className="text-xs lg:text-sm text-muted-foreground">In Progress</div>
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {sortedDeadlines.map((deadline) => (
              <Card key={deadline.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        {getCategoryIcon(deadline.category)}
                        <span>{deadline.schoolName}</span>
                      </CardTitle>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getDisplayDeadline(deadline).date
                              ? `${getDisplayDeadline(deadline).type}: ${new Date(getDisplayDeadline(deadline).date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                              : 'No date set'
                            }
                            {getDisplayDeadline(deadline).isCustom && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Personal
                              </Badge>
                            )}
                          </span>
                        </div>
                        
                        {/* Simple Edit Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingDeadline(deadline.id)}
                                className="h-6 w-6 p-0"
                                title="Change to personal deadline"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Change to personal deadline</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Simple Date Picker */}
                      {editingDeadline === deadline.id && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Personal Deadline</label>
                            <DatePicker
                              value={deadline.customDeadline ? new Date(deadline.customDeadline) : undefined}
                              onChange={(date) => handleUpdateCustomDeadline(deadline.id, date)}
                              placeholder="Select personal deadline"
                              className="h-10 w-full"
                            />
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingDeadline(null)}
                                className="w-full sm:w-auto"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                      {deadline.urgencyLevel !== 'low' && (
                        <Badge className={getUrgencyBadgeColor(deadline.urgencyLevel)}>
                          {deadline.urgencyLevel.toUpperCase()}
                        </Badge>
                      )}
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
                      <div 
                        key={task.id} 
                        className="flex items-center space-x-3 flex-1 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors min-h-[44px]"
                        onClick={() => handleTaskToggle(deadline.id, task.type, !task.completed)}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          task.completed 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-muted-foreground hover:border-green-500'
                        }`}>
                          {task.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''} truncate`}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {sortedDeadlines.length === 0 && (
            <Card className="text-center py-8 sm:py-12">
              <CardContent className="px-4 sm:px-6">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No deadlines found</h3>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  {deadlines.length === 0 
                    ? "You haven't added any schools to your list yet. Add schools to see their deadlines here."
                    : "Try adjusting your filter to see more deadlines."
                  }
                </p>
                {deadlines.length === 0 && (
                  <Button onClick={() => navigate('/schools')} className="w-full sm:w-auto">
                    Add Schools
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
        </GradientBackground>
  );
};

export default Deadlines;