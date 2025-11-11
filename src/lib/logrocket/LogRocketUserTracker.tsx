import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { initLogRocket, identifyUser, clearUser, isLogRocketReady } from "./init";

/**
 * Tracks user authentication state and initializes/identifies users in LogRocket
 * This component should be placed in App.tsx to automatically initialize LogRocket
 * only when users are authenticated, preventing recording on public pages.
 * 
 * Uses AuthContext to avoid creating duplicate auth listeners.
 */
const LogRocketUserTracker = () => {
  const { user, profile } = useAuthContext();

  useEffect(() => {
    // Initialize LogRocket only if user is authenticated
    if (user) {
      // Initialize LogRocket if not already initialized
      if (!isLogRocketReady()) {
        initLogRocket();
      }
      // Identify user after initialization (initLogRocket is synchronous)
      if (isLogRocketReady()) {
        identifyUserInLogRocket(
          user.id,
          user.email,
          user.user_metadata,
          profile
        );
      }
    } else {
      // User logged out - clear identification
      // Note: LogRocket will continue recording for the current session,
      // but new sessions won't be initialized until user logs in again
      clearUser();
    }
  }, [user?.id, user?.email, profile?.id]);

  return null;
};

/**
 * Helper function to identify user in LogRocket with profile data
 * Uses profile from AuthContext to avoid redundant database queries
 */
const identifyUserInLogRocket = (
  userId: string,
  email?: string,
  userMetadata?: any,
  profile?: any
) => {
  try {
    // Build user data with proper type checking
    const userData: {
      email?: string;
      name?: string;
      user_tier?: string;
      [key: string]: any;
    } = {};

    if (profile) {
      userData.email = email || profile.email_address || undefined;
      userData.name = profile.full_name || userMetadata?.full_name || undefined;
      userData.user_tier = profile.user_tier || undefined;
    } else {
      // Fallback if profile doesn't exist
      userData.email = email;
      userData.name = userMetadata?.full_name;
    }

    identifyUser(userId, userData);
  } catch (error) {
    // Fallback to basic identification if identification fails
    console.warn("Failed to identify user in LogRocket, using basic identification:", error);
    identifyUser(userId, {
      email: email,
      name: userMetadata?.full_name,
    });
  }
};

export default LogRocketUserTracker;
