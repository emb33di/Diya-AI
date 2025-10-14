# Admin Signup Notifications System

This guide explains the admin notification system that sends you an email at **mihir@meetdiya.com** whenever a new user signs up for Diya AI.

## 📋 Overview

The system consists of two main components:

1. **Edge Function** (`send-admin-signup-notification`): Sends formatted email notifications
2. **Database Trigger** (`notify_admin_of_new_user`): Automatically calls the edge function when a new user is created

## 🚀 Deployment Steps

### Step 1: Deploy the Edge Function

Deploy the edge function to Supabase:

```bash
cd "/Users/mihirbedi/Desktop/Business ideas/AI Counselor/Diya-AI"
supabase functions deploy send-admin-signup-notification
```

### Step 2: Run the Database Migration

Apply the migration to create the trigger:

```bash
supabase db push
```

Or if you're using migrations directly:

```bash
supabase migration up
```

### Step 3: Enable pg_net Extension (Important!)

The trigger uses Supabase's `pg_net` extension to make HTTP requests. You need to enable it:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc
2. Navigate to **Database** → **Extensions**
3. Search for `pg_net` and enable it
4. Alternatively, run this SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 4: Verify Environment Variables

Make sure these secrets are set in your Supabase project (they should already be configured based on your existing `send-signup-confirmation` function):

- `RESEND_API_KEY`: Your Resend API key
- `RESEND_FROM`: Your verified sender email (mihir@meetdiya.com)

You can check/set these at:
https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/settings/functions

## 📧 What You'll Receive

Every time a new user signs up, you'll receive an email with:

- **User's Full Name**
- **Email Address**
- **Program Type** (Undergraduate/MBA/Graduate)
- **User ID** (for database lookups)
- **Signup Timestamp**
- **Direct link** to view the user in Supabase Dashboard

### Email Example

```
🎉 New User Signup!

A new user has just signed up for Diya AI:

👤 Full Name: John Doe
📧 Email: john.doe@example.com
🎓 Applying to: undergraduate
🆔 User ID: 123e4567-e89b-12d3-a456-426614174000

Signed up at: Monday, October 13, 2025, 10:30 AM PDT
```

## 🧪 Testing

### Test 1: Manual Edge Function Test

Test the edge function directly to ensure it can send emails:

```bash
curl -i --location --request POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-admin-signup-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "userId": "test-user-123",
    "email": "test@example.com",
    "fullName": "Test User",
    "applyingTo": "undergraduate",
    "createdAt": "2025-10-13T10:30:00Z"
  }'
```

You should receive a test email at mihir@meetdiya.com.

### Test 2: End-to-End Signup Test

Create a test user account through your signup flow:

1. Go to your signup page
2. Create a test account with a new email
3. Wait a few seconds
4. Check mihir@meetdiya.com for the notification

### Test 3: Check Logs

View the edge function logs:

```bash
supabase functions logs send-admin-signup-notification
```

Or in the Supabase Dashboard:
https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/functions/send-admin-signup-notification/logs

## 🔧 Troubleshooting

### Issue: No emails being received

**Check 1: Is pg_net enabled?**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

If empty, enable it:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Check 2: View database logs**
```sql
-- Check for trigger execution logs
SELECT * FROM pg_stat_statements WHERE query LIKE '%notify_admin_of_new_user%';
```

**Check 3: Test the trigger manually**

Create a test auth user and watch the logs:

```sql
-- This won't actually create a user, but tests if the trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'zz_notify_admin_on_user_created';
```

**Check 4: Verify Resend API key**

Make sure your Resend API key is valid and the sender email (mihir@meetdiya.com) is verified in your Resend account.

### Issue: Emails go to spam

If emails are landing in spam:

1. Add `mihir@meetdiya.com` to your contacts
2. Check your Resend domain verification
3. Consider setting up SPF/DKIM records for meetdiya.com

### Issue: Trigger fires but function fails

Check the edge function logs:

```bash
supabase functions logs send-admin-signup-notification --tail
```

Common issues:
- Missing `RESEND_API_KEY` environment variable
- Resend API rate limits
- Invalid email format

## 📊 Monitoring

### View Recent Signups with Notification Status

```sql
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'applying_to' as applying_to
FROM auth.users au
ORDER BY au.created_at DESC
LIMIT 10;
```

### Check Trigger Status

```sql
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
ORDER BY tgname;
```

## 🛠️ Customization

### Change Admin Email

To send notifications to a different email address, update the edge function:

```typescript
// In send-admin-signup-notification/index.ts, line ~208
const adminEmail = "mihir@meetdiya.com"; // Change this
```

Then redeploy:

```bash
supabase functions deploy send-admin-signup-notification
```

### Customize Email Template

Edit the `generateAdminNotificationEmail()` function in the edge function to change:
- Email styling (CSS in the `<style>` tag)
- Email content and structure
- Information displayed

### Add Slack Notifications

You can extend the system to also send Slack notifications:

1. Add a Slack webhook URL to your environment variables
2. Update the edge function to also call the Slack API
3. Format the notification for Slack's message format

## 🔒 Security Notes

- The trigger uses `SECURITY DEFINER` to run with elevated privileges
- The edge function uses the service role key (stored securely in Supabase)
- Emails are sent via Resend's secure API
- No sensitive user data is logged in plain text
- The trigger gracefully handles errors without breaking user signup

## 📝 Files Created

1. **Edge Function**: `/supabase/functions/send-admin-signup-notification/index.ts`
2. **Migration**: `/supabase/migrations/20251013000000_add_admin_signup_notification.sql`
3. **Documentation**: `/ADMIN_SIGNUP_NOTIFICATIONS_GUIDE.md` (this file)

## 🎯 Next Steps

After deployment, you might want to:

1. Set up a dashboard to view signup metrics
2. Add weekly/monthly signup summary emails
3. Integrate with analytics tools (Mixpanel, Amplitude, etc.)
4. Create automated welcome sequences for new users
5. Set up A/B tests for signup flows

## 🆘 Support

If you encounter issues:

1. Check the Supabase Dashboard logs
2. Review the edge function logs
3. Test the edge function manually with curl
4. Verify pg_net extension is enabled
5. Check Resend API dashboard for delivery status

---

**Created**: October 13, 2025  
**Last Updated**: October 13, 2025  
**Maintained by**: Mihir Bedi


