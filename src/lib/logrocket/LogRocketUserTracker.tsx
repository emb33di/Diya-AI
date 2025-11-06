import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, clearUser, isLogRocketReady } from "./init";

/**
 * Tracks user authentication state and identifies users in LogRocket
 * This component should be placed in App.tsx to automatically identify users
 * when they log in and clear identification when they log out.
 */
const LogRocketUserTracker = () => {
  useEffect(() => {
    if (!isLogRocketReady()) return;

    const setupAuthListener = async () => {
      // Get initial user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await identifyUserInLogRocket(user.id, user.email, user.user_metadata);
      }

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            await identifyUserInLogRocket(
              session.user.id,
              session.user.email,
              session.user.user_metadata
            );
          } else {
            clearUser();
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    const subscriptionPromise = setupAuthListener();

    return () => {
      subscriptionPromise.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  return null;
};

/**
 * Helper function to identify user in LogRocket with profile data
 */
const identifyUserInLogRocket = async (
  userId: string,
  email?: string,
  userMetadata?: any
) => {
  try {
    // Try to fetch user profile for additional context
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, email_address, user_tier")
      .eq("user_id", userId as any)
      .maybeSingle();

    // Build user data with proper type checking
    const userData: {
      email?: string;
      name?: string;
      user_tier?: string;
      [key: string]: any;
    } = {};

    if (profile && !profileError) {
      userData.email = email || (profile as any)?.email_address || undefined;
      userData.name = (profile as any)?.full_name || userMetadata?.full_name || undefined;
      userData.user_tier = (profile as any)?.user_tier || undefined;
    } else {
      // Fallback if profile fetch failed or profile doesn't exist
      userData.email = email;
      userData.name = userMetadata?.full_name;
    }

    identifyUser(userId, userData);
  } catch (error) {
    // Fallback to basic identification if profile fetch fails
    console.warn("Failed to fetch profile for LogRocket, using basic identification:", error);
    identifyUser(userId, {
      email: email,
      name: userMetadata?.full_name,
    });
  }
};

export default LogRocketUserTracker;
