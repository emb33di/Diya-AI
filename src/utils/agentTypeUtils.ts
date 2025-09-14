import { Comment } from '@/services/commentService';

export type AgentType = 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths' | 'reconciliation' | 'tone' | 'clarity' | 'grammar_spelling';

export type AgentFilterType = 'all' | 'tone' | 'grammar' | 'clarity' | 'strengths' | 'areas-for-improvement';

/**
 * Gets the display label for an agent type
 */
export function getAgentTypeLabel(agentType?: AgentType): string {
  const labels: Record<AgentType, string> = {
    'big-picture': 'Strength',
    'paragraph': 'Paragraph Structure',
    'weaknesses': 'Area for improvement',
    'strengths': 'Strength',
    'reconciliation': 'Strength',
    'tone': 'Tone',
    'clarity': 'Clarity',
    'grammar_spelling': 'Grammar'
  };
  
  return agentType ? labels[agentType] : 'Unknown';
}

/**
 * Gets the display label for a filter type
 */
export function getFilterTypeLabel(filterType: AgentFilterType): string {
  const labels: Record<AgentFilterType, string> = {
    'all': 'All Comments',
    'tone': 'Tone',
    'grammar': 'Grammar',
    'clarity': 'Clarity',
    'strengths': 'Strengths',
    'areas-for-improvement': 'Areas for improvement'
  };
  
  return labels[filterType];
}

/**
 * Gets the color classes for an agent type
 */
export function getAgentTypeColorClasses(agentType?: AgentType): string {
  const colors: Record<AgentType, string> = {
    'big-picture': 'text-blue-600 bg-blue-50 border-blue-200',
    'paragraph': 'text-purple-600 bg-purple-50 border-purple-200',
    'weaknesses': 'text-red-600 bg-red-50 border-red-200',
    'strengths': 'text-green-600 bg-green-50 border-green-200',
    'reconciliation': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'tone': 'text-orange-600 bg-orange-50 border-orange-200',
    'clarity': 'text-cyan-600 bg-cyan-50 border-cyan-200',
    'grammar_spelling': 'text-pink-600 bg-pink-50 border-pink-200'
  };
  
  return agentType ? colors[agentType] : 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Gets the icon for an agent type
 */
export function getAgentTypeIcon(agentType?: AgentType): string {
  const icons: Record<AgentType, string> = {
    'big-picture': 'Target',
    'paragraph': 'FileText',
    'weaknesses': 'AlertTriangle',
    'strengths': 'ThumbsUp',
    'reconciliation': 'Star',
    'tone': 'Quote',
    'clarity': 'Eye',
    'grammar_spelling': 'Edit3'
  };
  
  return agentType ? icons[agentType] : 'MessageSquare';
}

/**
 * Determines which filter category a comment belongs to
 */
export function getCommentFilterCategory(comment: Comment): AgentFilterType {
  // Handle specialized agents (new agents)
  if (comment.agent_type === 'tone') return 'tone';
  if (comment.agent_type === 'clarity') return 'clarity';
  if (comment.agent_type === 'grammar_spelling') return 'grammar';
  
  // Handle strengths and weaknesses
  if (comment.agent_type === 'strengths' || comment.agent_type === 'reconciliation') {
    // Check if it's a strength or weakness based on reconciliation metadata
    if (comment.reconciliation_type === 'strength-enhanced' || comment.original_source === 'strength') {
      return 'strengths';
    } else if (comment.reconciliation_type === 'weakness-enhanced' || comment.original_source === 'weakness') {
      return 'areas-for-improvement';
    } else {
      return 'strengths'; // Default reconciliation to strength
    }
  }
  
  if (comment.agent_type === 'weaknesses') return 'areas-for-improvement';
  
  // Handle big-picture comments - categorize based on content and comment type
  if (comment.agent_type === 'big-picture') {
    // Check comment type first
    if (comment.comment_type === 'praise') {
      return 'strengths';
    } else if (comment.comment_type === 'critique' || comment.comment_type === 'suggestion') {
      return 'areas-for-improvement';
    }
    
    // Check comment subcategory for more specific categorization
    if (comment.comment_subcategory === 'opening' || comment.comment_subcategory === 'conclusion') {
      // Opening/conclusion comments are often about tone and clarity
      return 'clarity';
    }
    
    // Default big-picture to areas for improvement
    return 'areas-for-improvement';
  }
  
  // Handle paragraph comments - these could be either strengths or areas for improvement
  if (comment.agent_type === 'paragraph' || comment.comment_category === 'inline') {
    // Check comment subcategory for specialized categorization
    if (comment.comment_subcategory === 'opening-sentence') {
      return 'clarity'; // Opening sentences are about clarity and impact
    } else if (comment.comment_subcategory === 'transition') {
      return 'clarity'; // Transitions are about flow and clarity
    } else if (comment.comment_subcategory === 'paragraph-quality') {
      return 'clarity'; // Paragraph quality is about clarity and structure
    }
    
    // Check comment type to determine if it's a strength or area for improvement
    if (comment.comment_type === 'praise') {
      return 'strengths';
    } else if (comment.comment_type === 'critique' || comment.comment_type === 'suggestion') {
      return 'areas-for-improvement';
    } else {
      return 'areas-for-improvement'; // Default paragraph comments to areas for improvement
    }
  }
  
  // Default fallback - categorize based on comment type
  if (comment.comment_type === 'praise') {
    return 'strengths';
  } else if (comment.comment_type === 'critique' || comment.comment_type === 'suggestion') {
    return 'areas-for-improvement';
  } else {
    return 'areas-for-improvement'; // Default to areas for improvement
  }
}

/**
 * Filters comments by agent filter type
 */
export function filterCommentsByAgentType(comments: Comment[], filterType: AgentFilterType): Comment[] {
  if (filterType === 'all') return comments;
  
  return comments.filter(comment => {
    const commentCategory = getCommentFilterCategory(comment);
    return commentCategory === filterType;
  });
}

/**
 * Gets the count of comments for each filter type
 */
export function getCommentCountsByFilter(comments: Comment[]): Record<AgentFilterType, number> {
  const counts: Record<AgentFilterType, number> = {
    'all': comments.length,
    'tone': 0,
    'grammar': 0,
    'clarity': 0,
    'strengths': 0,
    'areas-for-improvement': 0
  };
  
  comments.forEach(comment => {
    const category = getCommentFilterCategory(comment);
    counts[category]++;
  });
  
  return counts;
}
