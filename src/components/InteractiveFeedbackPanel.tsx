import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Star, 
  CheckCircle, 
  Clock,
  Target,
  TrendingUp,
  Lightbulb,
  Send,
  Heart,
  Flag,
  Bookmark,
  Share2
} from 'lucide-react';
import { ResumeFeedbackData } from '@/types/resume';

interface InteractiveFeedbackPanelProps {
  feedback: ResumeFeedbackData;
  resumeDataId: string;
}

interface UserFeedback {
  id: string;
  type: 'suggestion' | 'strength' | 'weakness';
  content: string;
  userRating: 'helpful' | 'not-helpful' | null;
  userComment: string;
  isBookmarked: boolean;
  isImplemented: boolean;
  timestamp: Date;
}

const InteractiveFeedbackPanel: React.FC<InteractiveFeedbackPanelProps> = ({ 
  feedback, 
  resumeDataId 
}) => {
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [selectedTab, setSelectedTab] = useState('suggestions');
  const [newComment, setNewComment] = useState('');
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

  const initializeFeedback = () => {
    if (userFeedback.length > 0) return;

    const feedbackItems: UserFeedback[] = [
      ...feedback.suggestions.map((suggestion, index) => ({
        id: `suggestion-${index}`,
        type: 'suggestion' as const,
        content: suggestion,
        userRating: null as const,
        userComment: '',
        isBookmarked: false,
        isImplemented: false,
        timestamp: new Date()
      })),
      ...feedback.strengths.map((strength, index) => ({
        id: `strength-${index}`,
        type: 'strength' as const,
        content: strength,
        userRating: null as const,
        userComment: '',
        isBookmarked: false,
        isImplemented: false,
        timestamp: new Date()
      })),
      ...feedback.weaknesses.map((weakness, index) => ({
        id: `weakness-${index}`,
        type: 'weakness' as const,
        content: weakness,
        userRating: null as const,
        userComment: '',
        isBookmarked: false,
        isImplemented: false,
        timestamp: new Date()
      }))
    ];

    setUserFeedback(feedbackItems);
  };

  React.useEffect(() => {
    initializeFeedback();
  }, [feedback]);

  const updateFeedback = (id: string, updates: Partial<UserFeedback>) => {
    setUserFeedback(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleRating = (id: string, rating: 'helpful' | 'not-helpful') => {
    updateFeedback(id, { userRating: rating });
  };

  const handleBookmark = (id: string) => {
    const item = userFeedback.find(f => f.id === id);
    if (item) {
      updateFeedback(id, { isBookmarked: !item.isBookmarked });
    }
  };

  const handleImplement = (id: string) => {
    const item = userFeedback.find(f => f.id === id);
    if (item) {
      updateFeedback(id, { isImplemented: !item.isImplemented });
    }
  };

  const handleComment = (id: string) => {
    if (commentingOn === id) {
      setCommentingOn(null);
      setNewComment('');
    } else {
      setCommentingOn(id);
      setNewComment('');
    }
  };

  const submitComment = (id: string) => {
    if (newComment.trim()) {
      updateFeedback(id, { userComment: newComment.trim() });
      setNewComment('');
      setCommentingOn(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-blue-600" />;
      case 'strength': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'weakness': return <Flag className="h-4 w-4 text-red-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'suggestion': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'strength': return 'bg-green-50 border-green-200 text-green-800';
      case 'weakness': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const renderFeedbackItem = (item: UserFeedback) => (
    <Card key={item.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getTypeIcon(item.type)}
              <Badge className={getTypeColor(item.type)}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Badge>
              {item.isImplemented && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Implemented
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBookmark(item.id)}
                className={item.isBookmarked ? 'text-yellow-600' : 'text-gray-400'}
              >
                <Bookmark className={`h-4 w-4 ${item.isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700">{item.content}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRating(item.id, 'helpful')}
                className={item.userRating === 'helpful' ? 'text-green-600 bg-green-50' : 'text-gray-500'}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRating(item.id, 'not-helpful')}
                className={item.userRating === 'not-helpful' ? 'text-red-600 bg-red-50' : 'text-gray-500'}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Not Helpful
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleComment(item.id)}
                className="text-blue-500"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Comment
              </Button>
            </div>
            
            {item.type === 'suggestion' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleImplement(item.id)}
                className={item.isImplemented ? 'bg-green-50 text-green-700 border-green-300' : ''}
              >
                {item.isImplemented ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Implemented
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-1" />
                    Mark as Done
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Comment Section */}
          {commentingOn === item.id && (
            <div className="space-y-2 pt-3 border-t">
              <Label htmlFor={`comment-${item.id}`}>Add a comment:</Label>
              <Textarea
                id={`comment-${item.id}`}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this feedback..."
                className="min-h-[80px]"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setCommentingOn(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => submitComment(item.id)}>
                  <Send className="h-4 w-4 mr-1" />
                  Submit
                </Button>
              </div>
            </div>
          )}

          {/* User Comment */}
          {item.userComment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">Your Comment:</p>
                  <p className="text-sm text-blue-700">{item.userComment}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderTabContent = (type: 'suggestion' | 'strength' | 'weakness') => {
    const items = userFeedback.filter(item => item.type === type);
    const implementedCount = items.filter(item => item.isImplemented).length;
    const helpfulCount = items.filter(item => item.userRating === 'helpful').length;
    const bookmarkedCount = items.filter(item => item.isBookmarked).length;

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{items.length}</div>
              <div className="text-sm text-blue-600">Total Items</div>
            </CardContent>
          </Card>
          
          {type === 'suggestion' && (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{implementedCount}</div>
                <div className="text-sm text-green-600">Implemented</div>
              </CardContent>
            </Card>
          )}
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{helpfulCount}</div>
              <div className="text-sm text-purple-600">Marked Helpful</div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {items.map(renderFeedbackItem)}
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No {type} items available.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderProgressOverview = () => {
    const totalSuggestions = userFeedback.filter(f => f.type === 'suggestion').length;
    const implementedSuggestions = userFeedback.filter(f => f.type === 'suggestion' && f.isImplemented).length;
    const totalHelpful = userFeedback.filter(f => f.userRating === 'helpful').length;
    const totalBookmarked = userFeedback.filter(f => f.isBookmarked).length;

    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Feedback Engagement Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{implementedSuggestions}</div>
                <div className="text-sm text-muted-foreground mb-3">Suggestions Implemented</div>
                <div className="text-xs text-muted-foreground">out of {totalSuggestions} total</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{totalHelpful}</div>
                <div className="text-sm text-muted-foreground mb-3">Helpful Ratings</div>
                <div className="text-xs text-muted-foreground">across all feedback</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">{totalBookmarked}</div>
                <div className="text-sm text-muted-foreground mb-3">Bookmarked Items</div>
                <div className="text-xs text-muted-foreground">for future reference</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {totalSuggestions > 0 ? Math.round((implementedSuggestions / totalSuggestions) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground mb-3">Implementation Rate</div>
                <Progress value={totalSuggestions > 0 ? (implementedSuggestions / totalSuggestions) * 100 : 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Interactive Feedback Panel</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Engage with AI feedback, rate suggestions, and track your progress
          </p>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions ({userFeedback.filter(f => f.type === 'suggestion').length})</TabsTrigger>
          <TabsTrigger value="strengths">Strengths ({userFeedback.filter(f => f.type === 'strength').length})</TabsTrigger>
          <TabsTrigger value="weaknesses">Weaknesses ({userFeedback.filter(f => f.type === 'weakness').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderProgressOverview()}
        </TabsContent>

        <TabsContent value="suggestions">
          {renderTabContent('suggestion')}
        </TabsContent>

        <TabsContent value="strengths">
          {renderTabContent('strength')}
        </TabsContent>

        <TabsContent value="weaknesses">
          {renderTabContent('weakness')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InteractiveFeedbackPanel;
