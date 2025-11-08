/**
 * Notify Ivy Readiness Usage Edge Function
 * 
 * Optional analytics endpoint for tracking Ivy Readiness Report feature usage.
 * This is a non-blocking analytics function - failures are gracefully handled.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

interface UsageData {
  timestamp: string;
  userAgent?: string;
  referrer?: string;
  schoolName?: string | null;
  hasPrompt?: boolean;
}

serve(async (req) => {
  console.log('[IVY_READINESS_USAGE] ===== Edge Function Invoked =====');
  console.log('[IVY_READINESS_USAGE] Request method:', req.method);
  console.log('[IVY_READINESS_USAGE] Request URL:', req.url);

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('[IVY_READINESS_USAGE] Handling CORS preflight request');
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      console.error('[IVY_READINESS_USAGE] Invalid method:', req.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    console.log('[IVY_READINESS_USAGE] Parsing request body...');
    let usageData: UsageData;
    try {
      usageData = await req.json();
    } catch (error) {
      console.error('[IVY_READINESS_USAGE] Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    console.log('[IVY_READINESS_USAGE] Usage data:', {
      timestamp: usageData.timestamp,
      hasUserAgent: !!usageData.userAgent,
      hasReferrer: !!usageData.referrer,
      schoolName: usageData.schoolName,
      hasPrompt: usageData.hasPrompt
    });

    // Optional: Store usage data in a table if you want to track analytics
    // For now, we'll just log it and return success
    // You can add database logging here if needed:
    /*
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase
      .from('ivy_readiness_usage_logs')
      .insert({
        timestamp: usageData.timestamp,
        user_agent: usageData.userAgent,
        referrer: usageData.referrer,
        school_name: usageData.schoolName,
        has_prompt: usageData.hasPrompt
      });

    if (insertError) {
      console.error('[IVY_READINESS_USAGE] Failed to log usage:', insertError);
      // Don't fail the request - this is optional analytics
    }
    */

    console.log('[IVY_READINESS_USAGE] ===== Function completed successfully =====');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Usage logged successfully'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    });

  } catch (error) {
    console.error('[IVY_READINESS_USAGE] Unexpected error:', error);
    // Return success even on error - this is optional analytics
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200, // Return 200 to not break the client
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    });
  }
});

