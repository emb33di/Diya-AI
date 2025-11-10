/**
 * Utility functions for getting video URLs from Supabase Storage
 * Falls back to local paths in development
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'demos';
const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Get public URL for a video from Supabase Storage
 * Falls back to local path in development
 */
export function getVideoUrl(videoPath: string): string {
  // In development, use local paths
  if (!IS_PRODUCTION) {
    return `/Website Previews/${videoPath}`;
  }

  // In production, use Supabase Storage URLs
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(videoPath);

  return data.publicUrl;
}

/**
 * Video paths mapping
 * These should match the exact filenames in Supabase Storage (demos bucket)
 */
export const VIDEO_PATHS = {
  essaysWide: 'essays-wide.compressed.mp4',
  lorWide: 'lor-wide.mp4',
  counselorDemo: 'Counselor Demo.mp4',
  resumeWide: 'resume-wide.mp4',
} as const;

/**
 * Get video URL by key
 */
export function getVideoUrlByKey(key: keyof typeof VIDEO_PATHS): string {
  return getVideoUrl(VIDEO_PATHS[key]);
}

