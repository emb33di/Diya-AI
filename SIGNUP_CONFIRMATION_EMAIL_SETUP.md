# Signup Confirmation Email Setup

## Overview
This guide explains how to set up and deploy the custom signup confirmation email system for Diya AI using Supabase Edge Functions and Resend.

## Components Created

### 1. Edge Function: `send-signup-confirmation`
- **Location**: `supabase/functions/send-signup-confirmation/index.ts`
- **Purpose**: Sends custom confirmation emails to users after signup
- **Features**:
  - Uses same styling as weekly deadline emails
  - Professional Diya AI branding
  - "Confirm Your Email" button that navigates to https://www.meetdiya.com/auth
  - Personalized with user's first name
  - Error handling and logging

### 2. Updated Signup Flow
- **Location**: `src/pages/Auth.tsx`
- **Purpose**: Calls the custom confirmation email function after successful signup
- **Features**:
  - Calls function after Supabase user creation
  - Graceful error handling (signup succeeds even if email fails)
  - Debug logging for troubleshooting

### 3. Deployment Script
- **Location**: `scripts/deploy-signup-confirmation.sh`
- **Purpose**: Automated deployment of the Edge Function
- **Features**:
  - Environment variable checks
  - Function deployment
  - Testing instructions

## Required Environment Variables

Set these in your Supabase project dashboard under Settings > Edge Functions:

```bash
# Resend API configuration (required)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=mihir@meetdiya.com

# Supabase configuration (automatically provided)
SUPABASE_URL=https://oliclbcxukqddxlfxuuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Deployment Steps

### 1. Deploy the Edge Function
```bash
# Navigate to your project root
cd /Users/mihirbedi/Desktop/Business\ ideas/AI\ Counselor/Diya-AI

# Run the deployment script
./scripts/deploy-signup-confirmation.sh
```

### 2. Test the Function
```bash
# Test the function manually
curl -X POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-signup-confirmation' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"email":"test@example.com","firstName":"John"}'
```

## Email Template Features

The confirmation email includes:

1. **Same Styling** as weekly deadline emails:
   - Diya AI orange gradient header (`#D07D00` to `#B86D00`)
   - Professional typography and layout
   - Responsive design

2. **Personalized Content**:
   - User's first name in welcome message
   - Clear confirmation instructions
   - Next steps explanation

3. **Call-to-Action**:
   - "Confirm Your Email" button
   - Links to https://www.meetdiya.com/auth
   - Professional styling

4. **Branding**:
   - Diya AI logo and colors
   - Mihir Bedi signature
   - Professional footer

## Integration with Signup Flow

The function is automatically called from `Auth.tsx` after successful user creation:

```typescript
// After successful Supabase signup
const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signup-confirmation`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    email,
    firstName
  })
});
```

## Benefits

1. **Consistent Branding**: Matches your existing email design
2. **Professional Experience**: Custom confirmation emails vs. Supabase defaults
3. **Reliability**: Uses Resend (same as weekly emails)
4. **Graceful Fallback**: Signup succeeds even if email fails
5. **Easy Maintenance**: Single function for all confirmation emails

## Monitoring

Check the Supabase Edge Functions logs to monitor email delivery:
- Success: "Signup confirmation email sent successfully via Resend"
- Failures: Error messages with details
- Resend dashboard: https://resend.com/emails

## Troubleshooting

### Common Issues:

1. **Email not sending**: Check RESEND_API_KEY and RESEND_FROM environment variables
2. **Function not found**: Ensure function is deployed with `supabase functions deploy send-signup-confirmation`
3. **CORS errors**: Function includes proper CORS headers
4. **User creation succeeds but email fails**: This is expected behavior - signup continues

### Debug Steps:

1. Check Supabase Edge Function logs
2. Verify environment variables are set
3. Test function manually with curl
4. Check Resend dashboard for delivery status
