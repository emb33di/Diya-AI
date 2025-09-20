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

// MBA Strengths Analysis Prompt
const MBA_STRENGTHS_PROMPT = `You are an expert MBA admissions consultant specializing in identifying strategic strengths in MBA application essays. Analyze the following MBA essay and provide honest, direct feedback about what the applicant is doing well strategically for business school admissions.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

WEAKNESSES CONTEXT (from previous analysis):
{weaknessesContext}

CRITICAL GUIDANCE:
- Speak directly to the MBA applicant using "You" - this is personal feedback for them
- Be encouraging but honest - acknowledge what's working well for MBA admissions
- Focus ONLY on strategic strengths and what's working for business school applications
- Do NOT comment on writing mechanics, structure, or execution
- Do not make up any facts about the applicant or their experiences
- Be specific and actionable, not vague or general
- Focus on what is actually written, not assumptions
- Use the weaknesses context to provide balanced feedback
- Each comment should be around 50 words
- Identify specific text if possible for quotations

MBA-SPECIFIC STRENGTHS TO IDENTIFY:
- Strong leadership examples with measurable impact
- Clear career progression and professional growth
- Quantifiable business achievements and results
- Strategic thinking and business acumen demonstration
- Unique value proposition for MBA programs
- Post-MBA career goals alignment and feasibility
- Cross-cultural competence and global perspective
- Innovation and entrepreneurial mindset
- Team collaboration and influence skills
- Personal brand differentiation in competitive MBA pool

QUALITY THRESHOLD REQUIREMENT:
- ONLY provide strength comments if there are GENUINE, MEANINGFUL strengths worth highlighting for MBA admissions
- Do NOT provide generic praise or weak compliments
- Do NOT provide comments just to fill a quota
- If the essay lacks significant MBA-relevant strengths, return an empty comments array
- Only highlight strengths that would genuinely impress MBA admissions officers
- Avoid praising mediocre or average elements
- Focus on business leadership, professional impact, and strategic positioning

INSTRUCTIONS:
Analyze the MBA essay for genuine strengths relevant to business school admissions. If you find meaningful MBA-relevant strengths worth highlighting, generate 1-3 SHORT, SPECIFIC strength comments. If the essay lacks significant MBA-relevant strengths, return an empty comments array.

IDENTIFY SPECIFIC MBA STRENGTHS (only comment if these are genuinely strong):
- Compelling leadership story with measurable business impact
- Clear demonstration of career progression and professional growth
- Quantifiable achievements that show business acumen
- Strategic positioning for MBA program success
- Authentic voice showing business leadership potential
- Effective use of specific business examples and metrics
- Strong connection between past experience and future MBA goals
- Unique professional background that adds value to MBA cohort
- Cross-functional collaboration and influence skills
- Innovation and entrepreneurial thinking demonstration

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Short, specific praise about this ONE MBA-relevant strength - around 50 words]",
      "comment_nature": "strength",
      "comment_category": "overall",
      "agent_type": "strengths",
      "anchor_text": "specific text from the essay that demonstrates this MBA strength (if applicable)",
      "confidence_score": 0.85
    }
  ]
}

IMPORTANT: If the essay lacks genuine MBA-relevant strengths worth highlighting, return: {"comments": []}

Be encouraging and specific. Focus on strategic MBA-relevant strengths that are working well for business school admissions success.`

async function analyzeMBAStrengths(essayContent: string, essayPrompt?: string, weaknessesContext?: string): Promise<StrengthsAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const formattedPrompt = MBA_STRENGTHS_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)
    .replace('{weaknessesContext}', weaknessesContext || 'No previous weaknesses context provided')

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
    console.log('MBA Strengths Agent Response:', responseText)
    
    // Extract JSON from response with improved error handling
    let parsedResponse: any
    try {
      // First try to find JSON object boundaries more precisely
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error('No valid JSON boundaries found in MBA strengths agent response:', responseText)
        throw new Error('No valid JSON boundaries found in AI response')
      }
      
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
      console.log('Extracted JSON string:', jsonString)
      
      // Try to parse the extracted JSON
      parsedResponse = JSON.parse(jsonString)
      console.log('Parsed MBA Strengths Response:', JSON.stringify(parsedResponse, null, 2))
      
    } catch (parseError) {
      console.error('JSON parsing error in MBA strengths agent:', parseError.message)
      console.error('Response text that failed to parse:', responseText)
      
      // Try alternative extraction methods
      try {
        // Try to find JSON array pattern
        const arrayMatch = responseText.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          const arrayString = arrayMatch[0]
          const parsedArray = JSON.parse(arrayString)
          parsedResponse = { comments: parsedArray }
          console.log('Successfully parsed as array:', JSON.stringify(parsedResponse, null, 2))
        } else {
          // Try to clean up common JSON issues
          const cleanedResponse = responseText
            .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
          
          console.log('Attempting to parse cleaned response:', cleanedResponse)
          
          // Try to find and parse cleaned JSON
          const cleanedJsonStart = cleanedResponse.indexOf('{')
          const cleanedJsonEnd = cleanedResponse.lastIndexOf('}')
          
          if (cleanedJsonStart !== -1 && cleanedJsonEnd !== -1 && cleanedJsonEnd > cleanedJsonStart) {
            const cleanedJsonString = cleanedResponse.substring(cleanedJsonStart, cleanedJsonEnd + 1)
            parsedResponse = JSON.parse(cleanedJsonString)
            console.log('Successfully parsed cleaned JSON:', JSON.stringify(parsedResponse, null, 2))
          } else {
            throw new Error('No valid JSON structure found after cleaning')
          }
        }
      } catch (arrayError) {
        console.error('All parsing attempts failed:', arrayError.message)
        console.error('Original response text:', responseText)
        throw new Error(`Failed to parse JSON from MBA strengths agent response: ${parseError.message}. Additional error: ${arrayError.message}`)
      }
    }
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments
    const comments: StrengthComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.8;

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: 'strength',
        comment_category: 'overall',
        agent_type: 'strengths',
        anchor_text: comment.anchor_text || undefined,
        confidence_score: confidenceScore
      };
    });

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error('Error analyzing MBA strengths:', error)
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

    const result = await analyzeMBAStrengths(essayContent, essayPrompt, weaknessesContext)

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in MBA strengths agent:', error)
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
