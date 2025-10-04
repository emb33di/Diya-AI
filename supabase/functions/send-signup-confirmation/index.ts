// Edge Function to send signup confirmation email
// Deploy with: supabase functions deploy send-signup-confirmation
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

interface SignupConfirmationData {
  email: string;
  firstName: string;
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
    html: html
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
      console.log("Signup confirmation email sent successfully via Resend:", result.id);
      return true;
    }
  } catch (error) {
    console.error("Error sending signup confirmation email:", error);
    return false;
  }
}

/** Generate signup confirmation email HTML using same styling as waitlist */
function generateSignupConfirmationEmail(data: SignupConfirmationData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Diya AI - Confirm Your Account</title>
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
          .social-links { 
            margin: 20px 0; 
          }
          .social-links a { 
            color: #D07D00; 
            text-decoration: none; 
            margin: 0 10px; 
            display: inline-block;
            transition: transform 0.2s ease;
          }
          .social-links a:hover {
            transform: scale(1.1);
          }
          .social-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
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
              <strong>Welcome to Diya AI, ${data.firstName}! 👋</strong>
            </div>
            
            <p>Thank you for signing up! We're excited to help you navigate your college admissions journey with AI-powered guidance.</p>
            
            <div class="highlight">
              <strong>🔐 Please confirm your email address</strong><br>
              Click the button below to verify your account and complete your signup.
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.meetdiya.com/auth" class="cta-button">
                Confirm Your Email →
              </a>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li>Complete your profile setup</li>
              <li>Get personalized school recommendations</li>
              <li>Start working on your essays with AI guidance</li>
              <li>Track application deadlines automatically</li>
            </ul>
            
            <p>Questions? Reply to this email or send an email to <a href="mailto:mihir@meetdiya.com" style="color: #D07D00;">mihir@meetdiya.com</a>.</p>
            
            <p>Best regards,<br>
            <strong>Mihir Bedi</strong><br>
            Founder, CEO, Diya AI</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Diya AI. All rights reserved.</p>
            <p>You received this email because you signed up for Diya AI.</p>
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
    const { email, firstName } = await req.json();

    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, firstName' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailHtml = generateSignupConfirmationEmail({
      email,
      firstName
    });

    const emailSent = await sendEmail(
      email,
      `Welcome to Diya AI, ${firstName}! Please confirm your email`,
      emailHtml
    );

    if (emailSent) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Signup confirmation email sent successfully' 
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
          error: 'Failed to send signup confirmation email' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in send-signup-confirmation function:', error);
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
