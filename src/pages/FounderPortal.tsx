/**
 * Founder Portal - Escalated Essays Dashboard
 * 
 * Lists all escalated essays for founder review
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Clock, 
  User, 
  Mail,
  AlertCircle,
  CheckCircle,
  Send,
  Eye
} from 'lucide-react';
import { EscalatedEssaysService, EscalatedEssayStatus, EscalatedEssayListItem } from '@/services/escalatedEssaysService';
import { useToast } from '@/hooks/use-toast';
import FounderGuard from '@/components/FounderGuard';

const FounderPortal: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [essays, setEssays] = useState<EscalatedEssayListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<EscalatedEssayStatus | 'all'>('all');
  const [counts, setCounts] = useState({
    pending: 0,
    in_review: 0,
    reviewed: 0,
    sent_back: 0,
    total: 0
  });

  useEffect(() => {
    loadEssays();
    loadCounts();
  }, [selectedStatus]);

  const loadEssays = async () => {
    try {
      setLoading(true);
      const filters = selectedStatus !== 'all' ? { status: selectedStatus } : undefined;
      const data = await EscalatedEssaysService.fetchEscalatedEssays(filters);
      setEssays(data);
    } catch (error) {
      console.error('Error loading escalated essays:', error);
      toast({
        title: 'Error',
        description: 'Failed to load escalated essays. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const countsData = await EscalatedEssaysService.getEscalatedEssayCounts();
      setCounts(countsData);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const getStatusBadge = (status: EscalatedEssayStatus) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'default' as const, icon: Clock },
      in_review: { label: 'In Review', variant: 'secondary' as const, icon: Eye },
      reviewed: { label: 'Reviewed', variant: 'outline' as const, icon: CheckCircle },
      sent_back: { label: 'Sent Back', variant: 'default' as const, icon: Send }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <FounderGuard>
      <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Founder Portal</h1>
            <p className="text-muted-foreground">Review and provide feedback on escalated essays</p>
          </div>

          {/* Status Tabs */}
          <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as EscalatedEssayStatus | 'all')} className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({counts.total})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="in_review">
                In Review ({counts.in_review})
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                Reviewed ({counts.reviewed})
              </TabsTrigger>
              <TabsTrigger value="sent_back">
                Sent Back ({counts.sent_back})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Essays List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading essays...</p>
              </div>
            </div>
          ) : essays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No escalated essays found</p>
                <p className="text-muted-foreground text-sm">
                  {selectedStatus === 'all' 
                    ? 'There are no escalated essays at this time.'
                    : `There are no essays with status "${selectedStatus}"`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {essays.map((essay) => (
                <Card 
                  key={essay.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/founder-portal/${essay.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="text-xl font-semibold">{essay.essay_title}</h3>
                          {getStatusBadge(essay.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Student:</span>
                            <span>{essay.student_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">Email:</span>
                            <span>{essay.student_email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Word Count:</span>
                            <span>{essay.word_count}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Escalated:</span>
                            <span>{formatDate(essay.escalated_at)}</span>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/founder-portal/${essay.id}`);
                      }}>
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </FounderGuard>
  );
};

export default FounderPortal;

