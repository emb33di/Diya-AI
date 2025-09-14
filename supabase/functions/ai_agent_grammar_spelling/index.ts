import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface GrammarSpellingAgentRequest {
  essayContent: string;
  essayPrompt?: string;
}

interface GrammarSpellingComment {
  comment_text: string;
  comment_nature: 'weakness';
  comment_category: 'inline';
  agent_type: 'grammar_spelling';
  text_selection: {
    start: number;
    end: number;
  };
  confidence_score: number;
}

interface GrammarSpellingAgentResponse {
  success: boolean;
  comments: GrammarSpellingComment[];
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Grammar and Spelling Analysis Prompt
const GRAMMAR_SPELLING_PROMPT = `You are an expert grammar and spelling checker specializing in mechanical errors in college application essays. Your role is to identify and suggest corrections for grammar, punctuation, and spelling mistakes.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CRITICAL GUIDANCE:
- Focus ONLY on mechanical errors: grammar, punctuation, and spelling
- Do NOT comment on style, content, structure, or word choice
- Do NOT suggest stylistic changes or content improvements
- Be direct and specific about the error and correction
- Identify actual mistakes, not preferences
- Focus on errors that would be marked wrong in a grammar test
- Be concise and clear in your corrections

ANALYSIS AREAS:
- Subject-verb agreement errors
- Pronoun agreement and reference issues
- Verb tense inconsistencies
- Comma splices and run-on sentences
- Missing or incorrect punctuation
- Spelling mistakes and typos
- Apostrophe errors
- Capitalization mistakes
- Sentence fragments
- Double negatives

INSTRUCTIONS:
Generate 2-4 comments focusing on mechanical errors. Each comment should identify a specific error and provide the correction.

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Specific correction for the identified grammar, punctuation, or spelling error. Be direct and clear about the mistake and fix.]",
      "comment_nature": "weakness",
      "comment_category": "inline",
      "agent_type": "grammar_spelling",
      "text_selection": {
        "start": 150,
        "end": 200
      },
      "confidence_score": 0.90
    },
    {
      "comment_text": "[Another specific mechanical error correction with precise positioning.]",
      "comment_nature": "weakness",
      "comment_category": "inline", 
      "agent_type": "grammar_spelling",
      "text_selection": {
        "start": 300,
        "end": 350
      },
      "confidence_score": 0.85
    }
  ]
}

Remember: Focus ONLY on mechanical errors - grammar, punctuation, and spelling. Do NOT address style, content, structure, or word choice.`

async function analyzeGrammarSpelling(essayContent: string, essayPrompt?: string): Promise<GrammarSpellingAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const formattedPrompt = GRAMMAR_SPELLING_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)

  const requestBody = {
    contents: [{
      parts: [{
        text: formattedPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent grammar checking
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
    console.log(`Grammar & Spelling Agent Response:`, responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`No JSON found in grammar & spelling agent response:`, responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log(`Parsed grammar & spelling response:`, JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments
    const comments: GrammarSpellingComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.85;

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
        agent_type: 'grammar_spelling',
        text_selection: textSelection,
        confidence_score: confidenceScore
      };
    })

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error(`Error in grammar & spelling agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to analyze grammar and spelling: ${error.message}`
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
    const { essayContent, essayPrompt }: GrammarSpellingAgentRequest = await req.json()

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
          message: 'Essay content too short for meaningful grammar and spelling analysis',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Analyzing grammar and spelling for essay content (${essayContent.length} characters)`)
    
    // Analyze grammar and spelling
    const result = await analyzeGrammarSpelling(essayContent, essayPrompt)
    
    const response: GrammarSpellingAgentResponse = {
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
    console.error('Error in grammar & spelling agent:', error)
    
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
