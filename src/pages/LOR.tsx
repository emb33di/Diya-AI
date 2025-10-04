import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, CheckCircle2, AlertCircle, Star, Target, Shield, Filter, RefreshCw, Loader2, Plus, Edit, Trash2, Mail, Phone, User } from "lucide-react";
import OnboardingGuard from "@/components/OnboardingGuard";
import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/integrations/supabase/client";
import { 
  LORService,
  type LORRecommender,
  type LORDeadlineInfo,
  type LORStats,
  type LORSchoolAllocation,
  type SchoolOption
} from "@/services/lorService";

const LOR = () => {
  const [recommenders, setRecommenders] = useState<LORRecommender[]>([]);
  const [deadlines, setDeadlines] = useState<LORDeadlineInfo[]>([]);
  const [stats, setStats] = useState<LORStats | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  
  // School allocation state
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [selectedRecommender, setSelectedRecommender] = useState<LORRecommender | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [allocationNotes, setAllocationNotes] = useState<string>('');
  
  // Form state for adding/editing recommenders
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecommender, setEditingRecommender] = useState<LORRecommender | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    internalDeadline1: '',
    internalDeadline2: '',
    internalDeadline3: '',
    status: 'not_contacted' as 'not_contacted' | 'contacted' | 'agreed' | 'in_progress' | 'submitted' | 'declined'
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const [recommendersData, deadlinesData, statsData, schoolOptionsData] = await Promise.all([
        LORService.getUserRecommenders(user.id),
        LORService.getUserLORDeadlines(user.id),
        LORService.getUserLORStats(user.id),
        LORService.getUserSchoolOptions(user.id)
      ]);

      setRecommenders(recommendersData);
      setDeadlines(deadlinesData);
      setStats(statsData);
      setSchoolOptions(schoolOptionsData);
    } catch (err) {
      console.error('[LOR_ERROR] Failed to load LOR data:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot see their letters of recommendation data'
      });
      setError("Failed to load LOR data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecommender = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      await LORService.addRecommender({
        userId: user.id,
        ...formData
      });

      setIsAddDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error('[LOR_ERROR] Failed to add recommender:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        recommenderName: formData.name,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot add recommender to their list'
      });
      setError("Failed to add recommender");
    }
  };

  const handleUpdateRecommender = async () => {
    if (!editingRecommender) return;

    try {
      await LORService.updateRecommender(editingRecommender.id, formData);
      
      setIsEditDialogOpen(false);
      setEditingRecommender(null);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error('[LOR_ERROR] Failed to update recommender:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        recommenderId: editingRecommender.id,
        recommenderName: editingRecommender.name,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot update recommender information'
      });
      setError("Failed to update recommender");
    }
  };

  const handleDeleteRecommender = async (id: string) => {
    try {
      await LORService.deleteRecommender(id);
      await fetchData();
    } catch (err) {
      console.error('[LOR_ERROR] Failed to delete recommender:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        recommenderId: id,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot remove recommender from their list'
      });
      setError("Failed to delete recommender");
    }
  };

  const openEditDialog = (recommender: LORRecommender) => {
    setEditingRecommender(recommender);
    setFormData({
      name: recommender.name,
      position: recommender.position,
      email: recommender.email || '',
      phone: recommender.phone || '',
      internalDeadline1: recommender.internalDeadline1 || '',
      internalDeadline2: recommender.internalDeadline2 || '',
      internalDeadline3: recommender.internalDeadline3 || '',
      status: recommender.status as 'not_contacted' | 'contacted' | 'agreed' | 'in_progress' | 'submitted' | 'declined'
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      email: '',
      phone: '',
      internalDeadline1: '',
      internalDeadline2: '',
      internalDeadline3: '',
      status: 'not_contacted'
    });
  };

  const openAllocationDialog = (recommender: LORRecommender) => {
    setSelectedRecommender(recommender);
    setSelectedSchoolId('');
    setAllocationNotes('');
    setIsAllocationDialogOpen(true);
  };

  const handleAddSchoolAllocation = async () => {
    if (!selectedRecommender || !selectedSchoolId) return;

    try {
      await LORService.addSchoolAllocation(selectedRecommender.id, selectedSchoolId, allocationNotes);
      setIsAllocationDialogOpen(false);
      setSelectedRecommender(null);
      setSelectedSchoolId('');
      setAllocationNotes('');
      await fetchData();
    } catch (err) {
      console.error('[LOR_ERROR] Failed to add school allocation:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        recommenderId: selectedRecommender.id,
        recommenderName: selectedRecommender.name,
        schoolId: selectedSchoolId,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot assign school to recommender'
      });
      setError("Failed to add school allocation");
    }
  };

  const handleUpdateAllocationStatus = async (allocationId: string, newStatus: string) => {
    try {
      await LORService.updateSchoolAllocation(allocationId, { allocationStatus: newStatus as any });
      await fetchData();
    } catch (err) {
      console.error('[LOR_ERROR] Failed to update allocation status:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        allocationId: allocationId,
        newStatus: newStatus,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot update school allocation status'
      });
      setError("Failed to update allocation status");
    }
  };

  const handleRemoveSchoolAllocation = async (allocationId: string) => {
    try {
      await LORService.removeSchoolAllocation(allocationId);
      await fetchData();
    } catch (err) {
      console.error('[LOR_ERROR] Failed to remove school allocation:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        allocationId: allocationId,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot remove school allocation from recommender'
      });
      setError("Failed to remove school allocation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'agreed': return 'bg-purple-500 text-white';
      case 'contacted': return 'bg-yellow-500 text-white';
      case 'not_contacted': return 'bg-gray-500 text-white';
      case 'declined': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'agreed': return <Star className="h-4 w-4" />;
      case 'contacted': return <Mail className="h-4 w-4" />;
      case 'not_contacted': return <AlertCircle className="h-4 w-4" />;
      case 'declined': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'text-red-600 font-semibold';
      case 'high': return 'text-orange-600 font-semibold';
      case 'medium': return 'text-yellow-600 font-semibold';
      case 'overdue': return 'text-red-800 font-bold';
      default: return 'text-muted-foreground';
    }
  };

  const getUrgencyBadgeColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'overdue': return 'bg-red-700 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDeadlineTypeLabel = (type: string) => {
    switch (type) {
      case 'reach_out': return 'Reach Out';
      case 'check_in': return 'Check-in';
      case 'submit': return 'Submit LOR';
      default: return type;
    }
  };

  const getAllocationStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-500 text-white';
      case 'allocated': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'declined': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getAllocationStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <CheckCircle2 className="h-4 w-4" />;
      case 'allocated': return <Star className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'declined': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredRecommenders = recommenders.filter(recommender => {
    if (filter === 'all') return true;
    if (filter === 'urgent') {
      const recommenderDeadlines = deadlines.filter(d => d.id.startsWith(recommender.id));
      return recommenderDeadlines.some(d => d.urgencyLevel === 'critical' || d.urgencyLevel === 'high');
    }
    return recommender.status === filter;
  });

  const filteredDeadlines = deadlines.filter(deadline => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return deadline.urgencyLevel === 'critical' || deadline.urgencyLevel === 'high';
    return true;
  });

  if (loading) {
    return (
      <OnboardingGuard pageName="LOR">
          <GradientBackground>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading LOR data...</p>
              </div>
            </div>
          </GradientBackground>
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard pageName="LOR">
        <GradientBackground>
            <main className="container mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-display font-bold mb-2">Letter of Recommendation</h1>
                  <p className="text-muted-foreground text-lg">
                    Manage your LOR requests and track internal deadlines
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Recommender
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-primary" />
                          <span>Add New Recommender</span>
                        </DialogTitle>
                        <DialogDescription>
                          Add a new recommender and set internal deadlines for your LOR request.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <User className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-lg">Basic Information</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-sm font-medium">
                                Full Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Dev Mathur"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="position" className="text-sm font-medium">
                                Position/Title <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="position"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                placeholder="Chemistry Teacher, Product Supervisor"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-sm font-medium">
                                Email Address
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="dev.mathur@school.edu"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-sm font-medium">
                                Phone Number
                              </Label>
                              <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+919933456983"
                                className="h-10"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-lg">Current Status</h3>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="status" className="text-sm font-medium">
                              Status
                            </Label>
                            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select current status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_contacted">
                                  <div className="flex items-center space-x-2">
                                    <AlertCircle className="h-4 w-4 text-gray-500" />
                                    <span>Not Contacted</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="contacted">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-blue-500" />
                                    <span>Contacted</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="agreed">
                                  <div className="flex items-center space-x-2">
                                    <Star className="h-4 w-4 text-purple-500" />
                                    <span>Agreed</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    <span>In Progress</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="submitted">
                                  <div className="flex items-center space-x-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span>Submitted</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="declined">
                                  <div className="flex items-center space-x-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span>Declined</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Internal Deadlines Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Calendar className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-lg">Internal Deadlines</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <div className="space-y-3">
                                <Label htmlFor="deadline1" className="text-sm font-semibold">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Mail className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span>Reach Out</span>
                                    <span className="text-red-500">*</span>
                                  </div>
                                </Label>
                                <div className="relative">
                                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="deadline1"
                                    type="date"
                                    value={formData.internalDeadline1}
                                    onChange={(e) => setFormData({ ...formData, internalDeadline1: e.target.value })}
                                    className="h-12 pr-10 text-base border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                    required
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  When to contact them
                                </p>
                              </div>
                              
                              <div className="space-y-3">
                                <Label htmlFor="deadline2" className="text-sm font-semibold">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                      <Clock className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <span>Check-in</span>
                                    <span className="text-red-500">*</span>
                                  </div>
                                </Label>
                                <div className="relative">
                                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="deadline2"
                                    type="date"
                                    value={formData.internalDeadline2}
                                    onChange={(e) => setFormData({ ...formData, internalDeadline2: e.target.value })}
                                    className="h-12 pr-10 text-base border-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                    required
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Follow up on progress
                                </p>
                              </div>
                              
                              <div className="space-y-3">
                                <Label htmlFor="deadline3" className="text-sm font-semibold">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </div>
                                    <span>Submit LOR</span>
                                    <span className="text-red-500">*</span>
                                  </div>
                                </Label>
                                <div className="relative">
                                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="deadline3"
                                    type="date"
                                    value={formData.internalDeadline3}
                                    onChange={(e) => setFormData({ ...formData, internalDeadline3: e.target.value })}
                                    className="h-12 pr-10 text-base border-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                    required
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  When they should submit
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="flex justify-end space-x-3 pt-6 border-t">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddRecommender} className="min-w-[120px]">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Recommender
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

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
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Recommenders</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
                    <div className="text-sm text-muted-foreground">Submitted</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</div>
                    <div className="text-sm text-muted-foreground">Upcoming Deadlines</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.overdueDeadlines}</div>
                    <div className="text-sm text-muted-foreground">Overdue</div>
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

              {/* Upcoming Deadlines */}
              {filteredDeadlines.length > 0 && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span>Upcoming Deadlines</span>
                    </CardTitle>
                    <CardDescription>
                      Internal deadlines for LOR requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredDeadlines.slice(0, 5).map((deadline) => (
                        <div key={deadline.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`h-2 w-2 rounded-full ${
                              deadline.urgencyLevel === 'critical' || deadline.urgencyLevel === 'overdue' ? 'bg-red-500' :
                              deadline.urgencyLevel === 'high' ? 'bg-orange-500' : 'bg-green-500'
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{deadline.recommenderName}</p>
                              <p className="text-xs text-muted-foreground">
                                {getDeadlineTypeLabel(deadline.deadlineType)} - {new Date(deadline.deadlineDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getUrgencyBadgeColor(deadline.urgencyLevel)}>
                              {deadline.daysRemaining < 0 ? 'Overdue' : `${deadline.daysRemaining} days`}
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(deadline.status)}>
                              {deadline.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommenders List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRecommenders.map((recommender) => (
                  <Card key={recommender.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center space-x-2 text-lg">
                            <User className="h-5 w-5 text-primary" />
                            <span>{recommender.name}</span>
                          </CardTitle>
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{recommender.position}</span>
                            </div>
                            {recommender.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{recommender.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getStatusColor(recommender.status)}>
                            {recommender.status.replace('_', ' ')}
                          </Badge>
                          
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => openAllocationDialog(recommender)}>
                              <Target className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(recommender)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Recommender</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {recommender.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteRecommender(recommender.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {recommender.relationship && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Relationship:</h4>
                          <p className="text-sm text-muted-foreground">{recommender.relationship}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Internal Deadlines:</h4>
                        <div className="space-y-2">
                          {recommender.internalDeadline1 && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <span className="text-sm">Reach Out:</span>
                              <span className="text-sm font-medium">{new Date(recommender.internalDeadline1).toLocaleDateString()}</span>
                            </div>
                          )}
                          {recommender.internalDeadline2 && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <span className="text-sm">Check-in:</span>
                              <span className="text-sm font-medium">{new Date(recommender.internalDeadline2).toLocaleDateString()}</span>
                            </div>
                          )}
                          {recommender.internalDeadline3 && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <span className="text-sm">Submit LOR:</span>
                              <span className="text-sm font-medium">{new Date(recommender.internalDeadline3).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {recommender.notes && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Notes:</h4>
                          <p className="text-sm text-muted-foreground">{recommender.notes}</p>
                        </div>
                      )}
                      
                      {/* School Allocations */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">School Allocations:</h4>
                          <Button size="sm" variant="outline" onClick={() => openAllocationDialog(recommender)}>
                            <Target className="h-3 w-3 mr-1" />
                            Add School
                          </Button>
                        </div>
                        {recommender.schoolAllocations && recommender.schoolAllocations.length > 0 ? (
                          <div className="space-y-2">
                            {recommender.schoolAllocations.map((allocation) => (
                              <div key={allocation.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    allocation.allocationStatus === 'submitted' ? 'bg-green-500' :
                                    allocation.allocationStatus === 'allocated' ? 'bg-blue-500' :
                                    allocation.allocationStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} />
                                  <span className="text-sm font-medium">{allocation.schoolName}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={allocation.allocationStatus}
                                    onValueChange={(value) => handleUpdateAllocationStatus(allocation.id, value)}
                                  >
                                    <SelectTrigger className="w-24 h-6 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="allocated">Allocated</SelectItem>
                                      <SelectItem value="submitted">Submitted</SelectItem>
                                      <SelectItem value="declined">Declined</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove School Allocation</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to remove {allocation.schoolName} from this recommender's allocations?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveSchoolAllocation(allocation.id)}>
                                          Remove
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Target className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No schools allocated yet</p>
                            <p className="text-xs">Click "Add School" to allocate this recommender to schools</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredRecommenders.length === 0 && (
                <Card className="text-center py-12">
                  <CardContent>
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recommenders found</h3>
                    <p className="text-muted-foreground mb-4">
                      {recommenders.length === 0 
                        ? "You haven't added any recommenders yet. Add your first recommender to get started."
                        : "Try adjusting your filter to see more recommenders."
                      }
                    </p>
                    {recommenders.length === 0 && (
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Recommender
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Edit Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Edit className="h-5 w-5 text-primary" />
                      <span>Edit Recommender</span>
                    </DialogTitle>
                    <DialogDescription>
                      Update recommender information and deadlines.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <User className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-lg">Basic Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name" className="text-sm font-medium">
                            Full Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Dev Mathur"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-position" className="text-sm font-medium">
                            Position/Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="edit-position"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            placeholder="Chemistry Teacher, Product Supervisor"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-email" className="text-sm font-medium">
                            Email Address
                          </Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="dev.mathur@school.edu"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-phone" className="text-sm font-medium">
                            Phone Number
                          </Label>
                          <Input
                            id="edit-phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+919933457873"
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-lg">Current Status</h3>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-status" className="text-sm font-medium">
                          Status
                        </Label>
                        <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select current status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_contacted">
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="h-4 w-4 text-gray-500" />
                                <span>Not Contacted</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="contacted">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-blue-500" />
                                <span>Contacted</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="agreed">
                              <div className="flex items-center space-x-2">
                                <Star className="h-4 w-4 text-purple-500" />
                                <span>Agreed</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="in_progress">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span>In Progress</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="submitted">
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Submitted</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="declined">
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <span>Declined</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Internal Deadlines Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-lg">Internal Deadlines</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div className="space-y-3">
                            <Label htmlFor="edit-deadline1" className="text-sm font-semibold">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-blue-600" />
                                </div>
                                <span>Reach Out</span>
                                <span className="text-red-500">*</span>
                              </div>
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="edit-deadline1"
                                type="date"
                                value={formData.internalDeadline1}
                                onChange={(e) => setFormData({ ...formData, internalDeadline1: e.target.value })}
                                className="h-12 pr-10 text-base border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                required
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              When to contact them
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="edit-deadline2" className="text-sm font-semibold">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                  <Clock className="h-4 w-4 text-orange-600" />
                                </div>
                                <span>Check-in</span>
                                <span className="text-red-500">*</span>
                              </div>
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="edit-deadline2"
                                type="date"
                                value={formData.internalDeadline2}
                                onChange={(e) => setFormData({ ...formData, internalDeadline2: e.target.value })}
                                className="h-12 pr-10 text-base border-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                required
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Follow up on progress
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="edit-deadline3" className="text-sm font-semibold">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                                <span>Submit LOR</span>
                                <span className="text-red-500">*</span>
                              </div>
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="edit-deadline3"
                                type="date"
                                value={formData.internalDeadline3}
                                onChange={(e) => setFormData({ ...formData, internalDeadline3: e.target.value })}
                                className="h-12 pr-10 text-base border-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                required
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              When they should submit
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateRecommender} className="min-w-[120px]">
                      <Edit className="h-4 w-4 mr-2" />
                      Update Recommender
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* School Allocation Dialog */}
              <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span>Allocate Schools to {selectedRecommender?.name}</span>
                    </DialogTitle>
                    <DialogDescription>
                      Select schools from your school list to allocate this recommender to.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-select" className="text-sm font-medium">
                        Select School <span className="text-red-500">*</span>
                      </Label>
                      <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose a school from your list" />
                        </SelectTrigger>
                        <SelectContent>
                          {schoolOptions
                            .filter(school => 
                              !selectedRecommender?.schoolAllocations?.some(
                                allocation => allocation.schoolRecommendationId === school.id
                              )
                            )
                            .map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  school.category === 'reach' ? 'bg-yellow-500' :
                                  school.category === 'target' ? 'bg-blue-500' : 'bg-green-500'
                                }`} />
                                <span>{school.school}</span>
                                <Badge variant="outline" className="text-xs">
                                  {school.category}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {schoolOptions.filter(school => 
                        !selectedRecommender?.schoolAllocations?.some(
                          allocation => allocation.schoolRecommendationId === school.id
                        )
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          All schools have been allocated to this recommender.
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="allocation-notes" className="text-sm font-medium">
                        Notes (Optional)
                      </Label>
                      <Textarea
                        id="allocation-notes"
                        value={allocationNotes}
                        onChange={(e) => setAllocationNotes(e.target.value)}
                        placeholder="Any specific notes about this school allocation..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button variant="outline" onClick={() => setIsAllocationDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddSchoolAllocation} 
                      disabled={!selectedSchoolId}
                      className="min-w-[120px]"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Allocate School
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </main>
        </GradientBackground>
    </OnboardingGuard>
  );
};

export default LOR;
