import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types
interface EssayCheckpoint {
  id: string;
  essay_id: string;
  user_id: string;
  checkpoint_number: number;
  essay_content: string;
  essay_title?: string;
  essay_prompt?: string;
  ai_feedback_generated_at: string;
  ai_model: string;
  total_comments: number;
  overall_comments: number;
  inline_comments: number;
  opening_sentence_comments: number;
  transition_comments: number;
  paragraph_specific_comments: number;
  average_confidence_score: number;
  average_quality_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CheckpointRequest {
  action: 'list' | 'get' | 'compare' | 'restore';
  essayId: string;
  checkpointId?: string;
  checkpointNumber?: number;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { action, essayId, checkpointId, checkpointNumber }: CheckpointRequest = await req.json()

    // Validate required fields
    if (!action || !essayId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: action, essayId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract user ID from token (you might need to implement proper JWT parsing)
    const token = authHeader.replace('Bearer ', '')
    // For now, we'll get the user from the request or implement proper JWT parsing
    const userId = 'temp-user-id' // TODO: Implement proper user extraction

    switch (action) {
      case 'list':
        return await listCheckpoints(essayId, userId)
      
      case 'get':
        if (!checkpointId && !checkpointNumber) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'checkpointId or checkpointNumber required for get action'
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        return await getCheckpoint(essayId, userId, checkpointId, checkpointNumber)
      
      case 'compare':
        if (!checkpointId && !checkpointNumber) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'checkpointId or checkpointNumber required for compare action'
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        return await compareCheckpoints(essayId, userId, checkpointId, checkpointNumber)
      
      case 'restore':
        if (!checkpointId && !checkpointNumber) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'checkpointId or checkpointNumber required for restore action'
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        return await restoreCheckpoint(essayId, userId, checkpointId, checkpointNumber)
      
      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid action. Supported actions: list, get, compare, restore'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

  } catch (error) {
    console.error('Error in manage-essay-checkpoints:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function listCheckpoints(essayId: string, userId: string) {
  const { data: checkpoints, error } = await supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .order('checkpoint_number', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch checkpoints: ${error.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      checkpoints: checkpoints.map(cp => ({
        id: cp.id,
        checkpointNumber: cp.checkpoint_number,
        essayTitle: cp.essay_title,
        totalComments: cp.total_comments,
        overallComments: cp.overall_comments,
        inlineComments: cp.inline_comments,
        averageQualityScore: cp.average_quality_score,
        isActive: cp.is_active,
        createdAt: cp.created_at
      }))
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function getCheckpoint(essayId: string, userId: string, checkpointId?: string, checkpointNumber?: number) {
  let query = supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('essay_id', essayId)
    .eq('user_id', userId)

  if (checkpointId) {
    query = query.eq('id', checkpointId)
  } else if (checkpointNumber) {
    query = query.eq('checkpoint_number', checkpointNumber)
  }

  const { data: checkpoint, error } = await query.single()

  if (error) {
    throw new Error(`Failed to fetch checkpoint: ${error.message}`)
  }

  // Also fetch the comments for this checkpoint
  const { data: comments, error: commentsError } = await supabase
    .from('essay_comments')
    .select('*')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('ai_generated', true)
    .order('created_at', { ascending: true })

  if (commentsError) {
    console.warn('Failed to fetch comments:', commentsError.message)
  }

  return new Response(
    JSON.stringify({
      success: true,
      checkpoint: {
        id: checkpoint.id,
        checkpointNumber: checkpoint.checkpoint_number,
        essayContent: checkpoint.essay_content,
        essayTitle: checkpoint.essay_title,
        essayPrompt: checkpoint.essay_prompt,
        totalComments: checkpoint.total_comments,
        overallComments: checkpoint.overall_comments,
        inlineComments: checkpoint.inline_comments,
        openingSentenceComments: checkpoint.opening_sentence_comments,
        transitionComments: checkpoint.transition_comments,
        paragraphSpecificComments: checkpoint.paragraph_specific_comments,
        averageQualityScore: checkpoint.average_quality_score,
        averageConfidenceScore: checkpoint.average_confidence_score,
        isActive: checkpoint.is_active,
        createdAt: checkpoint.created_at
      },
      comments: comments || []
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function compareCheckpoints(essayId: string, userId: string, checkpointId?: string, checkpointNumber?: number) {
  // Get the specified checkpoint
  const checkpoint = await getCheckpointData(essayId, userId, checkpointId, checkpointNumber)
  
  // Get the active checkpoint for comparison
  const { data: activeCheckpoint, error: activeError } = await supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (activeError) {
    throw new Error(`Failed to fetch active checkpoint: ${activeError.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      comparison: {
        selected: {
          id: checkpoint.id,
          checkpointNumber: checkpoint.checkpoint_number,
          essayContent: checkpoint.essay_content,
          totalComments: checkpoint.total_comments,
          averageQualityScore: checkpoint.average_quality_score,
          createdAt: checkpoint.created_at
        },
        active: {
          id: activeCheckpoint.id,
          checkpointNumber: activeCheckpoint.checkpoint_number,
          essayContent: activeCheckpoint.essay_content,
          totalComments: activeCheckpoint.total_comments,
          averageQualityScore: activeCheckpoint.average_quality_score,
          createdAt: activeCheckpoint.created_at
        }
      }
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function restoreCheckpoint(essayId: string, userId: string, checkpointId?: string, checkpointNumber?: number) {
  const checkpoint = await getCheckpointData(essayId, userId, checkpointId, checkpointNumber)
  
  // Update the essay content in the essays table
  const { error: updateError } = await supabase
    .from('essays')
    .update({
      content: checkpoint.essay_content,
      title: checkpoint.essay_title,
      updated_at: new Date().toISOString()
    })
    .eq('id', essayId)
    .eq('user_id', userId)

  if (updateError) {
    throw new Error(`Failed to restore essay content: ${updateError.message}`)
  }

  // Make this checkpoint active
  await deactivatePreviousCheckpoints(essayId, userId)
  
  const { error: activateError } = await supabase
    .from('essay_checkpoints')
    .update({ is_active: true })
    .eq('id', checkpoint.id)

  if (activateError) {
    throw new Error(`Failed to activate checkpoint: ${activateError.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Checkpoint ${checkpoint.checkpoint_number} restored successfully`,
      checkpoint: {
        id: checkpoint.id,
        checkpointNumber: checkpoint.checkpoint_number,
        essayContent: checkpoint.essay_content,
        essayTitle: checkpoint.essay_title
      }
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function getCheckpointData(essayId: string, userId: string, checkpointId?: string, checkpointNumber?: number): Promise<EssayCheckpoint> {
  let query = supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('essay_id', essayId)
    .eq('user_id', userId)

  if (checkpointId) {
    query = query.eq('id', checkpointId)
  } else if (checkpointNumber) {
    query = query.eq('checkpoint_number', checkpointNumber)
  }

  const { data: checkpoint, error } = await query.single()

  if (error) {
    throw new Error(`Failed to fetch checkpoint: ${error.message}`)
  }

  return checkpoint
}

async function deactivatePreviousCheckpoints(essayId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('essay_checkpoints')
    .update({ is_active: false })
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to deactivate previous checkpoints: ${error.message}`)
  }
}
