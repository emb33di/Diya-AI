import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WeaknessComment {
  comment_text: string;
  comment_nature: 'weakness';
  comment_category: 'overall';
  agent_type: 'weaknesses';
  anchor_text?: string;
  confidence_score: number;
}

interface WeaknessesAgentResponse {
  success: boolean;
  comments: WeaknessComment[];
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Weaknesses Analysis Prompt
const WEAKNESSES_PROMPT = `You are an expert college admissions counselor specializing in identifying strategic weaknesses in college application essays. Analyze the following essay and provide honest, direct feedback about areas that need improvement for maximum admissions impact.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CRITICAL GUIDANCE:
- Speak directly to the student using "You" - this is personal feedback for them
- Do not sugarcoat - be honest and direct about what needs work
- Focus ONLY on strategic weaknesses and areas for improvement
- Do NOT comment on writing mechanics, structure, or execution
- Do not make up any facts about the student or their experiences
- Be specific and actionable, not vague or general
- Focus on what is actually written, not assumptions
- Prioritize weaknesses that would have the biggest impact on admissions success
- Each comment should be around 50 words
- Identify specific text if possible for quotations

INSTRUCTIONS:
Generate 2-4 SHORT, SPECIFIC weakness comments. Each comment should focus on ONE specific area for improvement. Keep each comment concise (around 50 words) and actionable.

IDENTIFY SPECIFIC WEAKNESSES:
- Weak or unclear thesis statement
- Missing personal examples or details
- Poor argument structure or flow
- Generic or clichéd language
- Weak opening or conclusion
- Unclear connection to prompt
- Lack of specific insights
- Weak positioning for admissions

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Short, specific critique about this ONE weakness - around 50 words with actionable advice]",
      "comment_nature": "weakness",
      "comment_category": "overall",
      "agent_type": "weaknesses",
      "anchor_text": "specific text from the essay that needs improvement (if applicable)",
      "confidence_score": 0.85
    },
    {
      "comment_text": "[Another short, specific weakness - around 50 words with actionable advice]",
      "comment_nature": "weakness",
      "comment_category": "overall", 
      "agent_type": "weaknesses",
      "anchor_text": "another specific text from the essay (if applicable)",
      "confidence_score": 0.80
    }
  ]
}

Be honest and direct. Focus on strategic improvements that will have the biggest impact on admissions success.`

async function analyzeWeaknesses(essayContent: string, essayPrompt?: string): Promise<WeaknessesAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const formattedPrompt = WEAKNESSES_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)

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
    console.log('Weaknesses Agent Response:', responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in weaknesses agent response:', responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log('Parsed Weaknesses Response:', JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    return {
      success: true,
      comments: parsedResponse.comments
    }

  } catch (error) {
    console.error('Error analyzing weaknesses:', error)
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
    const { essayContent, essayPrompt } = await req.json()

    if (!essayContent) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Essay content is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await analyzeWeaknesses(essayContent, essayPrompt)

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in weaknesses agent:', error)
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
