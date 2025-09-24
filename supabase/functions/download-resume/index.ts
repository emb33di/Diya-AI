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
    return from && to ? `${from} – ${to}` : (from || to)
  }

  // Generate personal info section
  const personalInfoHtml = `
    <header class="header">
      <h1 class="name">${userProfile.full_name || 'Resume'}</h1>
      <p class="contact-info">${userProfile.phone_number || ''}${userProfile.phone_number && userProfile.email_address ? ' | ' : ''}${userProfile.email_address || ''}</p>
    </header>
  `

  // Generate academic section
  const academicHtml = academic && academic.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Education</h2>
      ${academic.map(item => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${item.title}</span>
            <span class="entry-dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</span>
          </div>
          ${item.position ? `<div class="entry-position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="entry-bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : ''

  // Generate experience section
  const experienceHtml = experience && experience.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Experience</h2>
      ${experience.map(item => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${item.title}</span>
            <span class="entry-dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</span>
          </div>
          ${item.position ? `<div class="entry-position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="entry-bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : ''

  // Generate projects section
  const projectsHtml = projects && projects.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Projects</h2>
      ${projects.map(item => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${item.title}</span>
            <span class="entry-dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</span>
          </div>
          ${item.position ? `<div class="entry-position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="entry-bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : ''

  // Generate extracurricular section
  const extracurricularHtml = extracurricular && extracurricular.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Extracurriculars</h2>
      ${extracurricular.map(item => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${item.title}</span>
            <span class="entry-dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</span>
          </div>
          ${item.position ? `<div class="entry-position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="entry-bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : ''

  // Generate volunteering section
  const volunteeringHtml = volunteering && volunteering.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Volunteering</h2>
      ${volunteering.map(item => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${item.title}</span>
            <span class="entry-dates">${formatDateRange(item.from_date, item.to_date, item.is_current)}</span>
          </div>
          ${item.position ? `<div class="entry-position">${item.position}</div>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="entry-bullets">
              ${item.bullets.map(bullet => `<li>${bullet.bullet_text}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : ''

  // Generate skills section
  const skillsHtml = skills && skills.length > 0 ? `
    <section class="section simple-list-section">
      <h2 class="section-title">Skills</h2>
      ${skills.map(item => `
        <p><strong>${item.title}:</strong> ${item.bullets && item.bullets.length > 0 ? item.bullets.map(bullet => bullet.bullet_text).join(', ') : ''}</p>
      `).join('')}
    </section>
  ` : ''

  // Generate interests section
  const interestsHtml = interests && interests.length > 0 ? `
    <section class="section simple-list-section">
      <h2 class="section-title">Interests</h2>
      <p>${interests.map(item => item.title).join(', ')}</p>
    </section>
  ` : ''

  // Generate languages section
  const languagesHtml = languages && languages.length > 0 ? `
    <section class="section simple-list-section">
      <h2 class="section-title">Languages</h2>
      <p>${languages.map(item => item.title).join(', ')}</p>
    </section>
  ` : ''

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resume Template</title>
        <style>
            /* --- Page Layout & Typography --- */
            body {
                background-color: #f0f0f0;
                font-family: "Times New Roman", Times, serif;
                font-size: 12pt;
                line-height: 1.4;
            }

            .resume-page {
                background-color: #ffffff;
                width: 8.5in;
                min-height: 11in;
                padding: 1in;
                margin: 20px auto;
                box-sizing: border-box;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }

            /* --- Header --- */
            .header {
                text-align: center;
                margin-bottom: 24px;
            }

            .header .name {
                font-size: 22pt;
                font-weight: bold;
                margin: 0;
            }

            .header .contact-info {
                font-size: 11pt;
                margin-top: 4px;
            }

            /* --- General Section Styling --- */
            .section {
                margin-bottom: 16px;
            }

            .section-title {
                font-size: 13pt;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1px solid #333;
                padding-bottom: 4px;
                margin-bottom: 10px;
            }

            /* --- Entry Styling (for Education, Experience, etc.) --- */
            .entry {
                margin-bottom: 12px;
            }

            .entry-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
            }

            .entry-title {
                font-weight: bold;
            }

            .entry-dates {
                font-style: italic;
                color: #333;
                flex-shrink: 0; /* Prevents dates from wrapping */
                padding-left: 15px; /* Ensures space between title and date */
            }
            
            .entry-position {
                font-style: italic;
                margin-top: 1px;
            }

            .entry-bullets {
                padding-left: 20px;
                margin-top: 4px;
                margin-bottom: 0;
            }

            .entry-bullets li {
                margin-bottom: 4px;
            }
            
            /* --- Simple List Section (Skills, Interests, etc.) --- */
            .simple-list-section p {
                margin: 0 0 4px 0;
            }

            /* Print Optimizations */
            @media print {
                body {
                    background-color: white;
                    margin: 0;
                    padding: 0;
                }
                
                .resume-page {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 1in;
                    box-shadow: none;
                }
                
                .section {
                    page-break-inside: avoid;
                }
                
                .entry {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="resume-page">
            ${personalInfoHtml}
            ${academicHtml}
            ${experienceHtml}
            ${projectsHtml}
            ${extracurricularHtml}
            ${volunteeringHtml}
            ${skillsHtml}
            ${interestsHtml}
            ${languagesHtml}
        </div>
    </body>
    </html>
  `
}
