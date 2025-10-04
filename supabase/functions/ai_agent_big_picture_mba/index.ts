import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface BigPictureComment {
  comment_text: string;
  comment_nature: 'suggestion' | 'critique' | 'praise' | 'question';
  comment_category: 'overall';
  agent_type: 'big-picture';
  anchor_text?: string;
  confidence_score: number;
  quality_score: number;
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

// MBA-Specific Big Picture Analysis Prompt
const MBA_BIG_PICTURE_PROMPT = `You are an expert MBA admissions consultant specializing in strategic business school application essay analysis. Analyze the following MBA application essay holistically and provide honest, direct feedback about its strategic strengths and areas for improvement.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

CUMULATIVE CONTEXT (from previous agents):
{cumulativeContext}

CRITICAL GUIDANCE:
- Speak directly to the MBA applicant using "You" - this is personal feedback for them
- Do not sugarcoat - be honest and direct about what works and what doesn't
- Focus ONLY on strategic, high-level elements of the MBA essay
- Do NOT comment on writing mechanics, structure, or execution
- Do not make up any facts about the applicant or their experiences
- Be specific and actionable, not vague or general
- Focus on what is actually written, not assumptions
- Use the cumulative context to avoid conflicting comments
- Generate ONE comprehensive comment aiming for 75 words max
- Consider all previous agent feedback to provide holistic perspective

MBA-SPECIFIC FOCUS AREAS:
- Leadership potential and demonstrated impact
- Career progression and professional growth trajectory
- Strategic thinking and business acumen
- Unique value proposition for MBA programs
- Post-MBA career goals alignment and feasibility
- Personal brand and differentiation in competitive MBA pool
- Quantifiable achievements and measurable impact
- Cross-cultural competence and global perspective
- Innovation and entrepreneurial mindset
- Team collaboration and influence skills

SCORING AND FEEDBACK INSTRUCTIONS:
You must provide a quality_score from 1-100 based on these STRICT criteria:

MBA SCORING RUBRIC (Be HONEST and RIGOROUS):
- 90-100: Exceptional MBA essay that stands out significantly. Compelling leadership narrative, unique professional insights, perfect prompt alignment, memorable voice. Would impress any MBA admissions committee.
- 80-89: Strong MBA essay with clear strengths. Good professional storytelling, solid prompt response, authentic leadership voice. Above average but not exceptional.
- 70-79: Competent MBA essay that meets basic requirements. Adequate professional narrative and prompt response but lacks standout elements. Average quality.
- 60-69: Below average MBA essay with notable weaknesses. Weak professional narrative, poor prompt alignment, or generic content. Needs significant improvement.
- 50-59: Poor MBA essay with major issues. Confusing professional narrative, doesn't address MBA prompt effectively, or lacks authenticity.
- 1-49: Very poor MBA essay with fundamental problems. Major structural issues, completely off-topic, or incoherent.

CRITICAL MBA SCORING GUIDELINES:
- Most MBA essays should score 60-75 (average to slightly above average)
- Only truly exceptional MBA essays deserve 80+
- Be HONEST - mediocre MBA essays should get 60-65, not 75+
- Consider: Does this essay stand out from thousands of MBA applicants?
- Ask: Would an MBA admissions officer remember this essay?
- Default to lower scores when in doubt
- MBA essays are highly competitive - be especially rigorous

FEEDBACK REQUIREMENTS:
- If quality_score < 70: Provide specific, actionable improvement suggestions for MBA application
- If quality_score >= 70: Focus on strengths while noting areas for enhancement
- If quality_score >= 80: Emphasize what makes this MBA essay exceptional

INSTRUCTIONS:
Provide exactly ONE comprehensive overall comment that synthesizes the strategic assessment of the MBA essay, taking into account the previous agent feedback.

FOCUS ON MBA STRATEGIC ELEMENTS ONLY:
- Overall argument strength and thesis clarity for MBA admissions
- How well you answer the MBA-specific prompt
- Professional narrative arc and career storytelling effectiveness
- Leadership voice and business authenticity
- MBA admissions impact and competitive differentiation
- Strategic positioning for business school success
- Post-MBA vision alignment and feasibility
- Professional growth trajectory demonstration

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[Comprehensive strategic assessment of the MBA essay - maximum 75 words - that synthesizes strengths and areas for improvement while considering previous agent feedback. Include quality score assessment and conditional feedback based on score. If score < 70, provide improvement suggestions. If score >= 70, focus on strengths.]",
      "comment_nature": "suggestion",
      "comment_category": "overall",
      "agent_type": "big-picture",
      "anchor_text": "representative text from the essay (if applicable)",
      "confidence_score": 0.85,
      "quality_score": 65
    }
  ]
}

Be honest and direct. Focus on strategic improvements that will have the biggest impact on MBA admissions success while considering all previous feedback.`

async function analyzeMBABigPicture(essayContent: string, essayPrompt?: string, cumulativeContext?: string): Promise<BigPictureAgentResponse> {
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
  
  console.log(`MBA Big-picture agent context: ${estimateTokens(optimizedContext)} tokens`);
  
  const formattedPrompt = MBA_BIG_PICTURE_PROMPT
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
    console.log('MBA Big Picture Agent Response:', responseText)
    
    // Extract JSON from response with improved error handling
    let parsedResponse: any
    try {
      // First try to find JSON object boundaries more precisely
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error('No valid JSON boundaries found in MBA big picture agent response:', responseText)
        throw new Error('No valid JSON boundaries found in AI response')
      }
      
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
      console.log('Extracted JSON string:', jsonString)
      
      // Try to parse the extracted JSON
      parsedResponse = JSON.parse(jsonString)
      console.log('Parsed MBA Big Picture Response:', JSON.stringify(parsedResponse, null, 2))
      
    } catch (parseError) {
      console.error('JSON parsing error in MBA big picture agent:', parseError.message)
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
        throw new Error(`Failed to parse JSON from MBA big picture agent response: ${parseError.message}. Additional error: ${arrayError.message}`)
      }
    }
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments
    const comments: BigPictureComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.8;

      // Validate quality score
      const qualityScore = typeof comment.quality_score === 'number' 
        ? Math.max(1, Math.min(100, comment.quality_score))
        : 50;

      // Validate comment nature
      const validNatures = ['suggestion', 'critique', 'praise', 'question'];
      const commentNature = validNatures.includes(comment.comment_nature) 
        ? comment.comment_nature 
        : 'suggestion';

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: commentNature,
        comment_category: 'overall',
        agent_type: 'big-picture',
        anchor_text: comment.anchor_text || undefined,
        confidence_score: confidenceScore,
        quality_score: qualityScore
      };
    });

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error('Error analyzing MBA big picture:', error)
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

    const result = await analyzeMBABigPicture(essayContent, essayPrompt, cumulativeContext)

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error in MBA big picture agent:', error)
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
