import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface EssaySummary {
  study_target: string; // School and major (30 words or less)
  goals_background: string; // Goals and background (30 words or less)
  strengths: string; // What student does well (30 words or less)
  weaknesses: string; // What student does poorly (30 words or less)
  grammar_mistakes: string; // Grammar mistakes found (30 words or less)
  improvement_areas: string; // Where AI thinks student can improve (30 words or less)
}

interface FounderSummaryResponse {
  success: boolean;
  summary: EssaySummary | null;
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Founder Summary Prompt - Overall Essay Analysis
const FOUNDER_SUMMARY_PROMPT = `You are an expert college admissions counselor analyzing an entire essay for the founder's review. Provide concise, structured feedback about the essay as a whole.

ESSAY PROMPT:
{prompt}

FULL ESSAY CONTENT:
{essay_content}

STUDENT CONTEXT:
- School/Major: {school_major}
- Goals/Background: {goals_background}

CRITICAL INSTRUCTIONS:
- Answer ONLY the 6 questions below
- Each answer MUST be 30 words or less
- Analyze the ENTIRE essay as a whole, not individual paragraphs
- Be specific and actionable
- Do not make up facts - only analyze what is written
- Focus on what will help the founder provide better feedback

ANSWER THESE 6 QUESTIONS (30 words or less each):

1. STUDY TARGET: What is the student trying to study? Which school is being applied to and what major? (If not mentioned, state "Not specified in essay")

2. GOALS AND BACKGROUND: What are the student's goals and what is their background? (Focus on what's revealed throughout the essay)

3. STRENGTHS: What does the student do well in this essay? (Writing quality, content, structure, voice, etc.)

4. WEAKNESSES: What does the student do poorly in this essay? (Be specific about issues)

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

Remember: Each answer must be 30 words or less. Be concise and specific. Analyze the essay as a complete work.`

async function analyzeEssay(
  essayContent: string,
  essayPrompt?: string,
  schoolMajor?: string,
  goalsBackground?: string
): Promise<EssaySummary | null> {
  console.log('[FOUNDER_SUMMARY] Starting essay analysis');
  console.log('[FOUNDER_SUMMARY] Essay length:', essayContent.length, 'characters');
  console.log('[FOUNDER_SUMMARY] Has prompt:', !!essayPrompt);
  console.log('[FOUNDER_SUMMARY] School/Major:', schoolMajor || 'Not specified');
  
  if (!GEMINI_API_KEY) {
    console.error('[FOUNDER_SUMMARY] ERROR: GOOGLE_API_KEY not configured');
    return null
  }

  console.log('[FOUNDER_SUMMARY] Gemini API key found, proceeding with analysis');

  const formattedPrompt = FOUNDER_SUMMARY_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{essay_content}', essayContent)
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
    console.log('[FOUNDER_SUMMARY] Calling Gemini API...');
    const startTime = Date.now();
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const apiTime = Date.now() - startTime;
    console.log(`[FOUNDER_SUMMARY] Gemini API response received in ${apiTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[FOUNDER_SUMMARY] ERROR: Gemini API error: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    console.log('[FOUNDER_SUMMARY] Gemini API response parsed successfully');
    
    const parts = data?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts) || parts.length === 0) {
      console.error('[FOUNDER_SUMMARY] ERROR: Gemini response missing parts')
      console.error('[FOUNDER_SUMMARY] Full response:', JSON.stringify(data, null, 2));
      return null
    }
    
    const responseText = parts
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n')
      .trim()
    
    if (!responseText) {
      console.error('[FOUNDER_SUMMARY] ERROR: Empty response from Gemini API')
      return null
    }

    console.log('[FOUNDER_SUMMARY] Extracted response text, length:', responseText.length);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[FOUNDER_SUMMARY] ERROR: No JSON found in response')
      console.error('[FOUNDER_SUMMARY] Response text:', responseText.substring(0, 500));
      return null
    }

    console.log('[FOUNDER_SUMMARY] JSON extracted, parsing...');
    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log('[FOUNDER_SUMMARY] JSON parsed successfully');
    console.log('[FOUNDER_SUMMARY] Summary fields:', {
      has_study_target: !!parsedResponse.study_target,
      has_goals_background: !!parsedResponse.goals_background,
      has_strengths: !!parsedResponse.strengths,
      has_weaknesses: !!parsedResponse.weaknesses,
      has_grammar_mistakes: !!parsedResponse.grammar_mistakes,
      has_improvement_areas: !!parsedResponse.improvement_areas
    });
    
    const summary: EssaySummary = {
      study_target: parsedResponse.study_target || 'Not specified',
      goals_background: parsedResponse.goals_background || 'Not specified',
      strengths: parsedResponse.strengths || 'No strengths identified',
      weaknesses: parsedResponse.weaknesses || 'No weaknesses identified',
      grammar_mistakes: parsedResponse.grammar_mistakes || 'No grammar mistakes found',
      improvement_areas: parsedResponse.improvement_areas || 'No specific improvement areas identified'
    };

    console.log('[FOUNDER_SUMMARY] SUCCESS: Essay analysis completed');
    return summary;

  } catch (error) {
    console.error('[FOUNDER_SUMMARY] ERROR: Exception during analysis:', error);
    console.error('[FOUNDER_SUMMARY] Error details:', {
      message: error.message,
      stack: error.stack
    });
    return null
  }
}

async function generateFounderSummary(
  essayContent: string,
  essayPrompt?: string,
  schoolMajor?: string,
  goalsBackground?: string
): Promise<FounderSummaryResponse> {
  console.log('[FOUNDER_SUMMARY] ===== Starting founder summary generation =====');
  console.log('[FOUNDER_SUMMARY] Essay content length:', essayContent?.length || 0);
  console.log('[FOUNDER_SUMMARY] Essay prompt:', essayPrompt || 'Not provided');
  
  if (!essayContent || essayContent.trim().length === 0) {
    console.error('[FOUNDER_SUMMARY] ERROR: No essay content provided');
    return {
      success: false,
      summary: null,
      error: 'No essay content provided'
    }
  }

  console.log('[FOUNDER_SUMMARY] Calling analyzeEssay function...');
  const summary = await analyzeEssay(
    essayContent,
    essayPrompt,
    schoolMajor,
    goalsBackground
  );

  if (!summary) {
    console.error('[FOUNDER_SUMMARY] ERROR: Failed to generate summary');
    return {
      success: false,
      summary: null,
      error: 'Failed to generate summary from AI'
    }
  }

  console.log('[FOUNDER_SUMMARY] SUCCESS: Summary generated successfully');
  console.log('[FOUNDER_SUMMARY] Summary preview:', {
    study_target_length: summary.study_target.length,
    strengths_length: summary.strengths.length,
    weaknesses_length: summary.weaknesses.length
  });

  return {
    success: true,
    summary
  }
}

serve(async (req) => {
  console.log('[FOUNDER_SUMMARY] ===== Edge Function Invoked =====');
  console.log('[FOUNDER_SUMMARY] Request method:', req.method);
  console.log('[FOUNDER_SUMMARY] Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[FOUNDER_SUMMARY] Handling CORS preflight');
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    console.log('[FOUNDER_SUMMARY] Parsing request body...');
    const { essayContent, essayPrompt, schoolMajor, goalsBackground } = await req.json()
    
    console.log('[FOUNDER_SUMMARY] Request parameters:', {
      has_essay_content: !!essayContent,
      essay_content_length: essayContent?.length || 0,
      has_essay_prompt: !!essayPrompt,
      has_school_major: !!schoolMajor,
      has_goals_background: !!goalsBackground
    });

    if (!essayContent || typeof essayContent !== 'string' || essayContent.trim().length === 0) {
      console.error('[FOUNDER_SUMMARY] ERROR: Invalid essay content');
      return new Response(JSON.stringify({ 
        success: false, 
        summary: null,
        error: 'Essay content is required and must be a non-empty string' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    }

    console.log('[FOUNDER_SUMMARY] Calling generateFounderSummary...');
    const result = await generateFounderSummary(
      essayContent,
      essayPrompt,
      schoolMajor,
      goalsBackground
    )

    console.log('[FOUNDER_SUMMARY] ===== Function completed =====');
    console.log('[FOUNDER_SUMMARY] Result:', {
      success: result.success,
      has_summary: !!result.summary,
      error: result.error || 'None'
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })

  } catch (error) {
    console.error('[FOUNDER_SUMMARY] ===== FATAL ERROR =====');
    console.error('[FOUNDER_SUMMARY] Error message:', error.message);
    console.error('[FOUNDER_SUMMARY] Error stack:', error.stack);
    console.error('[FOUNDER_SUMMARY] Full error:', JSON.stringify(error, null, 2));
    
    return new Response(JSON.stringify({ 
      success: false,
      summary: null,
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

