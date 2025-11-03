# Test Founder Escalation Webhook

## Quick Test Steps

### 1. Test Through Your Website (Real Test)

1. **Go to your website**: https://www.meetdiya.com (or your local dev environment)
2. **Login as a Pro user** (the escalation feature is only for Pro users)
3. **Open an essay** in the essay editor
4. **Click the "Founder Review" button** (should have a crown icon)
5. **Confirm the escalation**

### 2. Check Webhook Delivery

1. Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/hooks
2. Click on your **"Founder Escalation Notification"** webhook
3. Look at the **"Deliveries"** or **"History"** tab
4. You should see:
   - ✅ A recent delivery (within the last few minutes)
   - ✅ Status: `200 OK` (success) or check for errors
   - ✅ Click on it to see request/response details

### 3. Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/functions/send-founder-escalation-notification/logs
2. Or run in terminal:
   ```bash
   supabase functions logs send-founder-escalation-notification --tail
   ```
3. Look for:
   - ✅ "Founder notification sent for escalated essay: ..."
   - ✅ "Founder escalation email sent successfully via Resend: ..."
   - ❌ Any error messages

### 4. Check Your Email

- **Check**: mihir@meetdiya.com
- **Subject**: `📝 Essay Escalated: [Essay Title] by [Student Name]`
- **Check spam folder** if you don't see it
- Email should include:
  - Student name and email
  - Essay title
  - Word count
  - Direct link to review

## Troubleshooting

### Webhook shows error?

**401 Unauthorized:**
- Check your Authorization header: Should be `Bearer [YOUR_SERVICE_ROLE_KEY]`
- Make sure you copied the **service_role** key, not anon key

**404 Not Found:**
- Check the URL is correct: `https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-founder-escalation-notification`
- Make sure Edge Function is deployed

**500 Internal Server Error:**
- Check Edge Function logs for details
- Verify `RESEND_API_KEY` and `RESEND_FROM` are set in Edge Function secrets

### No email received?

1. ✅ Check webhook delivery status (should be 200 OK)
2. ✅ Check Edge Function logs for email sending
3. ✅ Check spam folder
4. ✅ Verify Resend API key is valid

### Can't escalate essay?

- Make sure you're logged in as a **Pro user**
- Check if you've reached your escalation limit
- The "Founder Review" button should be visible in the essay editor

## Next Steps

Once you confirm it's working:
- ✅ You'll automatically get emails whenever essays are escalated
- ✅ You can disable the database trigger if you prefer (webhooks are more reliable)
- ✅ Monitor webhook delivery in the Supabase dashboard

