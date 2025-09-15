import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

// Resume Analysis Prompt for Structured Data
const RESUME_ANALYSIS_PROMPT = `You are an expert college admissions counselor specializing in student resume analysis for college applications. Analyze the following structured resume data comprehensively and provide detailed feedback for college admissions.

RESUME DATA TO ANALYZE:
{resumeData}

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

IMPROVEMENT RECOMMENDATIONS:
Based on your analysis, provide specific improvements to the resume content, including:
- Enhanced descriptions for experiences
- Better achievement quantification
- Improved skill presentation
- Stronger academic highlights
- More compelling extracurricular descriptions

RESPONSE FORMAT (JSON only):
{
  "overall_score": 85,
  "college_readiness_score": 78,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
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
  },
  "recommendations": {
    "content_improvements": ["improvement 1", "improvement 2"],
    "format_improvements": ["format improvement 1", "format improvement 2"],
    "skill_additions": ["skill 1", "skill 2"],
    "experience_enhancements": ["enhancement 1", "enhancement 2"]
  },
  "improved_resume_data": {
    "personalInfo": {
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "address": {
        "street": "string",
        "city": "string",
        "state": "string",
        "zipCode": "string",
        "country": "string"
      },
      "linkedinUrl": "string or null",
      "portfolioUrl": "string or null",
      "githubUrl": "string or null"
    },
    "summary": "improved professional summary",
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "fieldOfStudy": "string",
        "graduationDate": "string",
        "gpa": "string or null",
        "honors": ["string array"],
        "relevantCoursework": ["string array"],
        "location": "string"
      }
    ],
    "workExperience": [
      {
        "company": "string",
        "position": "string",
        "startDate": "string",
        "endDate": "string",
        "isCurrentPosition": boolean,
        "location": "string",
        "description": "improved description",
        "achievements": ["improved achievements"],
        "skills": ["string array"]
      }
    ],
    "projects": [
      {
        "name": "string",
        "description": "improved description",
        "technologies": ["string array"],
        "startDate": "string",
        "endDate": "string",
        "url": "string or null",
        "githubUrl": "string or null",
        "achievements": ["improved achievements"]
      }
    ],
    "skills": {
      "technical": ["string array"],
      "languages": ["string array"],
      "soft": ["string array"],
      "certifications": ["string array"]
    },
    "extracurriculars": [
      {
        "organization": "string",
        "role": "string",
        "startDate": "string",
        "endDate": "string",
        "description": "improved description",
        "achievements": ["improved achievements"]
      }
    ],
    "volunteerExperience": [
      {
        "organization": "string",
        "role": "string",
        "startDate": "string",
        "endDate": "string",
        "description": "improved description",
        "hours": number or null,
        "achievements": ["improved achievements"]
      }
    ],
    "awards": [
      {
        "title": "string",
        "organization": "string",
        "date": "string",
        "description": "improved description"
      }
    ],
    "publications": [
      {
        "title": "string",
        "publication": "string",
        "date": "string",
        "url": "string or null",
        "authors": ["string array"]
      }
    ],
    "languages": [
      {
        "language": "string",
        "proficiency": "Native|Fluent|Conversational|Basic"
      }
    ],
    "additionalInfo": {
      "interests": ["string array"],
      "references": "string",
      "availability": "string",
      "other": "string"
    }
  }
}

Provide specific, actionable feedback that will help improve the resume's effectiveness for college applications and admissions committees. Focus on what makes a student stand out to admissions officers. Include an improved version of the resume data with enhanced descriptions, better achievement quantification, and stronger presentation.`

async function generateResumeFeedback(resumeData: any): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  console.log('Generating feedback for structured resume data')
  
  const prompt = RESUME_ANALYSIS_PROMPT.replace('{resumeData}', JSON.stringify(resumeData, null, 2))

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 32,
      topP: 1,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Gemini API response received')

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('No content generated by Gemini API')
    }

    const generatedText = result.candidates[0].content.parts[0].text
    console.log('Generated feedback text length:', generatedText.length)

    // Parse the JSON response
    try {
      const feedbackData = JSON.parse(generatedText)
      console.log('Successfully parsed feedback data')
      return feedbackData
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      console.error('Raw response:', generatedText)
      throw new Error('Failed to parse feedback data from AI response')
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error)
    throw error
  }
}

async function saveFeedbackToDatabase(resumeDataId: string, feedbackData: any, userId: string) {
  const { error } = await supabase
    .from('resume_feedback')
    .insert({
      resume_data_id: resumeDataId,
      user_id: userId,
      feedback_data: feedbackData,
      feedback_status: 'completed'
    })

  if (error) {
    throw new Error(`Failed to save feedback to database: ${error.message}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { resume_data_id } = await req.json()

    if (!resume_data_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'resume_data_id is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the resume record
    const { data: resumeRecord, error: fetchError } = await supabase
      .from('structured_resume_data')
      .select('*')
      .eq('id', resume_data_id)
      .single()

    if (fetchError || !resumeRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Resume record not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if extraction is completed
    if (resumeRecord.extraction_status !== 'completed') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Resume extraction must be completed before generating feedback'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('resume_feedback')
      .select('id')
      .eq('resume_data_id', resume_data_id)
      .single()

    if (existingFeedback) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Feedback has already been generated for this resume'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate AI feedback
    console.log(`Generating AI feedback for resume ${resume_data_id}`)
    const feedbackData = await generateResumeFeedback(resumeRecord.structured_data)

    // Save feedback to database
    await saveFeedbackToDatabase(resume_data_id, feedbackData, resumeRecord.user_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resume feedback generated successfully',
        feedback_data: feedbackData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-structured-resume-feedback:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* 
IMPLEMENTATION NOTES:

1. **Structured Data Analysis**: 
   - Analyzes the structured resume data instead of raw files
   - Provides comprehensive feedback for college admissions
   - Generates improved resume data with enhanced content

2. **Feedback Components**:
   - Overall and college readiness scores
   - Detailed strengths and weaknesses analysis
   - Specific recommendations for improvement
   - Enhanced resume data with better descriptions

3. **AI Enhancement**:
   - Improves achievement descriptions with quantification
   - Enhances skill presentation and categorization
   - Strengthens academic and extracurricular highlights
   - Provides more compelling content for admissions

4. **Database Integration**:
   - Stores feedback in structured format
   - Links feedback to original resume data
   - Prevents duplicate feedback generation
   - Maintains proper user associations
*/
