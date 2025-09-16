// Edge Function to send weekly deadline reminder emails to users
// Deploy with: supabase functions deploy weekly-deadline-emails
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

interface UserDeadlineData {
  user_id: string;
  email: string;
  first_name?: string;
  school_name: string;
  category: 'reach' | 'target' | 'safety';
  early_action_deadline: string | null;
  early_decision_1_deadline: string | null;
  early_decision_2_deadline: string | null;
  regular_decision_deadline: string | null;
  application_status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  days_remaining: number | null;
  urgency_level: 'low' | 'medium' | 'high' | 'critical' | 'overdue';
}

interface WeeklyEmailStats {
  total_users: number;
  emails_sent: number;
  emails_failed: number;
  users_with_upcoming_deadlines: number;
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
      console.log("Email sent successfully via Resend:", result.id);
      return true;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

/** Parse deadline string and calculate days remaining */
function calculateDaysRemaining(deadlineStr: string | null): number | null {
  if (!deadlineStr || deadlineStr === 'N/A') return null;
  
  try {
    // Parse common deadline formats
    const currentDate = new Date();
    let deadlineDate: Date;
    
    if (deadlineStr.includes('November')) {
      deadlineDate = new Date(`${currentDate.getFullYear()}-11-01`);
    } else if (deadlineStr.includes('December')) {
      deadlineDate = new Date(`${currentDate.getFullYear()}-12-01`);
    } else if (deadlineStr.includes('January')) {
      deadlineDate = new Date(`${currentDate.getFullYear() + 1}-01-01`);
    } else if (deadlineStr.includes('February')) {
      deadlineDate = new Date(`${currentDate.getFullYear() + 1}-02-01`);
    } else if (deadlineStr.includes('March')) {
      deadlineDate = new Date(`${currentDate.getFullYear() + 1}-03-01`);
    } else {
      // Try to parse as date
      deadlineDate = new Date(deadlineStr);
    }
    
    const timeDiff = deadlineDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff > 0 ? daysDiff : null;
  } catch (error) {
    console.error("Error parsing deadline:", deadlineStr, error);
    return null;
  }
}

/** Determine urgency level based on days remaining */
function getUrgencyLevel(daysRemaining: number | null): 'low' | 'medium' | 'high' | 'critical' | 'overdue' {
  if (daysRemaining === null) return 'low';
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 14) return 'high';
  if (daysRemaining <= 30) return 'medium';
  return 'low';
}

/** Generate personalized email HTML */
function generateWeeklyDeadlineEmail(userData: UserDeadlineData[], firstName?: string): string {
  const name = firstName || "there";
  
  // Group deadlines by urgency
  const criticalDeadlines = userData.filter(d => d.urgency_level === 'critical' || d.urgency_level === 'overdue');
  const highDeadlines = userData.filter(d => d.urgency_level === 'high');
  const mediumDeadlines = userData.filter(d => d.urgency_level === 'medium');
  const lowDeadlines = userData.filter(d => d.urgency_level === 'low');
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return '#dc3545';
      case 'critical': return '#fd7e14';
      case 'high': return '#ffc107';
      case 'medium': return '#17a2b8';
      default: return '#6c757d';
    }
  };
  
  const getUrgencyEmoji = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return '🚨';
      case 'critical': return '⚡';
      case 'high': return '🔥';
      case 'medium': return '📅';
      default: return '📝';
    }
  };
  
  const formatDeadlineRow = (deadline: UserDeadlineData) => {
    const daysText = deadline.days_remaining === null ? 'TBD' : 
                     deadline.days_remaining < 0 ? 'OVERDUE' : 
                     `${deadline.days_remaining} days`;
    
    const urgencyEmoji = getUrgencyEmoji(deadline.urgency_level);
    const urgencyColor = getUrgencyColor(deadline.urgency_level);
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 15px 12px; vertical-align: top;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 18px; margin-right: 8px;">${urgencyEmoji}</span>
            <div>
              <strong style="color: #1f2937; font-size: 16px;">${deadline.school_name}</strong>
              <div style="color: #6b7280; font-size: 14px; margin-top: 2px;">
                ${deadline.category.charAt(0).toUpperCase() + deadline.category.slice(1)} School
              </div>
            </div>
          </div>
        </td>
        <td style="padding: 15px 12px; vertical-align: top; text-align: center;">
          <span style="background-color: ${urgencyColor}15; color: ${urgencyColor}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${daysText}
          </span>
        </td>
        <td style="padding: 15px 12px; vertical-align: top; text-align: center;">
          <span style="color: #6b7280; font-size: 14px; text-transform: capitalize;">
            ${deadline.application_status.replace('_', ' ')}
          </span>
        </td>
      </tr>
    `;
  };
  
  // If no deadlines, show the relaxed message
  if (userData.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Update - Diya AI</title>
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
            background-color: #f0fdf4; 
            padding: 30px; 
            border-radius: 8px; 
            margin: 30px 0; 
            border-left: 4px solid #10b981; 
            text-align: center;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #D07D00 0%, #B86D00 100%); 
            color: white; 
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
              <img src="https://meetdiya.com/DiyaLogo.svg" alt="Diya AI" style="height: 60px; width: auto;" />
            </div>
            <div class="header-subtitle">Your AI College Counselor</div>
          </div>
          
          <div class="content">
            <div class="welcome-text">
              <strong>Weekly Update - ${name}! 👋</strong>
            </div>
            
            <div class="highlight">
              <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
              <strong style="font-size: 20px; color: #10b981;">No deadlines coming up this week!</strong><br>
              <span style="color: #059669; font-size: 16px;">Take some time to relax and have some fun.</span>
            </div>
            
            <p>Great job staying on top of your applications! This is the perfect time to:</p>
            <ul style="color: #4b5563;">
              <li>Review and polish your essays</li>
              <li>Connect with current students at your target schools</li>
              <li>Research scholarship opportunities</li>
              <li>Take a well-deserved break!</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://meetdiya.com/dashboard" class="cta-button">
                View Full Dashboard →
              </a>
            </div>
            
            <p>Keep up the excellent work!<br>
            <strong>Mihir Bedi</strong><br>
            Co-Founder, Diya AI</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Diya AI. All rights reserved.</p>
            <p>Questions? Reply to this email or visit our <a href="https://meetdiya.com/support" style="color: #D07D00;">support center</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Deadline Reminder - Diya AI</title>
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
        .deadline-table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .deadline-table th {
          background-color: #f8fafc;
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        .deadline-table td {
          padding: 15px 12px;
          vertical-align: top;
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
          color: white; 
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
        .urgency-section {
          margin: 25px 0;
        }
        .urgency-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          padding: 10px 15px;
          border-radius: 6px;
          display: inline-block;
        }
        .critical { background-color: #fef2f2; color: #dc2626; }
        .high { background-color: #fff7ed; color: #ea580c; }
        .medium { background-color: #f0f9ff; color: #0284c7; }
        .low { background-color: #f9fafb; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="https://meetdiya.com/DiyaLogo.svg" alt="Diya AI" style="height: 60px; width: auto;" />
          </div>
          <div class="header-subtitle">Your AI College Counselor</div>
        </div>
        
        <div class="content">
          <div class="welcome-text">
            <strong>Weekly Deadline Update - ${name}! 👋</strong>
          </div>
          
          <p>Here's your weekly update on upcoming application deadlines. 
          ${criticalDeadlines.length > 0 ? 'You have some urgent deadlines coming up!' : 'Keep up the great work!'}</p>
          
          ${criticalDeadlines.length > 0 ? `
            <div class="urgency-section">
              <div class="urgency-title critical">🚨 Urgent Deadlines (${criticalDeadlines.length})</div>
              <table class="deadline-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">School</th>
                    <th style="width: 25%; text-align: center;">Days Left</th>
                    <th style="width: 25%; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${criticalDeadlines.map(formatDeadlineRow).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${highDeadlines.length > 0 ? `
            <div class="urgency-section">
              <div class="urgency-title high">🔥 High Priority (${highDeadlines.length})</div>
              <table class="deadline-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">School</th>
                    <th style="width: 25%; text-align: center;">Days Left</th>
                    <th style="width: 25%; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${highDeadlines.map(formatDeadlineRow).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${mediumDeadlines.length > 0 ? `
            <div class="urgency-section">
              <div class="urgency-title medium">📅 Coming Up (${mediumDeadlines.length})</div>
              <table class="deadline-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">School</th>
                    <th style="width: 25%; text-align: center;">Days Left</th>
                    <th style="width: 25%; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${mediumDeadlines.map(formatDeadlineRow).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${lowDeadlines.length > 0 ? `
            <div class="urgency-section">
              <div class="urgency-title low">📝 Future Deadlines (${lowDeadlines.length})</div>
              <table class="deadline-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">School</th>
                    <th style="width: 25%; text-align: center;">Days Left</th>
                    <th style="width: 25%; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowDeadlines.map(formatDeadlineRow).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div class="highlight">
            <strong>📋 This Week's Action Items</strong><br>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${criticalDeadlines.length > 0 ? '<li>Focus on urgent deadlines first</li>' : ''}
              <li>Review and update application statuses</li>
              <li>Complete any pending essays or materials</li>
              <li>Follow up on recommendation letters</li>
              <li>Double-check all application requirements</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://meetdiya.com/dashboard" class="cta-button">
              View Full Dashboard →
            </a>
          </div>
          
          <p>You've got this! 💪<br>
          <strong>Mihir Bedi</strong><br>
          Co-Founder, Diya AI</p>
        </div>
        
        <div class="footer">
          <p>© 2025 Diya AI. All rights reserved.</p>
          <p>Questions? Reply to this email or visit our <a href="https://meetdiya.com/support" style="color: #D07D00;">support center</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/** Get users with upcoming deadlines */
async function getUsersWithUpcomingDeadlines(): Promise<UserDeadlineData[]> {
  try {
    // Query to get users with school recommendations and their deadline data
    const { data, error } = await supabase
      .from('school_recommendations')
      .select(`
        user_id,
        school_name,
        category,
        early_action_deadline,
        early_decision_1_deadline,
        early_decision_2_deadline,
        regular_decision_deadline,
        application_status,
        user_profiles!inner(
          email,
          first_name
        )
      `)
      .eq('application_status', 'not_started')
      .or('application_status.eq.in_progress');

    if (error) {
      console.error('Error fetching user deadlines:', error);
      return [];
    }

    if (!data) return [];

    // Process and enrich the data
    const processedData: UserDeadlineData[] = [];
    
    for (const row of data) {
      const userProfile = row.user_profiles;
      if (!userProfile) continue;
      
      // Calculate days remaining for each deadline type
      const deadlines = [
        { type: 'early_action', deadline: row.early_action_deadline },
        { type: 'early_decision_1', deadline: row.early_decision_1_deadline },
        { type: 'early_decision_2', deadline: row.early_decision_2_deadline },
        { type: 'regular_decision', deadline: row.regular_decision_deadline }
      ];
      
      for (const { type, deadline } of deadlines) {
        if (deadline && deadline !== 'N/A') {
          const daysRemaining = calculateDaysRemaining(deadline);
          const urgencyLevel = getUrgencyLevel(daysRemaining);
          
          // Only include deadlines that are coming up (within 60 days) or overdue
          if (daysRemaining !== null && (daysRemaining <= 60 || daysRemaining < 0)) {
            processedData.push({
              user_id: row.user_id,
              email: userProfile.email,
              first_name: userProfile.first_name,
              school_name: row.school_name,
              category: row.category,
              early_action_deadline: type === 'early_action' ? deadline : null,
              early_decision_1_deadline: type === 'early_decision_1' ? deadline : null,
              early_decision_2_deadline: type === 'early_decision_2' ? deadline : null,
              regular_decision_deadline: type === 'regular_decision' ? deadline : null,
              application_status: row.application_status,
              days_remaining: daysRemaining,
              urgency_level: urgencyLevel
            });
          }
        }
      }
    }
    
    return processedData;
  } catch (error) {
    console.error('Error processing user deadlines:', error);
    return [];
  }
}

/** Main function to send weekly deadline emails */
async function sendWeeklyDeadlineEmails(): Promise<WeeklyEmailStats> {
  const stats: WeeklyEmailStats = {
    total_users: 0,
    emails_sent: 0,
    emails_failed: 0,
    users_with_upcoming_deadlines: 0
  };
  
  try {
    console.log('Starting weekly deadline email process...');
    
    // Get all users with upcoming deadlines
    const userDeadlines = await getUsersWithUpcomingDeadlines();
    console.log(`Found ${userDeadlines.length} deadline entries`);
    
    if (userDeadlines.length === 0) {
      console.log('No upcoming deadlines found. Skipping email send.');
      return stats;
    }
    
    // Group deadlines by user
    const userDeadlineMap = new Map<string, UserDeadlineData[]>();
    const userEmailMap = new Map<string, { email: string; first_name?: string }>();
    
    for (const deadline of userDeadlines) {
      if (!userDeadlineMap.has(deadline.user_id)) {
        userDeadlineMap.set(deadline.user_id, []);
        userEmailMap.set(deadline.user_id, {
          email: deadline.email,
          first_name: deadline.first_name
        });
      }
      userDeadlineMap.get(deadline.user_id)!.push(deadline);
    }
    
    stats.total_users = userDeadlineMap.size;
    stats.users_with_upcoming_deadlines = userDeadlineMap.size;
    
    console.log(`Sending emails to ${stats.total_users} users...`);
    
    // Send emails to each user
    for (const [userId, deadlines] of userDeadlineMap) {
      const userInfo = userEmailMap.get(userId);
      if (!userInfo) continue;
      
      try {
        const emailHtml = generateWeeklyDeadlineEmail(deadlines, userInfo.first_name);
        const subject = `📅 Weekly Deadline Update - ${deadlines.length} upcoming deadline${deadlines.length > 1 ? 's' : ''}`;
        
        const emailSent = await sendEmail(userInfo.email, subject, emailHtml);
        
        if (emailSent) {
          stats.emails_sent++;
          console.log(`✅ Email sent to ${userInfo.email}`);
        } else {
          stats.emails_failed++;
          console.error(`❌ Failed to send email to ${userInfo.email}`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        stats.emails_failed++;
        console.error(`Error sending email to ${userInfo.email}:`, error);
      }
    }
    
    console.log('Weekly deadline email process completed:', stats);
    return stats;
    
  } catch (error) {
    console.error('Error in weekly deadline email process:', error);
    throw error;
  }
}

/** Edge Function entry point */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if this is a manual trigger or cron job
    const url = new URL(req.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';
    
    if (req.method === 'GET' && isManualTrigger) {
      // Manual trigger for testing
      console.log('Manual trigger detected');
      const stats = await sendWeeklyDeadlineEmails();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Weekly deadline emails sent successfully',
        stats: stats
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (req.method === 'POST') {
      // Cron job trigger
      const stats = await sendWeeklyDeadlineEmails();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Weekly deadline emails processed',
        stats: stats
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
