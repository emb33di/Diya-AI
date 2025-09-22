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

    // Return the HTML directly for preview
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8'
      }
    })

  } catch (error) {
    console.error('Error generating resume preview:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate preview', details: error.message }),
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
    <div class="section education-section">
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
    <div class="section experience-section">
      <h2 class="section-title">Professional Experience</h2>
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
    <div class="section projects-section">
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
    <div class="section extracurricular-section">
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
    <div class="section volunteering-section">
      <h2 class="section-title">Volunteer Experience</h2>
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
    <div class="section skills-section">
      <h2 class="section-title">Technical Skills</h2>
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
    <div class="section interests-section">
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
    <div class="section languages-section">
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
      <title>Resume Preview</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.4;
          color: #2c3e50;
          background: white;
          padding: 0.75in;
          font-size: 11pt;
          max-width: 8.5in;
          margin: 0 auto;
        }

        /* Header Section */
        .header {
          text-align: center;
          margin-bottom: 0.4in;
          border-bottom: 2px solid #2c3e50;
          padding-bottom: 0.15in;
        }

        .name {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 0.1in;
          color: #2c3e50;
          letter-spacing: 1px;
        }

        .contact-info {
          display: flex;
          justify-content: center;
          gap: 0.3in;
          flex-wrap: wrap;
          font-size: 10pt;
          color: #34495e;
        }

        .contact-info span {
          padding: 0.05in 0.1in;
          background-color: #f8f9fa;
          border-radius: 3px;
        }

        /* Section Styling */
        .section {
          margin-bottom: 0.25in;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 14pt;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 0.1in;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 0.05in;
        }

        /* Experience/Education Items */
        .item {
          margin-bottom: 0.15in;
          page-break-inside: avoid;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.05in;
        }

        .item-title {
          flex: 1;
        }

        .item-title strong {
          font-size: 12pt;
          color: #2c3e50;
          font-weight: bold;
        }

        .dates {
          font-size: 10pt;
          color: #7f8c8d;
          font-weight: 500;
          white-space: nowrap;
          margin-left: 0.2in;
        }

        .position {
          font-size: 11pt;
          color: #34495e;
          margin-bottom: 0.08in;
          font-style: italic;
          font-weight: 500;
        }

        /* Bullet Points */
        .bullets {
          margin-left: 0.2in;
          margin-bottom: 0.1in;
        }

        .bullets li {
          margin-bottom: 0.05in;
          font-size: 10pt;
          line-height: 1.3;
          color: #2c3e50;
        }

        /* Skills Section */
        .skills-section .item {
          margin-bottom: 0.1in;
        }

        .skills-section .item-title strong {
          font-size: 11pt;
          color: #2c3e50;
        }

        .skills-section .bullets {
          margin-left: 0;
        }

        .skills-section .bullets li {
          display: inline-block;
          background-color: #ecf0f1;
          padding: 0.03in 0.08in;
          margin: 0.02in 0.05in 0.02in 0;
          border-radius: 3px;
          font-size: 9pt;
          border: 1px solid #bdc3c7;
        }

        /* Interests and Languages */
        .interests-section .bullets,
        .languages-section .bullets {
          margin-left: 0;
        }

        .interests-section .bullets li,
        .languages-section .bullets li {
          display: inline-block;
          margin-right: 0.1in;
          margin-bottom: 0.05in;
          font-size: 10pt;
        }

        /* Projects Section */
        .projects-section .item-title strong {
          color: #2980b9;
        }

        /* Extracurricular Section */
        .extracurricular-section .item-title strong {
          color: #27ae60;
        }

        /* Volunteering Section */
        .volunteering-section .item-title strong {
          color: #e74c3c;
        }

        /* Print Optimizations */
        @media print {
          body {
            padding: 0.5in;
            font-size: 10pt;
          }
          
          .section {
            page-break-inside: avoid;
          }
          
          .item {
            page-break-inside: avoid;
          }
          
          .header {
            margin-bottom: 0.3in;
          }
          
          .name {
            font-size: 22pt;
          }
          
          .section-title {
            font-size: 13pt;
          }
        }

        /* Responsive adjustments for PDF generation */
        @media screen {
          body {
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            margin: 0.5in auto;
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
