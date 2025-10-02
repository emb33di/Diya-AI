import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscriptSaveData {
  conversation_id: string;
  user_id: string;
  messages: Array<{
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>;
  session_type?: 'onboarding' | 'brainstorming';
  message_count: number;
  total_length: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const transcriptData: TranscriptSaveData = await req.json()
    
    console.log('Saving transcript:', {
      conversationId: transcriptData.conversation_id,
      messageCount: transcriptData.message_count,
      sessionType: transcriptData.session_type
    })

    console.log('🔍 AI VOICE DEBUG - Edge Function Save Started:', {
      conversationId: transcriptData.conversation_id,
      messageCount: transcriptData.message_count,
      totalLength: transcriptData.total_length,
      sessionType: transcriptData.session_type,
      aiMessages: transcriptData.messages.filter(m => m.source === 'ai').length,
      userMessages: transcriptData.messages.filter(m => m.source === 'user').length,
      lastAIMessage: transcriptData.messages.filter(m => m.source === 'ai').slice(-1)[0],
      timestamp: new Date().toISOString()
    })

    // Convert messages to JSONB format for the new function
    const messagesJsonb = transcriptData.messages.map(msg => ({
      source: msg.source,
      text: msg.text,
      timestamp: new Date(msg.timestamp).toISOString()
    }))

    console.log('🔍 AI VOICE DEBUG - Messages to Save:', {
      totalMessages: messagesJsonb.length,
      aiMessages: messagesJsonb.filter(m => m.source === 'ai').length,
      userMessages: messagesJsonb.filter(m => m.source === 'user').length,
      lastAIMessage: messagesJsonb.filter(m => m.source === 'ai').slice(-1)[0],
      firstAIMessage: messagesJsonb.filter(m => m.source === 'ai')[0]
    })

    // Use the new one-conversation-per-user function
    const { data: saveResult, error: saveError } = await supabaseClient
      .rpc('save_user_conversation_transcript', {
        p_conversation_id: transcriptData.conversation_id,
        p_user_id: transcriptData.user_id,
        p_messages: messagesJsonb,
        p_session_type: transcriptData.session_type || 'onboarding'
      })

    if (saveError) {
      console.error('Error saving conversation transcript:', saveError)
      console.error('🔍 AI VOICE DEBUG - Save Function Failed:', {
        error: saveError.message,
        conversationId: transcriptData.conversation_id,
        messageCount: messagesJsonb.length
      })
      throw new Error(`Failed to save conversation transcript: ${saveError.message}`)
    }

    console.log('🔍 AI VOICE DEBUG - Save Function Success:', {
      conversationId: transcriptData.conversation_id,
      result: saveResult,
      messageCount: messagesJsonb.length,
      aiMessageCount: messagesJsonb.filter(m => m.source === 'ai').length,
      userMessageCount: messagesJsonb.filter(m => m.source === 'user').length
    })

    // Check if the save was successful
    if (!saveResult.success) {
      console.error('Save function returned failure:', saveResult)
      throw new Error(saveResult.error || 'Failed to save conversation transcript')
    }

    console.log('✅ Transcript saved successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transcript saved successfully',
        messageCount: transcriptData.message_count,
        overwritten: saveResult.overwritten || false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error saving transcript:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
