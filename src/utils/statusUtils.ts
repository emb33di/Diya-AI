/**
 * Utility functions for mapping status values to user-friendly labels
 */

/**
 * Maps essay draft status values to user-friendly labels
 */
export const getDraftStatusLabel = (status?: string): string => {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'draft':
      return 'In Progress';
    case 'review':
      return 'In Review';
    case 'final':
      return 'Complete';
    case 'submitted':
      return 'Submitted';
    default:
      return 'Not Started';
  }
};

/**
 * Maps application status values to user-friendly labels
 */
export const getApplicationStatusLabel = (status?: string): string => {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Complete';
    case 'overdue':
      return 'Overdue';
    default:
      return 'Not Started';
  }
};

/**
 * Gets the appropriate color classes for draft status badges
 */
export const getDraftStatusColor = (status?: string): string => {
  switch (status) {
    case 'not_started':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'draft':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'review':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'final':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'submitted':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

/**
 * Gets the appropriate color classes for application status badges
 */
export const getApplicationStatusColor = (status?: string): string => {
  switch (status) {
    case 'not_started':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'in_progress':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'overdue':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};
