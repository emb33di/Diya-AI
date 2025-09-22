import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface ResumeFeedbackRequest {
  version_id: string;
  userId: string;
}

interface ResumeFeedback {
  strengths: string[];
  weaknesses: string[];
  overall_score: number;
  suggestions: string[];
  college_readiness_score: number;
  academic_analysis: {
    academic_achievements: string[];
    leadership_roles: string[];
    community_service: string[];
    extracurricular_depth: number;
  };
  format_analysis: {
    structure_score: number;
    readability_score: number;
    visual_appeal_score: number;
  };
  content_analysis: {
    experience_quality: number;
    skills_demonstration: number;
    impact_quantification: number;
  };
}

interface ResumeFeedbackResponse {
  success: boolean;
  feedback: ResumeFeedback;
  message: string;
  version_id: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// College Application Resume Analysis Prompt for Gemini 2.5 Flash with Vision
const RESUME_ANALYSIS_PROMPT = `You are an expert college admissions counselor specializing in student resume analysis for college applications. Analyze the following student resume comprehensively and provide detailed feedback for college admissions.

RESUME INFORMATION:
- Filename: {filename}
- File Size: {fileSize} bytes
- File Type: {fileType}

ANALYSIS REQUIREMENTS:
Provide a comprehensive analysis covering:

1. **Overall Assessment** (0-100 score)
2. **Key Strengths** (3-5 specific strengths)
3. **Areas for Improvement** (3-5 specific weaknesses)
4. **Actionable Suggestions** (5-7 specific recommendations)
5. **College Readiness Score** (0-100)
6. **Academic & Extracurricular Analysis** (academic achievements, leadership, community service)
7. **Format Analysis** (structure, readability, visual appeal)
8. **Content Analysis** (experience quality, skills demonstration, impact)

FOCUS AREAS FOR COLLEGE ADMISSIONS:
- Academic achievements and rigor
- Leadership experience and initiative
- Community service and social impact
- Extracurricular activities and depth of involvement
- Unique talents and special abilities
- Personal growth and character development
- College readiness indicators
- Holistic profile presentation

RESPONSE FORMAT (JSON only):
{
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
  "overall_score": 85,
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "college_readiness_score": 78,
  "academic_analysis": {
    "academic_achievements": ["achievement1", "achievement2"],
    "leadership_roles": ["role1", "role2"],
    "community_service": ["service1", "service2"],
    "extracurricular_depth": 0.75
  },
  "format_analysis": {
    "structure_score": 82,
    "readability_score": 75,
    "visual_appeal_score": 80
  },
  "content_analysis": {
    "experience_quality": 85,
    "skills_demonstration": 78,
    "impact_quantification": 72
  }
}

Provide specific, actionable feedback that will help improve the resume's effectiveness for college applications and admissions committees. Focus on what makes a student stand out to admissions officers.`

async function generateResumeFeedback(resumeVersion: any): Promise<ResumeFeedback> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  console.log(`Processing resume file: ${resumeVersion.file_path}`)
  
  // Download the resume file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('resume-files')
    .download(resumeVersion.file_path)

  if (downloadError) {
    throw new Error(`Failed to download resume file: ${downloadError.message}`)
  }

  // Convert file to base64 using Deno's efficient method
  const arrayBuffer = await fileData.arrayBuffer()
  
  // Check file size to prevent issues
  if (arrayBuffer.byteLength > 4 * 1024 * 1024) { // 4MB limit
    throw new Error('File too large for processing. Please upload a file smaller than 4MB.')
  }
  
  // Use a simple base64 encoding approach
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const base64Data = btoa(binary)
  
  // Determine MIME type based on file extension
  const fileExtension = resumeVersion.filename.split('.').pop()?.toLowerCase()
  let mimeType = 'application/pdf'
  if (fileExtension === 'doc') {
    mimeType = 'application/msword'
  } else if (fileExtension === 'docx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  console.log(`File type: ${mimeType}, Size: ${arrayBuffer.byteLength} bytes`)

  const prompt = RESUME_ANALYSIS_PROMPT
    .replace('{filename}', resumeVersion.filename || 'Unknown')
    .replace('{fileSize}', resumeVersion.file_size?.toString() || '0')
    .replace('{fileType}', resumeVersion.file_type || 'Unknown')

  const requestBody = {
    contents: [{
      parts: [
        {
          text: prompt
        },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.3,
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
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    
    // Validate and return the feedback
    return {
      strengths: parsedResponse.strengths || [],
      weaknesses: parsedResponse.weaknesses || [],
      overall_score: parsedResponse.overall_score || 0,
      suggestions: parsedResponse.suggestions || [],
      college_readiness_score: parsedResponse.college_readiness_score || 0,
      academic_analysis: parsedResponse.academic_analysis || {
        academic_achievements: [],
        leadership_roles: [],
        community_service: [],
        extracurricular_depth: 0
      },
      format_analysis: parsedResponse.format_analysis || {
        structure_score: 0,
        readability_score: 0,
        visual_appeal_score: 0
      },
      content_analysis: parsedResponse.content_analysis || {
        experience_quality: 0,
        skills_demonstration: 0,
        impact_quantification: 0
      }
    }

  } catch (error) {
    console.error('Error generating resume feedback:', error)
    throw new Error(`Failed to generate resume feedback: ${error.message}`)
  }
}

async function checkExistingFeedback(versionId: string, userId: string): Promise<boolean> {
  const { data: existingFeedback, error } = await supabase
    .from('resume_versions')
    .select('feedback')
    .eq('id', versionId)
    .eq('user_id', userId)
    .not('feedback', 'is', null)
    .limit(1)

  if (error) {
    throw new Error(`Failed to check existing feedback: ${error.message}`)
  }

  return existingFeedback && existingFeedback.length > 0 && existingFeedback[0].feedback !== null
}

async function saveFeedbackToDatabase(versionId: string, feedback: ResumeFeedback): Promise<void> {
  const { error } = await supabase
    .from('resume_versions')
    .update({ 
      feedback: feedback,
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', versionId)

  if (error) {
    throw new Error(`Failed to save feedback: ${error.message}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { version_id, userId }: ResumeFeedbackRequest = await req.json()

    // Validate required fields
    if (!version_id || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: version_id, userId',
          feedback: null
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentication required',
          feedback: null
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the resume version from database
    const { data: resumeVersion, error: fetchError } = await supabase
      .from('resume_versions')
      .select('*')
      .eq('id', version_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !resumeVersion) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Resume version not found or access denied',
          feedback: null
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if feedback already exists
    console.log(`Checking for existing feedback for resume version ${version_id}`)
    const hasExistingFeedback = await checkExistingFeedback(version_id, userId)
    
    if (hasExistingFeedback) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Feedback has already been generated for this resume version.',
          feedback: null
        }),
        {
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update status to processing
    await supabase
      .from('resume_versions')
      .update({ status: 'processing' })
      .eq('id', version_id)

    // Generate AI feedback using Gemini 2.5 Flash
    console.log(`Generating AI feedback for resume version ${version_id}`)
    const feedback = await generateResumeFeedback(resumeVersion)

    // Save feedback to database
    await saveFeedbackToDatabase(version_id, feedback)

    const response: ResumeFeedbackResponse = {
      success: true,
      feedback: feedback,
      message: `Generated comprehensive resume feedback successfully`,
      version_id
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-resume-feedback:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        feedback: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* 
FUTURE ENHANCEMENTS:

1. **Vision Model Integration**: 
   - Use Gemini 2.5 Flash's vision capabilities to analyze resume layout and formatting
   - Extract text from PDF/DOC files using libraries like pdf-parse, mammoth, antiword
   - Analyze visual elements like headers, bullet points, spacing, and overall design

2. **Advanced AI Analysis**:
   - Industry-specific keyword optimization
   - ATS compatibility scoring with real ATS systems
   - Skills gap analysis against job descriptions
   - Salary range estimation based on experience and skills

3. **Multi-Modal Analysis**:
   - Combine text analysis with visual layout analysis
   - Detect formatting issues that might affect ATS parsing
   - Suggest visual improvements for better readability

4. **Integration with Job Market Data**:
   - Real-time keyword trends for specific industries
   - Competitive analysis against similar profiles
   - Industry-specific best practices and recommendations
*/
