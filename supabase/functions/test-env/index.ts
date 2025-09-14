import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check environment variables
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const envStatus = {
      GOOGLE_API_KEY: googleApiKey ? 'SET' : 'NOT SET',
      SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET',
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(envStatus),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
