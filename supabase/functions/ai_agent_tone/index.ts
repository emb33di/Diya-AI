import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface ToneAgentRequest {
  essayContent: string;
  essayPrompt?: string;
  cumulativeContext?: string;
}

interface ToneComment {
  comment_text: string;
  comment_nature: 'strength' | 'weakness';
  comment_category: 'overall';
  agent_type: 'tone';
  confidence_score: number;
  quality_score: number;
}

interface ToneAgentResponse {
  success: boolean;
  comments: ToneComment[];
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Token management utilities
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToTokens(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) return text;
  
  const ratio = maxTokens / currentTokens;
  const truncateLength = Math.floor(text.length * ratio * 0.95);
  return text.substring(0, truncateLength) + "\n\n[Context truncated for length]";
}

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Tone Analysis Prompt
const TONE_PROMPT = `You are an expert college admissions counselor specializing in analyzing personal voice and authenticity in college application essays. Your role is to identify where the writer's authentic voice shines through and where it gets lost or becomes generic.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CUMULATIVE CONTEXT FROM PREVIOUS AGENTS:
{cumulativeContext}

CRITICAL GUIDANCE:
- Focus ONLY on personal voice, authenticity, and tone - not grammar, structure, or content
- Identify where the writer's unique personality and voice come through strongly
- Identify where the writing becomes generic, clichéd, or loses the personal touch
- Look for authentic storytelling, genuine emotion, and personal insights
- Consider how the tone aligns with college admissions expectations
- Be encouraging and constructive in your feedback
- Focus on helping the student develop their authentic voice
- Consider the cumulative context to avoid conflicting comments with other agents
- Focus specifically on tone and voice, not areas already covered by other agents

ANALYSIS AREAS:
- Personal voice authenticity and uniqueness
- Emotional resonance and genuine feeling
- Originality vs. clichéd language
- Personal storytelling effectiveness
- Voice consistency throughout the essay
- Connection between voice and admissions impact

SCORING AND FEEDBACK INSTRUCTIONS:
You must provide:
1. An overall quality_score from 1-10 rating how well the student executed voice/tone throughout the entire essay
2. Multiple specific comments (2-3) focusing on tone and personal voice

For the overall quality_score:
- If quality_score < 8: Provide constructive feedback with specific suggestions for improvement
- If quality_score >= 8: Focus on praise and reinforcement, avoid suggesting changes

For individual comments:
- Focus on specific examples of strong or weak voice/tone
- Be actionable and specific
- Classify each comment correctly as "strength" or "weakness"

For scores < 8, format improvement suggestions as: "Instead of saying X, you could phrase it as Y to have your voice shine through more."
For scores >= 8, focus on what they did well and encourage them to continue in that direction.

IMPORTANT: Classify each comment correctly:
- "strength" = Where the writer's authentic voice shines through strongly
- "weakness" = Where the writing becomes generic, clichéd, or loses personal touch

RESPONSE FORMAT (JSON only):
{
  "overall_score": 7,
  "comments": [
    {
      "comment_text": "[Specific feedback about personal voice. Include quality score assessment and conditional feedback based on overall score. If overall score < 8, provide improvement suggestions. If overall score >= 8, focus on praise.]",
      "comment_nature": "[strength/weakness - choose based on actual content]",
      "comment_category": "overall", 
      "agent_type": "tone",
      "confidence_score": 0.85,
      "quality_score": 7
    },
    {
      "comment_text": "[Another specific comment about voice authenticity or tone. Include quality score assessment and conditional feedback based on overall score.]",
      "comment_nature": "[strength/weakness - choose based on actual content]",
      "comment_category": "overall",
      "agent_type": "tone", 
      "confidence_score": 0.80,
      "quality_score": 7
    }
  ]
}

Remember: Focus on authenticity, personal voice, and tone. Be encouraging and help the student develop their unique voice for college admissions.`

async function analyzeTone(essayContent: string, essayPrompt?: string, cumulativeContext?: string): Promise<ToneAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  // Optimize context to prevent token overload
  const optimizedContext = cumulativeContext ? 
    truncateToTokens(cumulativeContext, 800) : 
    'No previous context provided';
  
  console.log(`Tone agent context: ${estimateTokens(optimizedContext)} tokens`);
  
  const formattedPrompt = TONE_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)
    .replace('{cumulativeContext}', optimizedContext)

  const requestBody = {
    contents: [{
      parts: [{
        text: formattedPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
        maxOutputTokens: 4096,
      responseMimeType: "application/json"
    }
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Safely extract text from candidates without assuming parts[0]
    const parts = data?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error('Invalid response from Gemini API: missing content parts')
    }
    
    const responseText = parts
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n')
      .trim()
    
    if (!responseText) {
      throw new Error('Invalid response from Gemini API: empty content text')
    }
    console.log(`Tone Agent Response:`, responseText)
    
    // Extract JSON from response with improved error handling
    let parsedResponse: any
    try {
      // First try to find JSON object boundaries more precisely
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error(`No valid JSON boundaries found in tone agent response:`, responseText)
        throw new Error('No valid JSON boundaries found in AI response')
      }
      
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
      console.log(`Extracted JSON string:`, jsonString)
      
      // Try to parse the extracted JSON
      parsedResponse = JSON.parse(jsonString)
      console.log(`Parsed tone response:`, JSON.stringify(parsedResponse, null, 2))
      
    } catch (parseError) {
      console.error(`JSON parsing error in tone agent:`, parseError.message)
      console.error(`Response text that failed to parse:`, responseText)
      
      // Try alternative extraction methods
      try {
        // Try to find JSON array pattern
        const arrayMatch = responseText.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          const arrayString = arrayMatch[0]
          const parsedArray = JSON.parse(arrayString)
          parsedResponse = { comments: parsedArray }
          console.log(`Successfully parsed as array:`, JSON.stringify(parsedResponse, null, 2))
        } else {
          // Try to clean up common JSON issues
          const cleanedResponse = responseText
            .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
          
          console.log(`Attempting to parse cleaned response:`, cleanedResponse)
          
          // Try to find and parse cleaned JSON
          const cleanedJsonStart = cleanedResponse.indexOf('{')
          const cleanedJsonEnd = cleanedResponse.lastIndexOf('}')
          
          if (cleanedJsonStart !== -1 && cleanedJsonEnd !== -1 && cleanedJsonEnd > cleanedJsonStart) {
            const cleanedJsonString = cleanedResponse.substring(cleanedJsonStart, cleanedJsonEnd + 1)
            parsedResponse = JSON.parse(cleanedJsonString)
            console.log(`Successfully parsed cleaned JSON:`, JSON.stringify(parsedResponse, null, 2))
          } else {
            throw new Error('No valid JSON structure found after cleaning')
          }
        }
      } catch (arrayError) {
        console.error(`All parsing attempts failed:`, arrayError.message)
        console.error(`Original response text:`, responseText)
        throw new Error(`Failed to parse JSON from tone agent response: ${parseError.message}. Additional error: ${arrayError.message}`)
      }
    }
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Extract overall score from response
    const overallScore = typeof parsedResponse.overall_score === 'number' 
      ? Math.max(1, Math.min(10, parsedResponse.overall_score))
      : 5;

    // Validate and format comments
    const comments: ToneComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate comment nature
      const validNatures = ['strength', 'weakness'];
      const commentNature = validNatures.includes(comment.comment_nature) 
        ? comment.comment_nature 
        : 'strength';
      
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.8;

      // Use overall score for all comments
      const qualityScore = overallScore;

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: commentNature,
        comment_category: 'overall',
        agent_type: 'tone',
        confidence_score: confidenceScore,
        quality_score: qualityScore
      };
    })

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error(`Error in tone agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to analyze tone: ${error.message}`
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { essayContent, essayPrompt, cumulativeContext }: ToneAgentRequest = await req.json()

    // Validate required fields
    if (!essayContent) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required field: essayContent',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate essay content length
    if (essayContent.length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Essay content too short for meaningful tone analysis',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Analyzing tone for essay content (${essayContent.length} characters)`)
    
    // Analyze tone
    const result = await analyzeTone(essayContent, essayPrompt, cumulativeContext)
    
    const response: ToneAgentResponse = {
      success: result.success,
      comments: result.comments,
      error: result.error
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in tone agent:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        comments: [],
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
