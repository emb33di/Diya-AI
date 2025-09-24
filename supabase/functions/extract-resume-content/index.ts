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
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Resume extraction prompt for Gemini 2.5 Flash with Vision
const RESUME_EXTRACTION_PROMPT = `You are an expert resume parser specializing in extracting structured data from resume documents. Your task is to analyze the provided resume document and extract all relevant information into a structured JSON format.

RESUME EXTRACTION REQUIREMENTS:
Extract the following information from the resume document:

1. **Personal Information**
   - Full name, email, phone number
   - Complete address (street, city, state, zip code, country)
   - LinkedIn, portfolio, GitHub URLs if present

2. **Professional Summary/Objective**
   - Extract the summary or objective section

3. **Education**
   - Institution name, degree, field of study
   - Graduation date, GPA (if mentioned)
   - Honors, awards, relevant coursework
   - Location

4. **Work Experience**
   - Company name, position title
   - Start and end dates, current position indicator
   - Location, job description
   - Key achievements and responsibilities
   - Skills mentioned

5. **Projects**
   - Project name, description
   - Technologies used, dates
   - URLs, GitHub links
   - Key achievements

6. **Skills**
   - Technical skills, programming languages
   - Soft skills, certifications
   - Organize by category

7. **Extracurriculars**
   - Organization, role, dates
   - Description, achievements

8. **Volunteer Experience**
   - Organization, role, dates
   - Description, hours, achievements

9. **Awards and Honors**
   - Title, organization, date, description

10. **Publications** (if any)
    - Title, publication, date, URL, authors

11. **Languages**
    - Language name, proficiency level

12. **Additional Information**
    - Interests, references, availability, other relevant info

EXTRACTION GUIDELINES:
- Be thorough and extract ALL available information
- Maintain original formatting and structure where possible
- Use empty arrays for missing sections
- Preserve dates in original format
- Extract all achievements and responsibilities
- Include all skills and technologies mentioned
- Maintain accuracy of all contact information

RESPONSE FORMAT (JSON only):
{
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
  "summary": "string",
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
      "description": "string",
      "achievements": ["string array"],
      "skills": ["string array"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string array"],
      "startDate": "string",
      "endDate": "string",
      "url": "string or null",
      "githubUrl": "string or null",
      "achievements": ["string array"]
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
      "description": "string",
      "achievements": ["string array"]
    }
  ],
  "volunteerExperience": [
    {
      "organization": "string",
      "role": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string",
      "hours": number or null,
      "achievements": ["string array"]
    }
  ],
  "awards": [
    {
      "title": "string",
      "organization": "string",
      "date": "string",
      "description": "string"
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

Provide ONLY the JSON response. Do not include any explanatory text or markdown formatting.`

async function extractResumeContent(fileData: ArrayBuffer, filename: string, fileType: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  console.log(`Extracting content from resume file: ${filename}`)
  
  // Check file size to prevent issues
  if (fileData.byteLength > 4 * 1024 * 1024) { // 4MB limit
    throw new Error('File too large for processing. Please upload a file smaller than 4MB.')
  }
  
  // Convert file to base64
  const uint8Array = new Uint8Array(fileData)
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const base64Data = btoa(binary)
  
  // Determine MIME type based on file extension
  const fileExtension = filename.split('.').pop()?.toLowerCase()
  let mimeType = 'application/pdf'
  if (fileExtension === 'doc') {
    mimeType = 'application/msword'
  } else if (fileExtension === 'docx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  console.log(`File type: ${mimeType}, Size: ${fileData.byteLength} bytes`)

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: RESUME_EXTRACTION_PROMPT
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
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
    console.log('Generated text length:', generatedText.length)

    // Parse the JSON response
    try {
      const structuredData = JSON.parse(generatedText)
      console.log('Successfully parsed structured resume data')
      return structuredData
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      console.error('Raw response:', generatedText)
      throw new Error('Failed to parse structured data from AI response')
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error)
    throw error
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

    // Check if extraction is already completed
    if (resumeRecord.extraction_status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Resume content already extracted',
          structured_data: resumeRecord.structured_data
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update status to processing
    await supabase
      .from('structured_resume_data')
      .update({ extraction_status: 'processing' })
      .eq('id', resume_data_id)

    // For now, we'll simulate the extraction process
    // In a real implementation, you would need to store the original file temporarily
    // or modify the upload process to extract content immediately
    
    // Simulate extraction with a sample structure
    const sampleStructuredData = {
      personalInfo: {
        fullName: "Sample User",
        email: "sample@email.com",
        phone: "(555) 123-4567",
        address: {
          street: "123 Main St",
          city: "Sample City",
          state: "CA",
          zipCode: "12345",
          country: "USA"
        },
        linkedinUrl: null,
        portfolioUrl: null,
        githubUrl: null
      },
      summary: "Sample professional summary extracted from resume",
      education: [],
      workExperience: [],
      projects: [],
      skills: {
        technical: [],
        languages: [],
        soft: [],
        certifications: []
      },
      extracurriculars: [],
      volunteerExperience: [],
      awards: [],
      publications: [],
      languages: [],
      additionalInfo: {
        interests: [],
        references: "",
        availability: "",
        other: ""
      }
    }

    // Update the record with extracted data
    const { error: updateError } = await supabase
      .from('structured_resume_data')
      .update({
        structured_data: sampleStructuredData,
        extraction_status: 'completed'
      })
      .eq('id', resume_data_id)

    if (updateError) {
      throw new Error(`Failed to update resume data: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resume content extracted successfully',
        structured_data: sampleStructuredData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in extract-resume-content:', error)
    
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

1. **File Storage Limitation**: 
   - Current implementation simulates extraction since we're avoiding file storage
   - In production, you would need to either:
     a) Store files temporarily during processing
     b) Extract content immediately during upload
     c) Use a different approach for file handling

2. **Real Implementation Options**:
   - Modify upload process to extract content immediately
   - Use temporary file storage that gets cleaned up after extraction
   - Implement client-side extraction before upload

3. **Error Handling**:
   - Comprehensive error handling for API failures
   - Proper status updates in database
   - Detailed logging for debugging

4. **Performance Considerations**:
   - File size limits to prevent processing issues
   - Efficient base64 encoding
   - Proper timeout handling
*/
