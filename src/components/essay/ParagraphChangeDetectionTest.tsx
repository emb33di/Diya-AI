import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AICommentService } from '@/services/aiCommentService';
import { useAuth } from '@/hooks/useAuth';

interface ParagraphChangeDetectionTestProps {
  essayId: string;
  essayContent: string;
  essayPrompt?: string;
}

export function ParagraphChangeDetectionTest({ 
  essayId, 
  essayContent, 
  essayPrompt 
}: ParagraphChangeDetectionTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { user } = useAuth();

  const testChangeDetection = async () => {
    if (!user) {
      alert('Please log in to test');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AICommentService.generateCommentsWithChangeDetection({
        essayId,
        essayContent,
        essayPrompt,
        userId: user.id
      });

      setResult(response);
      console.log('Change detection test result:', response);
    } catch (error) {
      console.error('Test failed:', error);
      alert(`Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Paragraph Change Detection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testChangeDetection} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test Change Detection'}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <p><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</p>
              <p><strong>Total Comments:</strong> {result.comments?.length || 0}</p>
              <p><strong>Message:</strong> {result.message}</p>
            </div>

            {result.paragraphAnalysis && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Paragraph Analysis:</h3>
                <p><strong>Total Paragraphs:</strong> {result.paragraphAnalysis.totalParagraphs}</p>
                <p><strong>Analyzed Paragraphs:</strong> {result.paragraphAnalysis.analyzedParagraphs}</p>
                <p><strong>Unchanged Paragraphs:</strong> {result.paragraphAnalysis.unchangedParagraphs}</p>
              </div>
            )}

            {result.comments && result.comments.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Comments Generated:</h3>
                {result.comments.map((comment: any, index: number) => (
                  <div key={index} className="p-3 bg-white border rounded-lg">
                    <p><strong>Type:</strong> {comment.isUnchangedParagraphFeedback ? 'Unchanged Paragraph Feedback' : 'Regular Comment'}</p>
                    <p><strong>Paragraph:</strong> {comment.paragraphIndex !== undefined ? comment.paragraphIndex + 1 : 'N/A'}</p>
                    <p><strong>Text:</strong> {comment.commentText}</p>
                    {comment.isUnchangedParagraphFeedback && (
                      <p><strong>Existing Comments:</strong> {comment.existingCommentCount || 0}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ParagraphChangeDetectionTest;
