// Re-export types and hook from AuthContext for backward compatibility
export type { UserProfile } from '@/contexts/AuthContext';
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
