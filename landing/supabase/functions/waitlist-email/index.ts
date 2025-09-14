// Edge Function to send an email notification when a new waitlist entry is added
// Deploy with: supabase functions deploy waitlist-email
// Required environment variables (set via Supabase dashboard secrets):
//   RESEND_API_KEY - your Resend API key (starts with re_)
//   RESEND_FROM    - verified sender email address (e.g., notifications@meetdiya.com)
//   NOTIFY_TO      - email address to receive the notification (default: mihir@meetdiya.com)
import { createClient } from "npm:@supabase/supabase-js@2.39.4";

// Supabase client is optional here; included if you need to query additional data.
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: {
    persistSession: false
  }
});

/** Send an email using Resend */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "notifications@meetdiya.com";
  
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
      console.log("Email sent successfully via Resend:", result.id);
      return true;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

/** Edge Function entry point */
Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    
    // Expected Supabase webhook payload structure
    // { type: "INSERT", schema: "public", table: "waitlist", record: { id, email, created_at } }
    if (payload.type !== "INSERT" || payload.table !== "waitlist") {
      return new Response(JSON.stringify({
        error: "Unsupported event"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const { id, email, created_at } = payload.record;
    const to = Deno.env.get("NOTIFY_TO") ?? "mihir@meetdiya.com";
    const subject = "New Waitlist Signup";
    const html = `
      <p>A new user has joined the waitlist.</p>
      <ul>
        <li><strong>ID:</strong> ${id}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Signed up at:</strong> ${created_at}</li>
      </ul>
    `;

    const emailSent = await sendEmail(to, subject, html);

    if (!emailSent) {
      return new Response(JSON.stringify({
        error: "Failed to send notification email"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    return new Response(JSON.stringify({
      status: "email_sent"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("Edge function error", e);
    return new Response(JSON.stringify({
      error: "internal_server_error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
