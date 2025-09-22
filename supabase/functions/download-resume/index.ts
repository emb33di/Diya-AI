import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResumeBullet {
  id: string
  bullet_text: string
  bullet_order: number
}

interface ResumeActivity {
  id: string
  user_id: string
  category: string
  title: string
  position: string
  from_date: string
  to_date: string
  is_current: boolean
  display_order: number
  bullets: ResumeBullet[]
}

interface ResumeData {
  academic: ResumeActivity[]
  experience: ResumeActivity[]
  projects: ResumeActivity[]
  extracurricular: ResumeActivity[]
  volunteering: ResumeActivity[]
  skills: ResumeActivity[]
  interests: ResumeActivity[]
  languages: ResumeActivity[]
}

interface UserProfile {
  full_name: string
  email_address?: string
  phone_number?: string
  city?: string
  state?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch user profile data for resume header
    const { data: profileData, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('full_name, email_address, phone_number, city, state')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`)
    }

    // Fetch resume activities data
    const { data: resumeActivitiesData, error: resumeError } = await supabaseClient
      .from('resume_activities_with_bullets')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order')

    if (resumeError) {
      throw new Error(`Failed to fetch resume data: ${resumeError.message}`)
    }

    // Organize resume data by category
    const resumeData: ResumeData = {
      academic: [],
      experience: [],
      projects: [],
      extracurricular: [],
      volunteering: [],
      skills: [],
      interests: [],
      languages: []
    }

    if (resumeActivitiesData) {
      resumeActivitiesData.forEach((activity: any) => {
        const bullets = Array.isArray(activity.bullets) ? activity.bullets : []
        const activityWithBullets = {
          ...activity,
          bullets
        }
        
        if (resumeData[activity.category as keyof ResumeData]) {
          resumeData[activity.category as keyof ResumeData].push(activityWithBullets)
        }
      })
    }

    const userProfile: UserProfile = profileData || {
      full_name: user.user_metadata?.full_name || 'Resume',
      email_address: user.email,
      phone_number: undefined,
      city: undefined,
      state: undefined
    }

    // Generate HTML from resume data
    const htmlContent = generateResumeHtml(resumeData, userProfile)

    // Call HTML/CSS to Image API
    const pdfApiKey = Deno.env.get('PDF_API_KEY')
    if (!pdfApiKey) {
      throw new Error('PDF_API_KEY environment variable is not set')
    }

    const pdfApiResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(pdfApiKey + ':')}`,
      },
      body: JSON.stringify({
        html: htmlContent,
        css: '', // CSS is embedded in HTML
        google_fonts: 'Arial',
        device_scale: 2,
        format: 'pdf',
        width: 794, // A4 width in pixels
        height: 1123 // A4 height in pixels
      })
    })

    if (!pdfApiResponse.ok) {
      const errorText = await pdfApiResponse.text()
      throw new Error(`PDF API error: ${pdfApiResponse.status} - ${errorText}`)
    }

    // Stream the PDF back to the client
    return new Response(pdfApiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resume-${user.id}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error generating resume PDF:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateResumeHtml(data: ResumeData, userProfile: UserProfile): string {
  const { academic, experience, projects, extracurricular, volunteering, skills, interests, languages } = data

  // Format date range
  const formatDateRange = (fromDate: string, toDate: string, isCurrent: boolean) => {
    if (!fromDate && !toDate) return ''
    const from = fromDate || ''
    const to = isCurrent ? 'Present' : (toDate || '')
    return from && to ? `${from} - ${to}` : (from || to)
  }

  // Generate personal info section
  const personalInfoHtml = `
    <div class="header">
      <h1 class="name">${userProfile.full_name}</h1>
      <div class="contact-info">
        ${userProfile.email_address ? `<span>${userProfile.email_address}</span>` : ''}
        ${userProfile.phone_number ? `<span>${userProfile.phone_number}</span>` : ''}
        ${userProfile.city && userProfile.state ? `<span>${userProfile.city}, ${userProfile.state}</span>` : ''}
      </div>
    </div>
  `

  // Generate academic section
  const academicHtml = academic && academic.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Education</h2>
      ${academic.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
            <div class="dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate experience section
  const experienceHtml = experience && experience.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Experience</h2>
      ${experience.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
            <div class="dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate projects section
  const projectsHtml = projects && projects.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Projects</h2>
      ${projects.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
            <div class="dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate extracurricular section
  const extracurricularHtml = extracurricular && extracurricular.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Extracurricular Activities</h2>
      ${extracurricular.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
            <div class="dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate volunteering section
  const volunteeringHtml = volunteering && volunteering.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Volunteering</h2>
      ${volunteering.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
            <div class="dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate skills section
  const skillsHtml = skills && skills.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Skills</h2>
      ${skills.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate interests section
  const interestsHtml = interests && interests.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Interests</h2>
      ${interests.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  // Generate languages section
  const languagesHtml = languages && languages.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Languages</h2>
      ${languages.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">
              <strong>${item.title}</strong>
            </div>
          </div>
          ${item.position ? `<div class="position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resume</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }

        .name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #2c3e50;
        }

        .contact-info {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 14px;
          color: #666;
        }

        .section {
          margin-bottom: 25px;
        }

        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 15px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }

        .item {
          margin-bottom: 20px;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5px;
        }

        .item-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-title strong {
          font-size: 16px;
          color: #2c3e50;
        }

        .location {
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .dates {
          font-size: 14px;
          color: #666;
          font-weight: 500;
          white-space: nowrap;
        }

        .position {
          font-size: 14px;
          color: #555;
          margin-bottom: 8px;
          font-style: italic;
        }

        .bullets {
          margin-left: 20px;
          margin-bottom: 10px;
        }

        .bullets li {
          margin-bottom: 4px;
          font-size: 14px;
        }

        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .skill-tag {
          background-color: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #555;
          border: 1px solid #ddd;
        }

        @media print {
          body {
            padding: 0;
          }
          
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${personalInfoHtml}
      ${academicHtml}
      ${experienceHtml}
      ${projectsHtml}
      ${extracurricularHtml}
      ${volunteeringHtml}
      ${skillsHtml}
      ${interestsHtml}
      ${languagesHtml}
    </body>
    </html>
  `
}
