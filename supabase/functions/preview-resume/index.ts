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
  console.log('🚀 Preview-resume function called');
  console.log('📋 Request method:', req.method);
  console.log('📋 Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
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

    console.log('🔐 Getting authenticated user...');
    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.log('❌ User authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('✅ User authenticated:', user.id);

    console.log('👤 Fetching user profile data...');
    // Fetch user profile data for resume header
    const { data: profileData, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('full_name, email_address, phone_number, city, state')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.log('❌ Profile fetch error:', profileError.message);
      throw new Error(`Failed to fetch user profile: ${profileError.message}`)
    }
    
    console.log('✅ Profile data:', profileData ? 'Found' : 'Not found');

    console.log('📄 Fetching resume activities data...');
    // Fetch resume activities data
    const { data: resumeActivitiesData, error: resumeError } = await supabaseClient
      .from('resume_activities_with_bullets')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order')

    if (resumeError) {
      console.log('❌ Resume data fetch error:', resumeError.message);
      throw new Error(`Failed to fetch resume data: ${resumeError.message}`)
    }
    
    console.log('✅ Resume activities count:', resumeActivitiesData?.length || 0);
    console.log('📋 Raw resume data:', JSON.stringify(resumeActivitiesData, null, 2));

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

    console.log('📊 Organized resume data:', JSON.stringify(resumeData, null, 2));

    const userProfile: UserProfile = profileData || {
      full_name: user.user_metadata?.full_name || 'Resume',
      email_address: user.email,
      phone_number: undefined,
      city: undefined,
      state: undefined
    }

    console.log('👤 User profile:', JSON.stringify(userProfile, null, 2));

    console.log('🎨 Generating HTML from resume data...');
    // Generate HTML from resume data
    const htmlContent = generateResumeHtml(resumeData, userProfile)
    
    console.log('✅ HTML generated, length:', htmlContent.length);
    console.log('📄 HTML preview:', htmlContent.substring(0, 500) + '...');
    console.log('📤 Returning HTML response...');

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
      <h2 class="section-title">Extracurricular Activities</h2>
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

  // Check if there's any data to display
  const hasAnyData = academic.length > 0 || experience.length > 0 || projects.length > 0 || 
                     extracurricular.length > 0 || volunteering.length > 0 || skills.length > 0 || 
                     interests.length > 0 || languages.length > 0;

  return `
    <div class="resume-page">
        ${personalInfoHtml}
        ${hasAnyData ? `
            ${academicHtml}
            ${experienceHtml}
            ${projectsHtml}
            ${extracurricularHtml}
            ${volunteeringHtml}
            ${skillsHtml}
            ${interestsHtml}
            ${languagesHtml}
        ` : `
            <section class="section">
                <h2 class="section-title">No Resume Data</h2>
                <p>Please add some resume activities using the "Add Activity" dropdown to see your resume preview.</p>
                <p>You can add education, experience, projects, and other sections to build your resume.</p>
            </section>
        `}
    </div>
  `
}
