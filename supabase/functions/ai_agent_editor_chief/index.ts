import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface EditorChiefRequest {
  essayContent: string;
  essayPrompt?: string;
  previousComments?: any[]; // Comments from other agents for context
}

interface EditorChiefComment {
  comment_text: string;
  comment_nature: 'strength' | 'weakness' | 'suggestion' | 'critical';
  comment_category: 'overall' | 'inline';
  agent_type: 'editor_chief';
  confidence_score: number;
  priority_level: 'high' | 'medium' | 'low';
  text_selection?: {
    start: number;
    end: number;
  };
  editorial_decision?: 'approve' | 'revise' | 'reject';
  impact_assessment?: 'admissions_boost' | 'neutral' | 'admissions_hurt';
}

interface EditorChiefResponse {
  success: boolean;
  comments: EditorChiefComment[];
  overall_assessment: {
    essay_strength_score: number; // 1-10 scale
    admissions_readiness: 'ready' | 'needs_revision' | 'needs_major_revision';
    key_strengths: string[];
    critical_weaknesses: string[];
    recommended_actions: string[];
  };
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Editor in Chief Analysis Prompt
const EDITOR_CHIEF_PROMPT = `You are the Editor in Chief of a prestigious college admissions consulting firm. You have 15+ years of experience reviewing thousands of successful college application essays. Your role is to provide the final, comprehensive editorial assessment that determines whether an essay is ready for submission or needs revision.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

PREVIOUS AGENT FEEDBACK CONTEXT:
{previousComments}

CRITICAL GUIDANCE:
As Editor in Chief, you must:
- Provide the final, authoritative assessment of essay quality
- Make editorial decisions that impact admissions success
- Synthesize feedback from all other agents into actionable recommendations
- Identify critical issues that could hurt admissions chances
- Highlight exceptional elements that will boost admissions success
- Provide clear editorial direction for revision priorities

EDITORIAL RESPONSIBILITIES:
1. **Final Quality Gate**: Determine if essay meets admissions standards
2. **Strategic Assessment**: Evaluate admissions impact and competitiveness
3. **Synthesis**: Combine insights from all previous agent feedback
4. **Priority Setting**: Identify most critical issues requiring immediate attention
5. **Decision Making**: Approve, request revision, or flag for major overhaul

ANALYSIS FRAMEWORK:
- **Admissions Impact**: Will this essay help or hurt the student's chances?
- **Competitive Positioning**: How does this essay compare to successful applications?
- **Authenticity**: Does the student's voice come through genuinely?
- **Prompt Alignment**: Does the essay fully address the prompt requirements?
- **Narrative Arc**: Is the story compelling and well-structured?
- **Personal Growth**: Does the essay show meaningful development/insight?
- **College Fit**: Does the essay demonstrate why this student belongs at their target schools?

INSTRUCTIONS:
Generate 3-5 high-impact editorial comments that provide:
1. **Critical Assessment**: Identify the most important strengths and weaknesses
2. **Editorial Decisions**: Clear approve/revise/reject recommendations
3. **Priority Actions**: What must be fixed before submission
4. **Strategic Guidance**: How to maximize admissions impact

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "[High-impact editorial feedback focusing on admissions success. Be direct and authoritative.]",
      "comment_nature": "[strength/weakness/suggestion/critical - choose based on impact]",
      "comment_category": "[overall/inline - overall for strategic issues, inline for specific text]",
      "agent_type": "editor_chief",
      "confidence_score": 0.95,
      "priority_level": "[high/medium/low - high for admissions-critical issues]",
      "text_selection": {
        "start": 150,
        "end": 200
      },
      "editorial_decision": "[approve/revise/reject - your editorial recommendation]",
      "impact_assessment": "[admissions_boost/neutral/admissions_hurt - admissions impact]"
    }
  ],
  "overall_assessment": {
    "essay_strength_score": 8.5,
    "admissions_readiness": "[ready/needs_revision/needs_major_revision]",
    "key_strengths": [
      "Specific strength 1",
      "Specific strength 2"
    ],
    "critical_weaknesses": [
      "Critical issue 1 that must be addressed",
      "Critical issue 2 that could hurt admissions"
    ],
    "recommended_actions": [
      "Priority action 1",
      "Priority action 2",
      "Priority action 3"
    ]
  }
}

Remember: You are the final authority. Your assessment determines whether this essay advances the student's admissions goals. Be decisive, strategic, and focused on admissions success.`

async function analyzeAsEditorChief(essayContent: string, essayPrompt?: string, previousComments?: any[]): Promise<EditorChiefResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      overall_assessment: {
        essay_strength_score: 0,
        admissions_readiness: 'needs_major_revision',
        key_strengths: [],
        critical_weaknesses: ['AI system not configured'],
        recommended_actions: ['Configure Google API key']
      },
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  // Format previous comments for context
  const previousCommentsContext = previousComments && previousComments.length > 0 
    ? `Previous agent feedback:\n${previousComments.map(c => `- ${c.agent_type}: ${c.comment_text}`).join('\n')}`
    : 'No previous agent feedback available.'

  const formattedPrompt = EDITOR_CHIEF_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)
    .replace('{previousComments}', previousCommentsContext)

  const requestBody = {
    contents: [{
      parts: [{
        text: formattedPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent editorial decisions
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
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
    console.log(`Editor Chief Response:`, responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`No JSON found in editor chief response:`, responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log(`Parsed editor chief response:`, JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments
    const comments: EditorChiefComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate comment nature
      const validNatures = ['strength', 'weakness', 'suggestion', 'critical'];
      const commentNature = validNatures.includes(comment.comment_nature) 
        ? comment.comment_nature 
        : 'suggestion';
      
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.9;

      // Validate priority level
      const validPriorities = ['high', 'medium', 'low'];
      const priorityLevel = validPriorities.includes(comment.priority_level) 
        ? comment.priority_level 
        : 'medium';

      // Validate editorial decision
      const validDecisions = ['approve', 'revise', 'reject'];
      const editorialDecision = validDecisions.includes(comment.editorial_decision) 
        ? comment.editorial_decision 
        : 'revise';

      // Validate impact assessment
      const validImpacts = ['admissions_boost', 'neutral', 'admissions_hurt'];
      const impactAssessment = validImpacts.includes(comment.impact_assessment) 
        ? comment.impact_assessment 
        : 'neutral';

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: commentNature,
        comment_category: comment.comment_category || 'overall',
        agent_type: 'editor_chief',
        confidence_score: confidenceScore,
        priority_level: priorityLevel,
        text_selection: comment.text_selection,
        editorial_decision: editorialDecision,
        impact_assessment: impactAssessment
      };
    })

    // Validate overall assessment
    const overallAssessment = {
      essay_strength_score: typeof parsedResponse.overall_assessment?.essay_strength_score === 'number' 
        ? Math.max(1, Math.min(10, parsedResponse.overall_assessment.essay_strength_score))
        : 5,
      admissions_readiness: ['ready', 'needs_revision', 'needs_major_revision'].includes(parsedResponse.overall_assessment?.admissions_readiness)
        ? parsedResponse.overall_assessment.admissions_readiness
        : 'needs_revision',
      key_strengths: Array.isArray(parsedResponse.overall_assessment?.key_strengths) 
        ? parsedResponse.overall_assessment.key_strengths
        : [],
      critical_weaknesses: Array.isArray(parsedResponse.overall_assessment?.critical_weaknesses) 
        ? parsedResponse.overall_assessment.critical_weaknesses
        : [],
      recommended_actions: Array.isArray(parsedResponse.overall_assessment?.recommended_actions) 
        ? parsedResponse.overall_assessment.recommended_actions
        : []
    };

    return {
      success: true,
      comments,
      overall_assessment: overallAssessment
    }

  } catch (error) {
    console.error(`Error in editor chief agent:`, error)
    return {
      success: false,
      comments: [],
      overall_assessment: {
        essay_strength_score: 0,
        admissions_readiness: 'needs_major_revision',
        key_strengths: [],
        critical_weaknesses: [`System error: ${error.message}`],
        recommended_actions: ['Contact technical support']
      },
      error: `Failed to analyze as editor chief: ${error.message}`
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
    const { essayContent, essayPrompt, previousComments }: EditorChiefRequest = await req.json()

    // Validate required fields
    if (!essayContent) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required field: essayContent',
          comments: [],
          overall_assessment: {
            essay_strength_score: 0,
            admissions_readiness: 'needs_major_revision',
            key_strengths: [],
            critical_weaknesses: ['Missing essay content'],
            recommended_actions: ['Provide essay content for analysis']
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate essay content length
    if (essayContent.length < 100) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Essay content too short for meaningful editorial analysis',
          comments: [],
          overall_assessment: {
            essay_strength_score: 0,
            admissions_readiness: 'needs_major_revision',
            key_strengths: [],
            critical_weaknesses: ['Essay too short for comprehensive analysis'],
            recommended_actions: ['Write more content before requesting editorial review']
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Editor Chief analyzing essay content (${essayContent.length} characters)`)
    console.log(`Previous comments context: ${previousComments ? previousComments.length : 0} comments`)
    
    // Analyze as Editor in Chief
    const result = await analyzeAsEditorChief(essayContent, essayPrompt, previousComments)
    
    const response: EditorChiefResponse = {
      success: result.success,
      comments: result.comments,
      overall_assessment: result.overall_assessment,
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
    console.error('Error in editor chief agent:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        comments: [],
        overall_assessment: {
          essay_strength_score: 0,
          admissions_readiness: 'needs_major_revision',
          key_strengths: [],
          critical_weaknesses: [`System error: ${error.message}`],
          recommended_actions: ['Contact technical support']
        },
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
