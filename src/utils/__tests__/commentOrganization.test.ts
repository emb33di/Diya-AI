import { 
  organizeComments, 
  getChronologicalComments, 
  getCategoryLabel,
  getCategoryColorClass,
  getCommentCounts,
  CommentOrganizationCategory
} from '../commentOrganization';
import { Comment } from '@/services/commentService';

// Mock comment data for testing
const mockComments: Comment[] = [
  {
    id: '1',
    essay_id: 'essay-1',
    user_id: 'user-1',
    text_selection: { start: { pos: 0, path: [0] }, end: { pos: 10, path: [0] } },
    anchor_text: 'Opening sentence',
    comment_text: 'Great opening that captures attention',
    comment_type: 'praise',
    ai_generated: true,
    ai_model: 'gemini',
    confidence_score: 0.9,
    resolved: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    comment_category: 'overall',
    comment_subcategory: 'opening',
    agent_type: 'strengths',
    comment_nature: 'strength',
    organization_category: 'overall-strength',
    reconciliation_source: 'strength',
    chronological_position: 0
  },
  {
    id: '2',
    essay_id: 'essay-1',
    user_id: 'user-1',
    text_selection: { start: { pos: 50, path: [0] }, end: { pos: 60, path: [0] } },
    anchor_text: 'Weak transition',
    comment_text: 'This transition could be smoother',
    comment_type: 'suggestion',
    ai_generated: true,
    ai_model: 'gemini',
    confidence_score: 0.8,
    resolved: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    comment_category: 'inline',
    comment_subcategory: 'transition',
    agent_type: 'weaknesses',
    comment_nature: 'weakness',
    organization_category: 'inline',
    reconciliation_source: 'weakness',
    chronological_position: 50
  },
  {
    id: '3',
    essay_id: 'essay-1',
    user_id: 'user-1',
    text_selection: { start: { pos: 100, path: [0] }, end: { pos: 110, path: [0] } },
    anchor_text: 'Balanced analysis',
    comment_text: 'While the content is strong, the structure could be improved',
    comment_type: 'suggestion',
    ai_generated: true,
    ai_model: 'gemini',
    confidence_score: 0.85,
    resolved: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    comment_category: 'overall',
    comment_subcategory: 'body',
    agent_type: 'reconciliation',
    comment_nature: 'combined',
    organization_category: 'overall-combined',
    reconciliation_source: 'both',
    chronological_position: 100
  },
  {
    id: '4',
    essay_id: 'essay-1',
    user_id: 'user-1',
    text_selection: { start: { pos: 200, path: [0] }, end: { pos: 210, path: [0] } },
    anchor_text: 'Another weakness',
    comment_text: 'This paragraph lacks detail',
    comment_type: 'critique',
    ai_generated: true,
    ai_model: 'gemini',
    confidence_score: 0.7,
    resolved: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    comment_category: 'overall',
    comment_subcategory: 'body',
    agent_type: 'weaknesses',
    comment_nature: 'weakness',
    organization_category: 'overall-weakness',
    reconciliation_source: 'weakness',
    chronological_position: 200
  }
];

describe('commentOrganization', () => {
  describe('organizeComments', () => {
    it('should organize comments by category correctly', () => {
      const organized = organizeComments(mockComments);
      
      expect(organized['overall-strength']).toHaveLength(1);
      expect(organized['overall-weakness']).toHaveLength(1);
      expect(organized['overall-combined']).toHaveLength(1);
      expect(organized['inline']).toHaveLength(1);
      
      expect(organized['overall-strength'][0].id).toBe('1');
      expect(organized['overall-weakness'][0].id).toBe('4');
      expect(organized['overall-combined'][0].id).toBe('3');
      expect(organized['inline'][0].id).toBe('2');
    });

    it('should sort comments chronologically within categories', () => {
      const organized = organizeComments(mockComments);
      
      // Check that comments are sorted by chronological_position
      expect(organized['overall-strength'][0].chronological_position).toBe(0);
      expect(organized['inline'][0].chronological_position).toBe(50);
      expect(organized['overall-combined'][0].chronological_position).toBe(100);
      expect(organized['overall-weakness'][0].chronological_position).toBe(200);
    });

    it('should filter out resolved comments when showResolved is false', () => {
      const commentsWithResolved = [
        ...mockComments,
        {
          ...mockComments[0],
          id: '5',
          resolved: true,
          comment_text: 'This is resolved'
        }
      ];
      
      const organized = organizeComments(commentsWithResolved, { showResolved: false });
      const totalComments = Object.values(organized).flat().length;
      
      expect(totalComments).toBe(4); // Should exclude the resolved comment
    });
  });

  describe('getChronologicalComments', () => {
    it('should return comments sorted chronologically', () => {
      const chronological = getChronologicalComments(mockComments);
      
      expect(chronological[0].id).toBe('1'); // position 0
      expect(chronological[1].id).toBe('2'); // position 50
      expect(chronological[2].id).toBe('3'); // position 100
      expect(chronological[3].id).toBe('4'); // position 200
    });
  });


  describe('getCategoryLabel', () => {
    it('should return correct labels for each category', () => {
      expect(getCategoryLabel('overall-strength')).toBe('Strength');
      expect(getCategoryLabel('overall-weakness')).toBe('Area for improvement');
      expect(getCategoryLabel('inline')).toBe('Paragraph Structure');
    });
  });


  describe('getCategoryColorClass', () => {
    it('should return correct color classes for each category', () => {
      expect(getCategoryColorClass('overall-strength')).toContain('green');
      expect(getCategoryColorClass('overall-weakness')).toContain('red');
      expect(getCategoryColorClass('inline')).toContain('gray');
    });
  });

  describe('getCommentCounts', () => {
    it('should return correct counts for each category', () => {
      const counts = getCommentCounts(mockComments);
      
      expect(counts['overall-strength']).toBe(1);
      expect(counts['overall-weakness']).toBe(1);
      expect(counts['inline']).toBe(1);
    });
  });
});
