import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle,
  FileText,
  Clock,
  Mail,
  CheckCircle,
  Send,
  Eye,
  User
} from 'lucide-react';
import FounderGuard from '@/components/FounderGuard';
import { EscalatedEssaysService, EscalatedEssayListItem, EscalatedEssayStatus } from '@/services/escalatedEssaysService';
import { useToast } from '@/hooks/use-toast';

const FounderStudentEssays: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allEssays, setAllEssays] = useState<EscalatedEssayListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<EscalatedEssayStatus | 'all'>('all');

  useEffect(() => {
    if (userId) {
      loadEssays();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadEssays = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      // Fetch once for the student; filter client-side by status to keep counts and identity stable
      const data = await EscalatedEssaysService.fetchEscalatedEssaysForStudent(userId);
      setAllEssays(data);
    } catch (error) {
      console.error('Error loading student essays:', error);
      toast({
        title: 'Error',
        description: 'Failed to load essays for this student. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const base = {
      pending: 0,
      in_review: 0,
      reviewed: 0,
      sent_back: 0,
      total: allEssays.length,
    };

    allEssays.forEach((essay) => {
      switch (essay.status) {
        case 'pending':
          base.pending += 1;
          break;
        case 'in_review':
          base.in_review += 1;
          break;
        case 'reviewed':
          base.reviewed += 1;
          break;
        case 'sent_back':
          base.sent_back += 1;
          break;
        default:
          break;
      }
    });

    return base;
  }, [allEssays]);

  const filteredEssays = useMemo(() => {
    if (selectedStatus === 'all') return allEssays;
    return allEssays.filter((essay) => essay.status === selectedStatus);
  }, [allEssays, selectedStatus]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const studentName = allEssays[0]?.student_name || 'Unknown Student';
  const studentEmail = allEssays[0]?.student_email || 'N/A';

  const formatStatusLabel = (status: EscalatedEssayStatus) =>
    status
      .replace('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <FounderGuard>
      <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => navigate('/founder-portal')}>
              ← Back to students
            </Button>
            <Badge variant="secondary">Class 12th</Badge>
          </div>

          <div className="mb-4">
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {studentName}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {studentEmail}
            </p>
          </div>

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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading essays...</p>
              </div>
            </div>
          ) : filteredEssays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No essays found</p>
                <p className="text-muted-foreground text-sm">
                  {selectedStatus === 'all' 
                    ? 'There are no escalated essays for this student.'
                    : `There are no essays with status "${selectedStatus}"`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEssays.map((essay) => (
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
                          <Badge variant="secondary" className="flex items-center gap-1">
                            {essay.status === 'pending' && <Clock className="h-3 w-3" />}
                            {essay.status === 'in_review' && <Eye className="h-3 w-3" />}
                            {essay.status === 'reviewed' && <CheckCircle className="h-3 w-3" />}
                            {essay.status === 'sent_back' && <Send className="h-3 w-3" />}
                            {formatStatusLabel(essay.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">Email:</span>
                            <span>{studentEmail}</span>
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

export default FounderStudentEssays;

