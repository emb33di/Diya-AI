# Founder Escalation Webhook Setup - Step by Step

This guide will walk you through setting up a Database Webhook to send email notifications when an essay is escalated.

## Prerequisites

✅ Edge Function is already deployed: `send-founder-escalation-notification`
✅ Migration is already applied: `20251102193300_add_founder_escalation_notification.sql`

## Step-by-Step Instructions

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/settings/api
2. Scroll down to find the **"service_role"** key (this is different from the "anon" key)
3. **Copy this key** - you'll need it in Step 3
   - It starts with `eyJ...` and is much longer than the anon key
   - ⚠️ Keep this secret - it has full database access

### Step 2: Navigate to Database Webhooks

1. Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/hooks
2. You should see a list of webhooks (or an empty list if this is your first)
3. Click the **"Create a new hook"** button (usually at the top right)

### Step 3: Configure the Webhook

#### Basic Settings:
- **Name**: `Founder Escalation Notification`
- **Table**: Select `public.escalated_essays` from the dropdown
- **Events**: Check only **INSERT** (we only want to notify on new escalations)
- **Type**: Select **HTTP Request**
- **HTTP Method**: Select **POST**

#### URL:
```
https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-founder-escalation-notification
```

#### Headers:
Click "Add Header" and add these two headers:

**Header 1:**
- **Name**: `Content-Type`
- **Value**: `application/json`

**Header 2:**
- **Name**: `Authorization`
- **Value**: `Bearer YOUR_SERVICE_ROLE_KEY_HERE`
  - Replace `YOUR_SERVICE_ROLE_KEY_HERE` with the service role key you copied in Step 1
  - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWNsYmN4dWtxZGR4bGZ4dXVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ...`

#### Payload (Request Body):
Paste this JSON template in the "Payload" section:

```json
{
  "escalationId": "{{ record.id }}",
  "essayId": "{{ record.essay_id }}",
  "userId": "{{ record.user_id }}",
  "essayTitle": "{{ record.essay_title }}",
  "wordCount": {{ record.word_count }},
  "characterCount": {{ record.character_count }},
  "escalatedAt": "{{ record.escalated_at }}"
}
```

### Step 4: Save the Webhook

1. Scroll down and click **"Save"** or **"Create hook"**
2. You should see a success message
3. The webhook will appear in your list of webhooks

### Step 5: Test It (Optional but Recommended)

You can test the webhook by:

1. **Go to your website** and escalate an essay as a Pro user
2. **Check the webhook logs**:
   - Go back to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/hooks
   - Click on your "Founder Escalation Notification" webhook
   - You'll see a "Deliveries" or "History" tab
   - Check if the webhook fired and what the response was
3. **Check your email** at mihir@meetdiya.com

### Step 6: (Optional) Disable the Database Trigger

Since you're using webhooks now, you might want to disable the database trigger to avoid duplicate notifications:

```sql
-- Run this in Supabase SQL Editor
DROP TRIGGER IF EXISTS zz_notify_founder_on_escalation ON public.escalated_essays;
```

Or keep both as a backup - the webhook is more reliable anyway.

## Troubleshooting

### Webhook Not Firing?

1. **Check webhook is enabled**: Make sure the toggle/switch is ON
2. **Check table name**: Make sure you selected `public.escalated_essays` (not just `escalated_essays`)
3. **Check events**: Make sure **INSERT** is checked
4. **Check logs**: Click on the webhook and check the "Deliveries" tab for errors

### Getting 401 Errors?

- Double-check your **Authorization header** format: `Bearer YOUR_KEY`
- Make sure you copied the **service_role** key, not the anon key
- The key should start with `eyJ...`

### Getting 500 Errors?

- Check the Edge Function logs: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/functions/send-founder-escalation-notification/logs
- Make sure `RESEND_API_KEY` and `RESEND_FROM` are set in Edge Function secrets

### Email Not Received?

1. Check webhook delivery status (should show 200 OK)
2. Check Edge Function logs for email sending errors
3. Check spam folder
4. Verify `RESEND_API_KEY` is valid in Edge Function settings

## Monitoring

### View Webhook Activity
- Dashboard: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/hooks
- Click your webhook to see delivery history, response times, and error rates

### View Edge Function Logs
```bash
supabase functions logs send-founder-escalation-notification --tail
```

Or in dashboard: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/functions/send-founder-escalation-notification/logs

## What You'll Receive

Every time a student escalates an essay, you'll get an email at **mihir@meetdiya.com** with:
- ✅ Student name and email
- ✅ Essay title
- ✅ Word count and character count  
- ✅ Direct link to review the essay: `https://www.meetdiya.com/founder-portal/{escalationId}`
- ✅ Escalation timestamp

## Need Help?

If you encounter issues:
1. Check the webhook delivery logs first
2. Check Edge Function logs second
3. Verify all environment variables are set correctly

