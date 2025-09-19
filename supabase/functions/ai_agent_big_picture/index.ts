import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface BigPictureComment {
  comment_text: string;
  comment_nature: 'suggestion' | 'critique' | 'praise' | 'question';
  comment_category: 'overall';
  agent_type: 'big-picture';
  anchor_text?: string;
  confidence_score: number;
}

interface BigPictureAgentResponse {
  success: boolean;
  comments: BigPictureComment[];
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

// Big Picture Analysis Prompt
const BIG_PICTURE_PROMPT = `You are an expert college admissions counselor specializing in strategic essay analysis. Analyze the following college application essay holistically and provide honest, direct feedback about its strategic strengths and areas for improvement.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CUMULATIVE CONTEXT (from previous agents):
{cumulativeContext}

CRITICAL GUIDANCE:
- Speak directly to the student using "You" - this is personal feedback for them
- Do not sugarcoat - be honest and direct about what works and what doesn't
- Focus ONLY on strategic, high-level elements of the essay
- Do NOT comment on writing mechanics, structure, or execution
- Do not make up any facts about the student or their experiences
- Be specific and actionable, not vague or general
- Focus on what is actually written, not assumptions
- Use the cumulative context to avoid conflicting comments
- Generate ONE comprehensive comment aiming for 75 words max
- Consider all previous agent feedback to provide holistic perspective

INSTRUCTIONS:
Provide exactly ONE comprehensive overall comment that synthesizes the strategic assessment of the essay, taking into account the previous agent feedback.

FOCUS ON STRATEGIC ELEMENTS ONLY:
- Overall argument strength and thesis clarity
- How well you answer the prompt
- Narrative arc and storytelling effectiveness
- Personal voice and authenticity
- College admissions impact and uniqueness
- Strategic positioning and messaging

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Comprehensive strategic assessment of the essay - maximum 75 words - that synthesizes strengths and areas for improvement while considering previous agent feedback]",
      "comment_nature": "suggestion",
      "comment_category": "overall",
      "agent_type": "big-picture",
      "anchor_text": "representative text from the essay (if applicable)",
      "confidence_score": 0.85
    }
  ]
}

Be honest and direct. Focus on strategic improvements that will have the biggest impact on admissions success while considering all previous feedback.`

async function analyzeBigPicture(essayContent: string, essayPrompt?: string, cumulativeContext?: string): Promise<BigPictureAgentResponse> {
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
    'No previous agent context provided';
  
  console.log(`Big-picture agent context: ${estimateTokens(optimizedContext)} tokens`);
  
  const formattedPrompt = BIG_PICTURE_PROMPT
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
    console.log('Big Picture Agent Response:', responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in big picture agent response:', responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log('Parsed Big Picture Response:', JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    return {
      success: true,
      comments: parsedResponse.comments
    }

  } catch (error) {
    console.error('Error analyzing big picture:', error)
    return {
      success: false,
      comments: [],
      error: error.message
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { essayContent, essayPrompt, cumulativeContext } = await req.json()

    if (!essayContent) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Essay content is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await analyzeBigPicture(essayContent, essayPrompt, cumulativeContext)

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in big picture agent:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
