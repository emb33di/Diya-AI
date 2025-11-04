// Edge Function to send admin notification email when a new user signs up
// Deploy with: supabase functions deploy send-admin-signup-notification
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

interface NewUserData {
  userId: string;
  email: string;
  fullName?: string;
  applyingTo?: string;
  hearAboutUs?: string;
  hearAboutOther?: string;
  isEarlyUser?: boolean;
  createdAt: string;
}

/** Send an email using Resend */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM") ?? "mihir@meetdiya.com";
  const from = `Diya AI Admin <${fromEmail}>`;
  
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
      console.log("Admin notification email sent successfully via Resend:", result.id);
      return true;
    }
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    return false;
  }
}

/** Generate admin notification email HTML */
function generateAdminNotificationEmail(data: NewUserData): string {
  const displayName = data.fullName || 'Not provided';
  const applyingTo = data.applyingTo || 'Not specified';
  const hearAboutUs = data.hearAboutUs || 'Not specified';
  const hearAboutOther = data.hearAboutOther || '';
  const isEarlyUser = data.isEarlyUser || false;
  
  // Format hear about us display
  let hearAboutDisplay = hearAboutUs;
  if (hearAboutUs === 'other' && hearAboutOther) {
    hearAboutDisplay = `Other: ${hearAboutOther}`;
  } else if (hearAboutUs === 'other') {
    hearAboutDisplay = 'Other (no details provided)';
  }
  
  // Format early access display
  const earlyAccessDisplay = isEarlyUser ? 'Yes ✨' : 'No';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Signup - Diya AI</title>
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
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
            background-color: #f0fdf4; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #10b981; 
          }
          .info-row { 
            margin: 10px 0; 
            display: flex;
            align-items: baseline;
          }
          .info-label { 
            font-weight: bold; 
            color: #059669; 
            min-width: 120px;
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
            <h1 class="header-title">🎉 New User Signup!</h1>
          </div>
          
          <div class="content">
            <p>A new user has just signed up for Diya AI:</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">👤 Full Name:</span>
                <span class="info-value">${displayName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📧 Email:</span>
                <span class="info-value">${data.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">🎓 Applying to:</span>
                <span class="info-value">${applyingTo}</span>
              </div>
              <div class="info-row">
                <span class="info-label">🆔 User ID:</span>
                <span class="info-value"><code>${data.userId}</code></span>
              </div>
              <div class="info-row">
                <span class="info-label">📢 Heard about us:</span>
                <span class="info-value">${hearAboutDisplay}</span>
              </div>
              <div class="info-row">
                <span class="info-label">⭐ Early Access:</span>
                <span class="info-value">${earlyAccessDisplay}</span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/auth/users" class="button">
                View in Supabase Dashboard →
              </a>
            </div>
            
            <p class="timestamp">Signed up at: ${new Date(data.createdAt).toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
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
    let userId, email, fullName, applyingTo, hearAboutUs, hearAboutOther, isEarlyUser, createdAt;
    
    if (payload.type === 'INSERT' && payload.record) {
      // Supabase webhook format
      const record = payload.record;
      userId = record.id;
      email = record.email;
      fullName = record.raw_user_meta_data?.full_name;
      applyingTo = record.raw_user_meta_data?.applying_to;
      hearAboutUs = record.raw_user_meta_data?.hear_about_us;
      hearAboutOther = record.raw_user_meta_data?.hear_about_other;
      isEarlyUser = record.raw_user_meta_data?.is_early_user || false;
      createdAt = record.created_at;
    } else {
      // Direct call format
      userId = payload.userId;
      email = payload.email;
      fullName = payload.fullName;
      applyingTo = payload.applyingTo;
      hearAboutUs = payload.hearAboutUs;
      hearAboutOther = payload.hearAboutOther;
      isEarlyUser = payload.isEarlyUser || false;
      createdAt = payload.createdAt;
    }

    if (!userId || !email) {
      console.error("Missing required fields: userId, email");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: userId, email' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const adminEmail = "mihir@meetdiya.com";
    
    const emailHtml = generateAdminNotificationEmail({
      userId,
      email,
      fullName,
      applyingTo,
      hearAboutUs,
      hearAboutOther,
      isEarlyUser,
      createdAt: createdAt || new Date().toISOString()
    });

    const emailSent = await sendEmail(
      adminEmail,
      `🎉 New User Signup: ${fullName || email}`,
      emailHtml
    );

    if (emailSent) {
      console.log(`Admin notification sent for new user: ${email} (${userId})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin notification email sent successfully' 
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
          error: 'Failed to send admin notification email' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in send-admin-signup-notification function:', error);
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

