import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ParagraphSummary {
  paragraph_index: number;
  paragraph_content: string;
  study_target: string; // School and major (30 words or less)
  goals_background: string; // Goals and background (30 words or less)
  strengths: string; // What student does well (30 words or less)
  weaknesses: string; // What student does poorly (30 words or less)
  grammar_mistakes: string; // Grammar mistakes found (30 words or less)
  improvement_areas: string; // Where AI thinks student can improve (30 words or less)
}

interface FounderSummaryResponse {
  success: boolean;
  summaries: ParagraphSummary[];
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Founder Summary Prompt
const FOUNDER_SUMMARY_PROMPT = `You are an expert college admissions counselor analyzing an essay paragraph for the founder's review. Provide concise, structured feedback.

ESSAY PROMPT:
{prompt}

PARAGRAPH {paragraph_index}:
{paragraph_content}

STUDENT CONTEXT:
- School/Major: {school_major}
- Goals/Background: {goals_background}

CRITICAL INSTRUCTIONS:
- Answer ONLY the 6 questions below
- Each answer MUST be 30 words or less
- Be specific and actionable
- Do not make up facts - only analyze what is written
- Focus on what will help the founder provide better feedback

ANSWER THESE 6 QUESTIONS (30 words or less each):

1. STUDY TARGET: What is the student trying to study? Which school is being applied to and what major? (If not mentioned, state "Not specified in this paragraph")

2. GOALS AND BACKGROUND: What are the student's goals and what is their background? (Focus on what's revealed in this paragraph)

3. STRENGTHS: What does the student do well in this paragraph? (Writing quality, content, structure, voice, etc.)

4. WEAKNESSES: What does the student do poorly in this paragraph? (Be specific about issues)

5. GRAMMAR MISTAKES: Are there any grammar mistakes? List them specifically or say "No grammar mistakes found"

6. IMPROVEMENT AREAS: Where does the AI think the student can improve? (Be specific and actionable)

RESPONSE FORMAT (JSON only):
{
  "study_target": "[Answer to question 1 - 30 words or less]",
  "goals_background": "[Answer to question 2 - 30 words or less]",
  "strengths": "[Answer to question 3 - 30 words or less]",
  "weaknesses": "[Answer to question 4 - 30 words or less]",
  "grammar_mistakes": "[Answer to question 5 - 30 words or less]",
  "improvement_areas": "[Answer to question 6 - 30 words or less]"
}

Remember: Each answer must be 30 words or less. Be concise and specific.`

async function analyzeParagraph(
  paragraphContent: string,
  paragraphIndex: number,
  essayPrompt?: string,
  schoolMajor?: string,
  goalsBackground?: string
): Promise<ParagraphSummary | null> {
  if (!GEMINI_API_KEY) {
    console.error('GOOGLE_API_KEY not configured')
    return null
  }

  const formattedPrompt = FOUNDER_SUMMARY_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{paragraph_content}', paragraphContent)
    .replace('{paragraph_index}', paragraphIndex.toString())
    .replace('{school_major}', schoolMajor || 'Not specified')
    .replace('{goals_background}', goalsBackground || 'Not specified')

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
      console.error(`Gemini API error: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    
    const parts = data?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts) || parts.length === 0) {
      console.error('Gemini response missing parts')
      return null
    }
    
    const responseText = parts
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n')
      .trim()
    
    if (!responseText) {
      console.error('Empty response from Gemini API')
      return null
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText)
      return null
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    
    return {
      paragraph_index: paragraphIndex,
      paragraph_content: paragraphContent,
      study_target: parsedResponse.study_target || 'Not specified',
      goals_background: parsedResponse.goals_background || 'Not specified',
      strengths: parsedResponse.strengths || 'No strengths identified',
      weaknesses: parsedResponse.weaknesses || 'No weaknesses identified',
      grammar_mistakes: parsedResponse.grammar_mistakes || 'No grammar mistakes found',
      improvement_areas: parsedResponse.improvement_areas || 'No specific improvement areas identified'
    }

  } catch (error) {
    console.error('Error analyzing paragraph:', error)
    return null
  }
}

async function generateFounderSummary(
  paragraphs: string[],
  essayPrompt?: string,
  schoolMajor?: string,
  goalsBackground?: string
): Promise<FounderSummaryResponse> {
  if (!paragraphs || paragraphs.length === 0) {
    return {
      success: false,
      summaries: [],
      error: 'No paragraphs provided'
    }
  }

  // Analyze each paragraph
  const summaries: ParagraphSummary[] = []
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim()
    if (!paragraph) continue // Skip empty paragraphs
    
    const summary = await analyzeParagraph(
      paragraph,
      i + 1, // 1-indexed
      essayPrompt,
      schoolMajor,
      goalsBackground
    )
    
    if (summary) {
      summaries.push(summary)
    }
    
    // Small delay between API calls to avoid rate limiting
    if (i < paragraphs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return {
    success: summaries.length > 0,
    summaries
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const { paragraphs, essayPrompt, schoolMajor, goalsBackground } = await req.json()

    if (!paragraphs || !Array.isArray(paragraphs) || paragraphs.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Paragraphs array is required' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    const result = await generateFounderSummary(
      paragraphs,
      essayPrompt,
      schoolMajor,
      goalsBackground
    )

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })

  } catch (error) {
    console.error('Error in founder summary agent:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })
  }
})

