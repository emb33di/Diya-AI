# 🚀 Razorpay Quick Start - 5 Minute Setup

## Step 1: Get API Keys (2 minutes)

1. Go to https://razorpay.com/ and sign up
2. Navigate to: **Settings** → **API Keys**
3. Generate **Test Keys**
4. Copy both:
   - Key ID (starts with `rzp_test_`)
   - Key Secret

## Step 2: Add Secrets to Supabase (1 minute)

Go to your Supabase Dashboard:
```
https://supabase.com/dashboard/project/[your-project]/settings/functions
```

Add these two secrets:
```
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_secret_key_here
```

## Step 3: Run These Commands (2 minutes)

```bash
# Navigate to project
cd "/Users/mihirbedi/Desktop/Business ideas/AI Counselor/Diya-AI"

# Apply database migration
supabase db push

# Deploy Edge Function
supabase functions deploy razorpay-create-customer

# Verify deployment
supabase functions list
```

## Step 4: Test It (1 minute)

```bash
# Start dev server
npm run dev
```

1. Open http://localhost:5173/payments
2. Login if needed
3. Click "Initialize Payment"
4. Should see "Customer Created" ✅

## Verify Success ✅

- [ ] Green success box shows Customer ID
- [ ] Customer appears in Razorpay Dashboard (Test Mode)
- [ ] No console errors
- [ ] Button changes to "Proceed to Payment"

## What's Next?

You're ready for Step 1.2 (Create Order)!

See `RAZORPAY_STEP_1_SUMMARY.md` for detailed info.

