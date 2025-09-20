import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface StrengthComment {
  comment_text: string;
  comment_nature: 'strength';
  comment_category: 'overall';
  agent_type: 'strengths';
  anchor_text?: string;
  confidence_score: number;
}

interface StrengthsAgentResponse {
  success: boolean;
  comments: StrengthComment[];
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Strengths Analysis Prompt
const STRENGTHS_PROMPT = `You are an expert college admissions counselor specializing in identifying strategic strengths in college application essays. Analyze the following essay and provide honest, direct feedback about what the student is doing well strategically.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

WEAKNESSES CONTEXT (from previous analysis):
{weaknessesContext}

CRITICAL GUIDANCE:
- Speak directly to the student using "You" - this is personal feedback for them
- Be encouraging but honest - acknowledge what's working well
- Focus ONLY on strategic strengths and what's working
- Do NOT comment on writing mechanics, structure, or execution
- Do not make up any facts about the student or their experiences
- Be specific and actionable, not vague or general
- Focus on what is actually written, not assumptions
- Use the weaknesses context to provide balanced feedback
- Each comment should be around 50 words
- Identify specific text if possible for quotations

QUALITY THRESHOLD REQUIREMENT:
- ONLY provide strength comments if there are GENUINE, MEANINGFUL strengths worth highlighting
- Do NOT provide generic praise or weak compliments
- Do NOT provide comments just to fill a quota
- If the essay lacks significant strengths, return an empty comments array
- Only highlight strengths that would genuinely impress admissions officers
- Avoid praising mediocre or average elements

INSTRUCTIONS:
Analyze the essay for genuine strengths. If you find meaningful strengths worth highlighting, generate 1-3 SHORT, SPECIFIC strength comments. If the essay lacks significant strengths, return an empty comments array.

IDENTIFY SPECIFIC STRENGTHS (only comment if these are genuinely strong):
- Strong opening hook or thesis statement
- Compelling personal story or example
- Clear argument structure and flow
- Authentic voice and perspective
- Effective use of specific details
- Strong conclusion or call to action
- Unique insights or experiences
- Strategic positioning for admissions

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Short, specific praise about this ONE strength - around 50 words]",
      "comment_nature": "strength",
      "comment_category": "overall",
      "agent_type": "strengths",
      "anchor_text": "specific text from the essay that demonstrates this strength (if applicable)",
      "confidence_score": 0.85
    }
  ]
}

IMPORTANT: If the essay lacks genuine strengths worth highlighting, return: {"comments": []}

Be encouraging and specific. Focus on strategic strengths that are working well for admissions success.`

async function analyzeStrengths(essayContent: string, essayPrompt?: string, weaknessesContext?: string): Promise<StrengthsAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const formattedPrompt = STRENGTHS_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)
    .replace('{weaknessesContext}', weaknessesContext || 'No previous weaknesses analysis provided')

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
    console.log('Strengths Agent Response:', responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in strengths agent response:', responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log('Parsed Strengths Response:', JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    return {
      success: true,
      comments: parsedResponse.comments
    }

  } catch (error) {
    console.error('Error analyzing strengths:', error)
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
    const { essayContent, essayPrompt, weaknessesContext } = await req.json()

    if (!essayContent) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Essay content is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await analyzeStrengths(essayContent, essayPrompt, weaknessesContext)

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in strengths agent:', error)
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
