import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// MBA Weaknesses Analysis Prompt
const MBA_WEAKNESSES_PROMPT = `You are an expert MBA admissions consultant specializing in identifying strategic weaknesses in MBA application essays. Analyze the following MBA essay and provide honest, direct feedback about areas that need improvement for maximum business school admissions impact.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CRITICAL GUIDANCE:
- Speak directly to the MBA applicant using "You" - this is personal feedback for them
- Do not sugarcoat - be honest and direct about what needs work for MBA admissions
- Focus ONLY on strategic weaknesses and areas for improvement relevant to business school applications
- Do NOT comment on writing mechanics, structure, or execution
- Do not make up any facts about the applicant or their experiences
- Be specific and actionable, not vague or general
- Focus on what is actually written, not assumptions
- Prioritize weaknesses that would have the biggest impact on MBA admissions success
- Each comment should be around 50 words
- Identify specific text if possible for quotations

MBA-SPECIFIC WEAKNESSES TO IDENTIFY:
- Lack of clear leadership examples with measurable business impact
- Weak career progression narrative or unclear professional growth
- Missing quantifiable achievements and business metrics
- Insufficient demonstration of strategic thinking and business acumen
- Unclear or unrealistic post-MBA career goals
- Lack of unique value proposition for MBA programs
- Missing cross-cultural competence or global perspective
- Weak innovation and entrepreneurial mindset demonstration
- Insufficient team collaboration and influence skills
- Generic positioning that doesn't differentiate in competitive MBA pool

INSTRUCTIONS:
Generate 2-4 SHORT, SPECIFIC weakness comments focused on MBA admissions. Each comment should focus on ONE specific area for improvement relevant to business school applications. Keep each comment concise (around 50 words) and actionable.

IDENTIFY SPECIFIC MBA WEAKNESSES:
- Weak or unclear leadership examples without business impact
- Missing quantifiable professional achievements and metrics
- Poor career progression narrative or unclear professional growth
- Generic or clichéd business language without specific examples
- Weak connection between past experience and future MBA goals
- Unclear or unrealistic post-MBA career vision
- Lack of strategic positioning for MBA program success
- Missing demonstration of business acumen and strategic thinking
- Insufficient unique value proposition for MBA cohort
- Weak differentiation in competitive business school applicant pool

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Short, specific critique about this ONE MBA-relevant weakness - around 50 words with actionable advice for business school applications]",
      "comment_nature": "weakness",
      "comment_category": "overall",
      "agent_type": "weaknesses",
      "anchor_text": "specific text from the essay that needs improvement for MBA admissions (if applicable)",
      "confidence_score": 0.85
    },
    {
      "comment_text": "[Another short, specific MBA-relevant weakness - around 50 words with actionable advice for business school applications]",
      "comment_nature": "weakness",
      "comment_category": "overall", 
      "agent_type": "weaknesses",
      "anchor_text": "another specific text from the essay that needs improvement (if applicable)",
      "confidence_score": 0.80
    }
  ]
}

Be honest and direct. Focus on strategic improvements that will have the biggest impact on MBA admissions success.`

async function analyzeMBAWeaknesses(essayContent: string, essayPrompt?: string): Promise<WeaknessesAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const formattedPrompt = MBA_WEAKNESSES_PROMPT
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
    console.log('MBA Weaknesses Agent Response:', responseText)
    
    // Extract JSON from response with improved error handling
    let parsedResponse: any
    try {
      // First try to find JSON object boundaries more precisely
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error('No valid JSON boundaries found in MBA weaknesses agent response:', responseText)
        throw new Error('No valid JSON boundaries found in AI response')
      }
      
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
      console.log('Extracted JSON string:', jsonString)
      
      // Try to parse the extracted JSON
      parsedResponse = JSON.parse(jsonString)
      console.log('Parsed MBA Weaknesses Response:', JSON.stringify(parsedResponse, null, 2))
      
    } catch (parseError) {
      console.error('JSON parsing error in MBA weaknesses agent:', parseError.message)
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
        throw new Error(`Failed to parse JSON from MBA weaknesses agent response: ${parseError.message}. Additional error: ${arrayError.message}`)
      }
    }
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments
    const comments: WeaknessComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.8;

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: 'weakness',
        comment_category: 'overall',
        agent_type: 'weaknesses',
        anchor_text: comment.anchor_text || undefined,
        confidence_score: confidenceScore
      };
    });

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error('Error analyzing MBA weaknesses:', error)
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

    const result = await analyzeMBAWeaknesses(essayContent, essayPrompt)

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in MBA weaknesses agent:', error)
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
