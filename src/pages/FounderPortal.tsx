/**
 * Founder Portal - Escalated Essays Dashboard
 * 
 * Lists all escalated essays for founder review
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  Mail,
  AlertCircle,
  CheckCircle,
  Send,
  Eye
} from 'lucide-react';
import { EscalatedEssaysService, StudentWithEscalations } from '@/services/escalatedEssaysService';
import { useToast } from '@/hooks/use-toast';
import FounderGuard from '@/components/FounderGuard';

const FounderPortal: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithEscalations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await EscalatedEssaysService.fetchStudentsWithEscalations();
      setStudents(data);
    } catch (error) {
      console.error('Error loading students with escalations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load escalated students. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
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
            <p className="text-muted-foreground">Review students with escalated essays</p>
          </div>

          {/* Students List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading students...</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No students with escalated essays found</p>
                <p className="text-muted-foreground text-sm">
                  There are no escalations at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <Card 
                  key={student.user_id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/founder-portal/student/${student.user_id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <User className="h-5 w-5 text-primary" />
                          <h3 className="text-xl font-semibold">{student.student_name || 'Unknown Student'}</h3>
                          <Badge variant="secondary">Class 12th</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">Email:</span>
                            <span>{student.student_email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Latest escalation:</span>
                            <span>{formatDate(student.latest_escalation_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Send className="h-4 w-4" />
                            <span className="font-medium">Total essays:</span>
                            <span>{student.total_essays}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="default" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending: {student.pending_count}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            In Review: {student.in_review_count}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Reviewed: {student.reviewed_count}
                          </Badge>
                          <Badge variant="default" className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            Sent Back: {student.sent_back_count}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/founder-portal/student/${student.user_id}`);
                        }}
                      >
                        View essays
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

