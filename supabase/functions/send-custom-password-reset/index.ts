// Edge Function to send custom password reset emails
// Deploy with: supabase functions deploy send-custom-password-reset
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

interface PasswordResetData {
  email: string;
  redirectTo?: string;
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
      console.log("Password reset email sent successfully via Resend:", result.id);
      return true;
    }
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

/** Generate password reset email HTML */
function generatePasswordResetEmail(data: PasswordResetData, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Diya AI Password</title>
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
            padding: 40px 30px; 
            text-align: center; 
          }
          .logo { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .header-subtitle { 
            opacity: 0.9; 
            font-size: 16px; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .welcome-text { 
            font-size: 18px; 
            margin-bottom: 20px; 
            color: #2d3748; 
          }
          .highlight { 
            background-color: #fef7e6; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #D07D00; 
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #D07D00 0%, #B86D00 100%); 
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 20px 0; 
          }
          .footer { 
            background-color: #f7fafc; 
            padding: 30px; 
            text-align: center; 
            color: #718096; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <img src="https://meetdiya.com/DiyaLogo%20White.svg" alt="Diya AI" style="height: 60px; width: auto; display: block; margin: 0 auto;" />
            </div>
            <div class="header-subtitle">Your AI College Counselor</div>
          </div>
          
          <div class="content">
            <div class="welcome-text">
              <strong>Password Reset Request 🔐</strong>
            </div>
            
            <p>You requested to reset your password for Diya AI. Click the button below to create a new password.</p>
            
            <div class="highlight">
              <strong>🔑 Reset Your Password</strong><br>
              This link will expire in 1 hour for security reasons.
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="cta-button">
                Reset Password →
              </a>
            </div>
            
            <p><strong>If you didn't request this password reset:</strong></p>
            <p>You can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>Questions? Reply to this email or reach out to us at <a href="mailto:mihir@meetdiya.com" style="color: #D07D00;">mihir@meetdiya.com</a>.</p>
            
            <p>Best regards,<br>
            <strong>Mihir Bedi</strong><br>
            Founder, CEO, Diya AI</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Diya AI. All rights reserved.</p>
            <p>You received this email because you requested a password reset.</p>
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
    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: email' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Try to generate password reset link - this will fail if user doesn't exist
    // We'll handle the error gracefully without revealing if user exists

    // Generate password reset link using Supabase's built-in method
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo || 'https://www.meetdiya.com/password-reset'
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      // Don't reveal if user exists or not for security - always return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account with this email exists, you will receive a password reset email.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailHtml = generatePasswordResetEmail({
      email
    }, resetData.properties.action_link);

    const emailSent = await sendEmail(
      email,
      `Reset your Diya AI password`,
      emailHtml
    );

    if (emailSent) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password reset email sent successfully' 
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
          error: 'Failed to send password reset email' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in send-custom-password-reset function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
