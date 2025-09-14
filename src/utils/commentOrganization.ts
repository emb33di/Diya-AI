import { Comment } from '@/services/commentService';

export type CommentOrganizationCategory = 'overall-strength' | 'overall-weakness' | 'inline';

export interface OrganizedComments {
  'overall-strength': Comment[];
  'overall-weakness': Comment[];
  'inline': Comment[];
}

export interface CommentOrganizationOptions {
  sortChronologically?: boolean;
  groupByCategory?: boolean;
  showResolved?: boolean;
}

/**
 * Organizes comments into the specified categories based on their organization_category field
 * and sorts them chronologically within each category
 */
export function organizeComments(
  comments: Comment[], 
  options: CommentOrganizationOptions = {}
): OrganizedComments {
  const {
    sortChronologically = true,
    groupByCategory = true,
    showResolved = false
  } = options;

  // Filter out resolved comments if not showing them
  let filteredComments = comments;
  if (!showResolved) {
    filteredComments = comments.filter(comment => !comment.resolved);
  }

  // Initialize organized structure
  const organized: OrganizedComments = {
    'overall-strength': [],
    'overall-weakness': [],
    'inline': []
  };

  // Group comments by organization category
  filteredComments.forEach(comment => {
    const category = comment.organization_category || 'inline';
    if (category in organized) {
      organized[category as CommentOrganizationCategory].push(comment);
    } else {
      // Fallback to inline for unknown categories
      organized.inline.push(comment);
    }
  });

  // Sort each category chronologically if requested
  if (sortChronologically) {
    Object.keys(organized).forEach(category => {
      organized[category as CommentOrganizationCategory].sort((a, b) => {
        // Use chronological_position if available, otherwise fallback to text selection position
        const posA = a.chronological_position ?? getTextSelectionPosition(a);
        const posB = b.chronological_position ?? getTextSelectionPosition(b);
        return posA - posB;
      });
    });
  }

  return organized;
}

/**
 * Gets the chronological position of a comment based on its text selection
 */
function getTextSelectionPosition(comment: Comment): number {
  if (comment.text_selection?.start?.pos !== undefined) {
    return comment.text_selection.start.pos;
  }
  
  // Fallback to paragraph index if available
  if (comment.paragraph_index !== undefined && comment.paragraph_index !== null) {
    return comment.paragraph_index * 1000; // Approximate position
  }
  
  // Default to 0 for overall comments
  return 0;
}

/**
 * Gets a flat list of comments organized chronologically across all categories
 */
export function getChronologicalComments(comments: Comment[]): Comment[] {
  return comments
    .filter(comment => !comment.resolved)
    .sort((a, b) => {
      const posA = a.chronological_position ?? getTextSelectionPosition(a);
      const posB = b.chronological_position ?? getTextSelectionPosition(b);
      return posA - posB;
    });
}


/**
 * Gets the display label for a comment organization category
 */
export function getCategoryLabel(category: CommentOrganizationCategory): string {
  const labels: Record<CommentOrganizationCategory, string> = {
    'overall-strength': 'Strength',
    'overall-weakness': 'Area for improvement', 
    'inline': 'Paragraph Structure'
  };
  return labels[category];
}


/**
 * Gets the icon for a comment organization category
 */
export function getCategoryIcon(category: CommentOrganizationCategory): string {
  const icons: Record<CommentOrganizationCategory, string> = {
    'overall-strength': 'ThumbsUp',
    'overall-weakness': 'AlertTriangle',
    'overall-combined': 'Star',
    'inline': 'MessageSquare'
  };
  return icons[category];
}

/**
 * Gets the color class for a comment organization category
 */
export function getCategoryColorClass(category: CommentOrganizationCategory): string {
  const colors: Record<CommentOrganizationCategory, string> = {
    'overall-strength': 'text-green-600 bg-green-50 border-green-200',
    'overall-weakness': 'text-red-600 bg-red-50 border-red-200',
    'overall-combined': 'text-blue-600 bg-blue-50 border-blue-200',
    'inline': 'text-gray-600 bg-gray-50 border-gray-200'
  };
  return colors[category];
}

/**
 * Determines if a comment should be displayed in a specific category
 */
export function shouldShowInCategory(
  comment: Comment, 
  category: CommentOrganizationCategory
): boolean {
  const commentCategory = comment.organization_category || 'inline';
  return commentCategory === category;
}

/**
 * Gets the total count of comments in each organization category
 */
export function getCommentCounts(comments: Comment[]): Record<CommentOrganizationCategory, number> {
  const organized = organizeComments(comments, { showResolved: true });
  return {
    'overall-strength': organized['overall-strength'].length,
    'overall-weakness': organized['overall-weakness'].length,
    'overall-combined': organized['overall-combined'].length,
    'inline': organized.inline.length
  };
}
