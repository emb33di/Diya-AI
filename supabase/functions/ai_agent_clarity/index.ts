import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface ClarityAgentRequest {
  essayContent: string;
  essayPrompt?: string;
  cumulativeContext?: string;
}

interface ClarityComment {
  comment_text: string;
  comment_nature: 'weakness';
  comment_category: 'inline';
  agent_type: 'clarity';
  text_selection: {
    start: number;
    end: number;
  };
  confidence_score: number;
  quality_score: number;
}

interface ClarityAgentResponse {
  success: boolean;
  comments: ClarityComment[];
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

// Clarity Analysis Prompt
const CLARITY_PROMPT = `You are an expert writing consultant specializing in clarity and conciseness. Your role is to identify run-on sentences, jargon, unnecessary words, and unclear phrasing that makes writing less precise and harder to read.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CUMULATIVE CONTEXT FROM PREVIOUS AGENTS:
{cumulativeContext}

CRITICAL GUIDANCE:
- Focus ONLY on clarity, conciseness, and precision - NOT grammar, spelling, or punctuation
- Identify run-on sentences that should be broken up
- Find jargon, overly complex words, or unnecessary phrases
- Look for wordy constructions that can be simplified
- Identify unclear or ambiguous phrasing
- Suggest more precise and direct language
- Do NOT comment on grammar, spelling, or punctuation errors
- Do NOT comment on content, structure, or style choices
- Be specific about what text needs clarification
- Consider the cumulative context to avoid conflicting comments with other agents
- Focus specifically on clarity and conciseness, not areas already covered by other agents

ANALYSIS AREAS:
- Run-on sentences that need to be split
- Jargon or overly complex vocabulary
- Unnecessary words or phrases
- Wordy constructions
- Unclear or ambiguous phrasing
- Passive voice that weakens clarity
- Redundant expressions

SCORING AND FEEDBACK INSTRUCTIONS:
For each comment, you must:
1. Provide a quality_score from 1-10 rating how clear and concise the identified text is
2. If quality_score < 8: Provide constructive feedback with specific suggestions for improvement
3. If quality_score >= 8: Focus on praise and reinforcement, avoid suggesting changes

For scores < 8, format improvement suggestions formatted as: "Instead of saying X, you could phrase it as Y to make it clearer and more direct."
For scores >= 8, focus on what they did well and encourage them to continue in that direction.

INSTRUCTIONS:
Generate 2-4 comments focusing on clarity and conciseness. Each comment should identify specific text and suggest how to make it clearer and more precise.

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Specific suggestion for making the identified text clearer and more concise. Include quality score assessment and conditional feedback based on score. If score < 8, provide improvement suggestions. If score >= 8, focus on praise.]",
      "comment_nature": "weakness",
      "comment_category": "inline",
      "agent_type": "clarity",
      "text_selection": {
        "start": 150,
        "end": 200
      },
      "confidence_score": 0.85,
      "quality_score": 6
    },
    {
      "comment_text": "[Another specific clarity suggestion with precise positioning. Include quality score assessment and conditional feedback based on score.]",
      "comment_nature": "weakness", 
      "comment_category": "inline",
      "agent_type": "clarity",
      "text_selection": {
        "start": 300,
        "end": 350
      },
      "confidence_score": 0.80,
      "quality_score": 9
    }
  ]
}

Remember: Focus ONLY on clarity, conciseness, and precision. Do NOT address grammar, spelling, punctuation, content, or style.`

async function analyzeClarity(essayContent: string, essayPrompt?: string, cumulativeContext?: string): Promise<ClarityAgentResponse> {
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
  
  console.log(`Clarity agent context: ${estimateTokens(optimizedContext)} tokens`);
  
  const formattedPrompt = CLARITY_PROMPT
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
      maxOutputTokens: 1024,
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
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const responseText = data.candidates[0].content.parts[0].text
    console.log(`Clarity Agent Response:`, responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`No JSON found in clarity agent response:`, responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log(`Parsed clarity response:`, JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments
    const comments: ClarityComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.8;

      // Validate quality score
      const qualityScore = typeof comment.quality_score === 'number' 
        ? Math.max(1, Math.min(10, comment.quality_score))
        : 5;

      // Validate text selection
      const textSelection = comment.text_selection && 
        typeof comment.text_selection.start === 'number' && 
        typeof comment.text_selection.end === 'number'
        ? {
            start: Math.max(0, comment.text_selection.start),
            end: Math.min(essayContent.length, comment.text_selection.end)
          }
        : { start: 0, end: 0 };

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: 'weakness',
        comment_category: 'inline',
        agent_type: 'clarity',
        text_selection: textSelection,
        confidence_score: confidenceScore,
        quality_score: qualityScore
      };
    })

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error(`Error in clarity agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to analyze clarity: ${error.message}`
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
    const { essayContent, essayPrompt, cumulativeContext }: ClarityAgentRequest = await req.json()

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
          message: 'Essay content too short for meaningful clarity analysis',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Analyzing clarity for essay content (${essayContent.length} characters)`)
    
    // Analyze clarity
    const result = await analyzeClarity(essayContent, essayPrompt, cumulativeContext)
    
    const response: ClarityAgentResponse = {
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
    console.error('Error in clarity agent:', error)
    
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
