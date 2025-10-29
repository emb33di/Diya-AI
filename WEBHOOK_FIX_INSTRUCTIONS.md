# Fix Stripe Webhook 401 Error

## Problem
The webhook is getting a 401 "Missing authorization header" error because Supabase Edge Functions require authentication, but Stripe doesn't send auth headers.

## Solution: Add Anon Key to Webhook URL

Update your Stripe webhook endpoint URL to include the anon key as a query parameter:

### Steps:

1. **Get your Supabase Anon Key**:
   - Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/settings/api
   - Copy the **anon/public** key (starts with `eyJ...`)

2. **Update Stripe Webhook URL**:
   - Go to: Stripe Dashboard → Developers → Webhooks
   - Click on your webhook endpoint
   - Click **"Update"** or **"Edit"**
   - Change the URL from:
     ```
     https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/stripe-webhook
     ```
   - To:
     ```
     https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/stripe-webhook?apikey=YOUR_ANON_KEY_HERE
     ```
   - Replace `YOUR_ANON_KEY_HERE` with your actual anon key

3. **Save the webhook**

4. **Test again**:
   - Make a test payment
   - Check Stripe Dashboard → Webhooks → Recent deliveries
   - Should show 200 status instead of 401
   - Check Supabase Edge Function logs - should see webhook events

## Alternative: Use Service Role Key (Less Secure)

If you prefer to use the service role key (more privileged but works similarly):

```
https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/stripe-webhook?apikey=YOUR_SERVICE_ROLE_KEY
```

⚠️ **Warning**: Service role key has full database access - only use if you understand the security implications.

## Why This Works

Supabase Edge Functions can accept requests without JWT if you provide the `apikey` query parameter (or header). The function code will still verify the Stripe signature for security, so this is safe.

The webhook function uses Stripe's signature verification (not Supabase auth) as the real security mechanism, so adding the anon key just lets the request through the gateway.
