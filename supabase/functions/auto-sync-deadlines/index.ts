import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface AutoSyncRequest {
  user_id: string;
}

interface AutoSyncResponse {
  success: boolean;
  message: string;
  schools_updated: number;
  total_schools: number;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Deadline data separated by program type - Regular Decision deadlines only
const UNDERGRADUATE_REGULAR_DECISION_DEADLINES = [
  { School: "Harvard University", "Regular Decision": "January 1" },
  { School: "Stanford University", "Regular Decision": "January 1" },
  { School: "MIT", "Regular Decision": "January 1" },
  { School: "Massachusetts Institute of Technology (MIT)", "Regular Decision": "January 1" },
  { School: "Yale University", "Regular Decision": "January 1" },
  { School: "Princeton University", "Regular Decision": "January 1" },
  { School: "Columbia University", "Regular Decision": "January 1" },
  { School: "University of Pennsylvania", "Regular Decision": "January 1" },
  { School: "Duke University", "Regular Decision": "January 1" },
  { School: "Northwestern University", "Regular Decision": "January 1" },
  { School: "Johns Hopkins University", "Regular Decision": "January 1" },
  { School: "Cornell University", "Regular Decision": "January 1" },
  { School: "Brown University", "Regular Decision": "January 1" },
  { School: "University of Chicago", "Regular Decision": "January 1" },
  { School: "Rice University", "Regular Decision": "January 1" },
  { School: "Vanderbilt University", "Regular Decision": "January 1" },
  { School: "Washington University in St. Louis", "Regular Decision": "January 1" },
  { School: "Emory University", "Regular Decision": "January 1" },
  { School: "Georgetown University", "Regular Decision": "January 1" },
  { School: "Carnegie Mellon University", "Regular Decision": "January 1" },
  { School: "University of California, Berkeley", "Regular Decision": "November 30" },
  { School: "University of California, Los Angeles", "Regular Decision": "November 30" },
  { School: "University of Michigan", "Regular Decision": "February 1" },
  { School: "University of Virginia", "Regular Decision": "January 1" },
  { School: "University of North Carolina at Chapel Hill", "Regular Decision": "January 15" },
  { School: "Georgia Institute of Technology", "Regular Decision": "January 1" }
]

const MBA_REGULAR_DECISION_DEADLINES = [
  { School: "Harvard Business School", "Regular Decision": "January 4" },
  { School: "Stanford Graduate School of Business", "Regular Decision": "January 4" },
  { School: "Wharton School (University of Pennsylvania)", "Regular Decision": "January 4" },
  { School: "Kellogg School of Management (Northwestern)", "Regular Decision": "January 4" },
  { School: "Booth School of Business (University of Chicago)", "Regular Decision": "January 4" },
  { School: "MIT Sloan School of Management", "Regular Decision": "January 4" },
  { School: "Columbia Business School", "Regular Decision": "January 4" },
  { School: "Yale School of Management", "Regular Decision": "January 4" },
  { School: "Tuck School of Business (Dartmouth)", "Regular Decision": "January 4" },
  { School: "Fuqua School of Business (Duke)", "Regular Decision": "January 4" },
  { School: "Ross School of Business (Michigan)", "Regular Decision": "January 4" },
  { School: "Darden School of Business (Virginia)", "Regular Decision": "January 4" },
  { School: "Johnson Graduate School of Management (Cornell)", "Regular Decision": "January 4" },
  { School: "Haas School of Business (Berkeley)", "Regular Decision": "January 4" },
  { School: "Anderson School of Management (UCLA)", "Regular Decision": "January 4" },
  { School: "McCombs School of Business (Texas)", "Regular Decision": "January 4" },
  { School: "Kenan-Flagler Business School (UNC)", "Regular Decision": "January 4" },
  { School: "Goizueta Business School (Emory)", "Regular Decision": "January 4" },
  { School: "McDonough School of Business (Georgetown)", "Regular Decision": "January 4" },
  { School: "Tepper School of Business (Carnegie Mellon)", "Regular Decision": "January 4" },
  { School: "NYU Stern School of Business", "Regular Decision": "January 15" },
  { School: "USC Marshall School of Business", "Regular Decision": "January 15" },
  { School: "Indiana University Kelley School of Business", "Regular Decision": "January 15" },
  { School: "University of Washington Foster School of Business", "Regular Decision": "January 15" },
  { School: "University of Wisconsin School of Business", "Regular Decision": "January 15" },
  { School: "University of Minnesota Carlson School of Management", "Regular Decision": "January 15" },
  { School: "University of Illinois Gies College of Business", "Regular Decision": "January 15" },
  { School: "University of Texas at Austin McCombs School of Business", "Regular Decision": "January 15" }
]

// Function to get regular decision deadline data based on program type
function getRegularDecisionDeadlineDataByProgramType(programType: string) {
  switch (programType) {
    case 'MBA':
      return MBA_REGULAR_DECISION_DEADLINES;
    case 'Undergraduate':
      return UNDERGRADUATE_REGULAR_DECISION_DEADLINES;
    default:
      // Default to undergraduate for backward compatibility
      return UNDERGRADUATE_REGULAR_DECISION_DEADLINES;
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
  
  // Handle dates without year (e.g., "November 1")
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
    const { user_id }: AutoSyncRequest = await req.json()

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

    // Map applying_to to program type
    const programTypeMap: Record<string, string> = {
      'Undergraduate Colleges': 'Undergraduate',
      'MBA': 'MBA',
      'LLM': 'LLM',
      'PhD': 'PhD',
      'Masters': 'Masters'
    }

    const userProgramType = userProfile?.applying_to ? programTypeMap[userProfile.applying_to] || 'Undergraduate' : 'Undergraduate'
    console.log(`User program type: ${userProgramType}`)

    // Get appropriate deadline data based on program type
    const REGULAR_DECISION_DEADLINES = getRegularDecisionDeadlineDataByProgramType(userProgramType)
    console.log(`Using ${userProgramType} regular decision deadline dataset with ${REGULAR_DECISION_DEADLINES.length} schools`)

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

    // Update each school with regular decision deadline information
    for (const schoolRec of userSchools) {
      const schoolName = schoolRec.school
      console.log(`Processing school: "${schoolName}"`)
      
      // Find matching deadline data
      const deadlineInfo = REGULAR_DECISION_DEADLINES.find(deadline => deadline.School === schoolName)
      
      if (deadlineInfo) {
        console.log(`Found deadline info for ${schoolName}:`, deadlineInfo)
        const regularDecisionDeadline = parseDeadline(deadlineInfo["Regular Decision"])
        console.log(`Parsed deadline: "${regularDecisionDeadline}"`)
        
        // Only update if the deadline is different or missing (handle "null" strings)
        const currentDeadline = schoolRec.regular_decision_deadline === 'null' ? null : schoolRec.regular_decision_deadline;
        if (currentDeadline !== regularDecisionDeadline) {
          console.log(`Updating deadline for ${schoolName} from "${schoolRec.regular_decision_deadline}" to "${regularDecisionDeadline}"`)
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
          console.log(`No update needed for ${schoolName} - deadline already correct`)
        }
      } else {
        console.log(`No deadline data found for "${schoolName}"`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced regular decision deadlines for ${schoolsUpdated} out of ${userSchools.length} schools`,
        schools_updated: schoolsUpdated,
        total_schools: userSchools.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in auto-sync-deadlines:', error)
    
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
