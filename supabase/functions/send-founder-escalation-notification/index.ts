// Edge Function to send founder notification email when an essay is escalated
// Deploy with: supabase functions deploy send-founder-escalation-notification
// Required environment variables (set via Supabase dashboard secrets):
//   RESEND_API_KEY - your Resend API key (starts with re_)
//   RESEND_FROM    - verified sender email address (e.g., mihir@meetdiya.com)

import { createClient } from "npm:@supabase/supabase-js@2.39.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "", 
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", 
  {
    auth: {
      persistSession: false
    }
  }
);

interface EscalationData {
  escalationId: string;
  essayId: string;
  userId: string;
  essayTitle: string;
  wordCount: number;
  characterCount: number;
  escalatedAt: string;
  studentName?: string;
  studentEmail?: string;
}

/** Send an email using Resend */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM") ?? "mihir@meetdiya.com";
  const from = `Diya AI <${fromEmail}>`;
  
  if (!apiKey) {
    console.error("Resend API key missing");
    return false;
  }

  const body = {
    from: from,
    to: [to],
    subject: subject,
    html: html,
    // Disable tracking to prevent resend-links.com SSL issues
    click_tracking: false,
    open_tracking: false
  };

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Failed to send email via Resend", resp.status, txt);
      return false;
    } else {
      const result = await resp.json();
      console.log("Founder escalation email sent successfully via Resend:", result.id);
      return true;
    }
  } catch (error) {
    console.error("Error sending founder escalation email:", error);
    return false;
  }
}

/** Generate founder escalation notification email HTML */
function generateFounderEscalationEmail(data: EscalationData): string {
  const studentName = data.studentName || 'Unknown';
  const studentEmail = data.studentEmail || 'No email provided';
  const escalationTime = new Date(data.escalatedAt).toLocaleString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Essay Escalated for Review - Diya AI</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
            background-color: #f8fafc; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #D07D00 0%, #B86D00 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header-title { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0; 
          }
          .content { 
            padding: 30px; 
          }
          .info-box { 
            background-color: #fef3e2; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #D07D00; 
          }
          .info-row { 
            margin: 10px 0; 
            display: flex;
            align-items: baseline;
          }
          .info-label { 
            font-weight: bold; 
            color: #B86D00; 
            min-width: 140px;
            margin-right: 10px;
          }
          .info-value { 
            color: #1f2937; 
          }
          .timestamp {
            color: #6b7280;
            font-size: 14px;
            font-style: italic;
            margin-top: 20px;
          }
          .footer { 
            background-color: #f7fafc; 
            padding: 20px; 
            text-align: center; 
            color: #718096; 
            font-size: 14px; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #D07D00 0%, #B86D00 100%); 
            color: white !important; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="header-title">📝 Essay Escalated for Review</h1>
          </div>
          
          <div class="content">
            <p><strong>A student has escalated an essay for your review.</strong></p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">👤 Student:</span>
                <span class="info-value">${studentName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📧 Email:</span>
                <span class="info-value">${studentEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📄 Essay Title:</span>
                <span class="info-value">${data.essayTitle}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📊 Word Count:</span>
                <span class="info-value">${data.wordCount.toLocaleString()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">🔤 Characters:</span>
                <span class="info-value">${data.characterCount.toLocaleString()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">🆔 Escalation ID:</span>
                <span class="info-value"><code>${data.escalationId}</code></span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.meetdiya.com/founder-portal/${data.escalationId}" class="button">
                Review Essay Now →
              </a>
            </div>
            
            <p class="timestamp">Escalated at: ${escalationTime}</p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Diya AI.</p>
            <p>© 2025 Diya AI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/** Edge Function entry point */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Handle both Supabase webhook format and direct calls
    let escalationId, essayId, userId, essayTitle, wordCount, characterCount, escalatedAt;
    let studentName, studentEmail;
    
    if (payload.type === 'INSERT' && payload.record) {
      // Supabase webhook format
      const record = payload.record;
      escalationId = record.id;
      essayId = record.essay_id;
      userId = record.user_id;
      essayTitle = record.essay_title;
      wordCount = record.word_count || 0;
      characterCount = record.character_count || 0;
      escalatedAt = record.escalated_at || record.created_at;
    } else {
      // Direct call format
      escalationId = payload.escalationId || payload.id;
      essayId = payload.essayId || payload.essay_id;
      userId = payload.userId || payload.user_id;
      essayTitle = payload.essayTitle || payload.essay_title;
      wordCount = payload.wordCount || payload.word_count || 0;
      characterCount = payload.characterCount || payload.character_count || 0;
      escalatedAt = payload.escalatedAt || payload.escalated_at;
      studentName = payload.studentName || payload.student_name;
      studentEmail = payload.studentEmail || payload.student_email;
    }

    if (!escalationId || !essayId || !userId || !essayTitle) {
      console.error("Missing required fields", { escalationId, essayId, userId, essayTitle });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: escalationId, essayId, userId, essayTitle' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch student info from user_profiles if not provided
    if (!studentName || !studentEmail) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, email_address')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profileError && profile) {
          studentName = studentName || profile.full_name || null;
          studentEmail = studentEmail || profile.email_address || null;
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Continue with partial data
      }
    }

    const founderEmail = "mihir@meetdiya.com";
    
    const emailHtml = generateFounderEscalationEmail({
      escalationId,
      essayId,
      userId,
      essayTitle,
      wordCount,
      characterCount,
      escalatedAt: escalatedAt || new Date().toISOString(),
      studentName: studentName || 'Unknown',
      studentEmail: studentEmail || 'No email provided'
    });

    const emailSent = await sendEmail(
      founderEmail,
      `📝 Essay Escalated: ${essayTitle} by ${studentName || 'Student'}`,
      emailHtml
    );

    if (emailSent) {
      console.log(`Founder notification sent for escalated essay: ${escalationId} (${essayTitle})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Founder escalation notification email sent successfully' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send founder escalation notification email' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in send-founder-escalation-notification function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

