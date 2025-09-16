import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getUserProgramTypeFromProfile } from '../_shared/programTypeUtils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface DeadlineSyncRequest {
  user_id: string;
}

interface DeadlineSyncResponse {
  success: boolean;
  message: string;
  schools_updated: number;
  total_schools: number;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Deadline data separated by program type
const UNDERGRADUATE_DEADLINES = [
  { School: "Harvard University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Stanford University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "MIT", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Massachusetts Institute of Technology (MIT)", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Yale University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Princeton University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Columbia University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "University of Pennsylvania", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Duke University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Northwestern University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Johns Hopkins University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Cornell University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Brown University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "University of Chicago", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Rice University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Vanderbilt University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Washington University in St. Louis", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Emory University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Georgetown University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "Carnegie Mellon University", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "University of California, Berkeley", "Early Action": "November 30", "Early Decision 1": "N/A", "Early Decision 2": "N/A", "Regular Decision": "November 30" },
  { School: "University of California, Los Angeles", "Early Action": "November 30", "Early Decision 1": "N/A", "Early Decision 2": "N/A", "Regular Decision": "November 30" },
  { School: "University of Michigan", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "February 1" },
  { School: "University of Virginia", "Early Action": "November 1", "Early Decision 1": "November 1", "Early Decision 2": "January 1", "Regular Decision": "January 1" },
  { School: "University of North Carolina at Chapel Hill", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 1", "Regular Decision": "January 15" },
  { School: "Georgia Institute of Technology", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 1", "Regular Decision": "January 1" }
]

const MBA_DEADLINES = [
  { School: "Harvard Business School", "Early Action": "September 6", "Early Decision 1": "September 6", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Stanford Graduate School of Business", "Early Action": "September 12", "Early Decision 1": "September 12", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Wharton School (University of Pennsylvania)", "Early Action": "September 6", "Early Decision 1": "September 6", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Kellogg School of Management (Northwestern)", "Early Action": "September 13", "Early Decision 1": "September 13", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Booth School of Business (University of Chicago)", "Early Action": "September 21", "Early Decision 1": "September 21", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "MIT Sloan School of Management", "Early Action": "September 27", "Early Decision 1": "September 27", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Columbia Business School", "Early Action": "October 4", "Early Decision 1": "October 4", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Yale School of Management", "Early Action": "September 12", "Early Decision 1": "September 12", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Tuck School of Business (Dartmouth)", "Early Action": "September 25", "Early Decision 1": "September 25", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Fuqua School of Business (Duke)", "Early Action": "September 6", "Early Decision 1": "September 6", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Ross School of Business (Michigan)", "Early Action": "September 19", "Early Decision 1": "September 19", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Darden School of Business (Virginia)", "Early Action": "September 6", "Early Decision 1": "September 6", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Johnson Graduate School of Management (Cornell)", "Early Action": "September 19", "Early Decision 1": "September 19", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Haas School of Business (Berkeley)", "Early Action": "September 14", "Early Decision 1": "September 14", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Anderson School of Management (UCLA)", "Early Action": "October 4", "Early Decision 1": "October 4", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "McCombs School of Business (Texas)", "Early Action": "October 10", "Early Decision 1": "October 10", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Kenan-Flagler Business School (UNC)", "Early Action": "October 10", "Early Decision 1": "October 10", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Goizueta Business School (Emory)", "Early Action": "October 4", "Early Decision 1": "October 4", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "McDonough School of Business (Georgetown)", "Early Action": "October 4", "Early Decision 1": "October 4", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "Tepper School of Business (Carnegie Mellon)", "Early Action": "October 4", "Early Decision 1": "October 4", "Early Decision 2": "January 4", "Regular Decision": "January 4" },
  { School: "NYU Stern School of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "USC Marshall School of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "Indiana University Kelley School of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "University of Washington Foster School of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "University of Wisconsin School of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "University of Minnesota Carlson School of Management", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "University of Illinois Gies College of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" },
  { School: "University of Texas at Austin McCombs School of Business", "Early Action": "October 15", "Early Decision 1": "October 15", "Early Decision 2": "January 15", "Regular Decision": "January 15" }
]

// Function to get deadline data based on program type
function getDeadlineDataByProgramType(programType: string) {
  switch (programType) {
    case 'MBA':
      return MBA_DEADLINES;
    case 'Undergraduate':
      return UNDERGRADUATE_DEADLINES;
    default:
      // Default to undergraduate for backward compatibility
      return UNDERGRADUATE_DEADLINES;
  }
}

// Helper function to parse deadline strings
function parseDeadline(deadlineStr: string): string | null {
  if (deadlineStr === 'N/A' || !deadlineStr || deadlineStr.trim() === '') {
    return null
  }
  
  // Handle dates that already include the year (e.g., "January 2, 2026")
  const fullDateMatch = deadlineStr.match(/(\w+)\s+(\d+),\s+(\d{4})/)
  if (fullDateMatch) {
    const month = fullDateMatch[1]
    const day = fullDateMatch[2]
    const year = fullDateMatch[3]
    return `${month} ${day}, ${year}`
  }
  
  // Handle dates without year (e.g., "November 1 (restricted early action)")
  const dateMatch = deadlineStr.match(/(\w+)\s+(\d+)/)
  if (dateMatch) {
    const month = dateMatch[1]
    const day = dateMatch[2]
    const currentYear = 2026 // Use 2026 as the base year for deadlines
    return `${month} ${day}, ${currentYear}`
  }
  
  return null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id }: DeadlineSyncRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required field: user_id',
          schools_updated: 0,
          total_schools: 0
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's program type from their profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('applying_to')
      .eq('user_id', user_id)
      .maybeSingle()

    if (profileError) {
      console.warn('Could not fetch user profile:', profileError.message)
    }

    // Use centralized mapping function
    const userProgramType = getUserProgramTypeFromProfile(userProfile, 'Undergraduate')
    console.log(`User program type: ${userProgramType}`)

    // Get appropriate deadline data based on program type
    const DEADLINES_DATA = getDeadlineDataByProgramType(userProgramType)
    console.log(`Using ${userProgramType} deadline dataset with ${DEADLINES_DATA.length} schools`)

    // Get user's school recommendations
    const { data: userSchools, error: schoolsError } = await supabase
      .from('school_recommendations')
      .select('*')
      .eq('student_id', user_id)

    if (schoolsError) {
      throw new Error(`Failed to fetch school recommendations: ${schoolsError.message}`)
    }

    if (!userSchools || userSchools.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No school recommendations found for this user',
          schools_updated: 0,
          total_schools: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let schoolsUpdated = 0

    // Update each school with deadline information
    for (const schoolRec of userSchools) {
      const schoolName = schoolRec.school
      
      // Find matching deadline data
      const deadlineInfo = DEADLINES_DATA.find(deadline => deadline.School === schoolName)
      
      if (deadlineInfo) {
        // Parse deadlines using the correct field names from JSON
        const earlyActionDeadline = parseDeadline(deadlineInfo["Early Action"])
        const earlyDecision1Deadline = parseDeadline(deadlineInfo["Early Decision 1"])
        const earlyDecision2Deadline = parseDeadline(deadlineInfo["Early Decision 2"])
        const regularDecisionDeadline = parseDeadline(deadlineInfo["Regular Decision"])
        
        // Debug logging
        console.log(`School: ${schoolName}`)
        console.log(`Current deadline: ${schoolRec.regular_decision_deadline}`)
        console.log(`New deadline: ${regularDecisionDeadline}`)
        
        // Only update if the deadline is different or missing (handle "null" strings)
        const currentDeadline = schoolRec.regular_decision_deadline === 'null' ? null : schoolRec.regular_decision_deadline;
        if (currentDeadline !== regularDecisionDeadline) {
          console.log(`Updating deadline for ${schoolName}`)
          const { error: updateError } = await supabase
            .from('school_recommendations')
            .update({
              regular_decision_deadline: regularDecisionDeadline,
              last_updated: new Date().toISOString()
            })
            .eq('id', schoolRec.id)
          
          if (!updateError) {
            schoolsUpdated++
            console.log(`Successfully updated ${schoolName}`)
          } else {
            console.error(`Error updating ${schoolName}:`, updateError)
          }
        } else {
          console.log(`No update needed for ${schoolName}`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced deadlines for ${schoolsUpdated} out of ${userSchools.length} schools`,
        schools_updated: schoolsUpdated,
        total_schools: userSchools.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in sync-deadlines:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error syncing deadlines: ${error.message}`,
        schools_updated: 0,
        total_schools: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
