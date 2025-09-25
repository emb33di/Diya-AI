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

    // Convert messages to the database format
    const messagesToInsert = transcriptData.messages.map((msg, index) => ({
      conversation_id: transcriptData.conversation_id,
      user_id: transcriptData.user_id,
      source: msg.source,
      text: msg.text,
      timestamp: new Date(msg.timestamp).toISOString(),
      message_order: index + 1
    }))

    // Insert messages into conversation_messages table
    const { error: messagesError } = await supabaseClient
      .from('conversation_messages')
      .insert(messagesToInsert)

    if (messagesError) {
      console.error('Error inserting messages:', messagesError)
      throw new Error(`Failed to insert messages: ${messagesError.message}`)
    }

    // Create transcript text
    const transcriptText = transcriptData.messages
      .map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`)
      .join('\n')

    // Upsert conversation metadata
    const { error: metadataError } = await supabaseClient
      .from('conversation_metadata')
      .upsert({
        conversation_id: transcriptData.conversation_id,
        user_id: transcriptData.user_id,
        summary: `Conversation completed with ${transcriptData.message_count} messages (${transcriptData.messages.filter(m => m.source === 'user').length} user, ${transcriptData.messages.filter(m => m.source === 'ai').length} AI)`,
        transcript: transcriptText,
        message_count: transcriptData.message_count,
        session_number: transcriptData.session_type === 'onboarding' ? 1 : 1
      })

    if (metadataError) {
      console.error('Error upserting metadata:', metadataError)
      throw new Error(`Failed to upsert metadata: ${metadataError.message}`)
    }

    console.log('✅ Transcript saved successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transcript saved successfully',
        messageCount: transcriptData.message_count
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
