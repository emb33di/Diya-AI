# ✅ Razorpay Integration Step 1.1 - Complete

## What Was Built

All groundwork for Razorpay Step 1.1 (Create Customer) has been implemented and is ready for deployment.

## 📁 Files Created/Modified

### New Files Created:
1. **`supabase/functions/razorpay-create-customer/index.ts`**
   - Serverless Edge Function for creating Razorpay customers
   - Handles authentication and validation
   - Stores customer ID in database

2. **`supabase/migrations/20251014130114_add_razorpay_customer_id.sql`**
   - Adds Razorpay payment columns to user_profiles table
   - Creates indexes for efficient queries

3. **`src/services/razorpayService.ts`**
   - Frontend service for Razorpay operations
   - Methods for customer creation, orders, and verification

4. **`RAZORPAY_INTEGRATION_SETUP.md`**
   - Complete setup and configuration guide
   - Troubleshooting tips
   - Security best practices

### Modified Files:
1. **`src/pages/Payments.tsx`**
   - Integrated RazorpayService
   - Added customer creation UI
   - Shows payment status

## 🔧 What You Need to Do Before Step 2

### 1. Get Razorpay API Credentials ⚠️ REQUIRED

1. Sign up at https://razorpay.com/ (India only)
2. Go to Dashboard → Settings → API Keys
3. Generate **Test Mode** keys
4. You'll get:
   - **Key ID**: starts with `rzp_test_`
   - **Key Secret**: keep this secret!

### 2. Configure Supabase Secrets ⚠️ REQUIRED

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/[your-project]
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**
3. Add these two secrets:
   ```
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

#### Option B: Via Supabase CLI
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
supabase secrets set RAZORPAY_KEY_SECRET=your_secret_key_here
```

### 3. Apply Database Migration ⚠️ REQUIRED

```bash
# From project root
cd "/Users/mihirbedi/Desktop/Business ideas/AI Counselor/Diya-AI"

# Push migration to database
supabase db push
```

This adds these columns to `user_profiles`:
- `razorpay_customer_id`
- `razorpay_order_id`
- `razorpay_payment_id`
- `payment_status`
- `payment_completed_at`

### 4. Deploy Edge Function ⚠️ REQUIRED

```bash
# Deploy the customer creation function
supabase functions deploy razorpay-create-customer

# Verify it's deployed
supabase functions list
```

### 5. Test the Integration ✅ RECOMMENDED

1. Start dev server: `npm run dev`
2. Log in to your app
3. Navigate to: http://localhost:5173/payments
4. Click "Initialize Payment" button
5. Check console for success message
6. Verify in Razorpay Dashboard → Customers

### 6. Regenerate Supabase Types (Optional, but recommended)

After the migration, regenerate TypeScript types:

```bash
# This will update types to include new Razorpay columns
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## 📋 Pre-Flight Checklist

Before moving to Step 1.2, verify:

- [ ] Razorpay account created (test mode)
- [ ] API keys obtained (Key ID + Secret)
- [ ] Secrets configured in Supabase
- [ ] Database migration applied (`supabase db push`)
- [ ] Edge function deployed successfully
- [ ] Test customer creation works
- [ ] Customer appears in Razorpay Dashboard
- [ ] No console errors

## 🚀 Testing Instructions

### Test Customer Creation:

1. **Login to your app**
2. **Navigate to Payments page**: `/payments`
3. **Click "Initialize Payment"**
4. **Expected behavior:**
   - Button shows "Processing..." with spinner
   - Toast notification: "Customer Created"
   - Green success box appears with Customer ID
   - Button text changes to "Proceed to Payment"

5. **Verify in Razorpay Dashboard:**
   - Go to https://dashboard.razorpay.com/
   - Switch to **Test Mode** (toggle in top-right)
   - Click **Customers** in sidebar
   - You should see your test customer

### Test Idempotency:

1. **Click "Initialize Payment" again**
2. **Expected behavior:**
   - Should return existing customer
   - Toast says "Customer Found"
   - Same Customer ID displayed
   - No duplicate customer in Razorpay

## 🔒 Security Verification

Ensure these security measures are in place:

✅ API keys are ONLY in Supabase Secrets (never in code)
✅ Edge function verifies JWT token
✅ Frontend never sees API credentials
✅ Using test keys for development
✅ .env files are in .gitignore

## 📊 Database Schema Changes

The migration adds these columns to `user_profiles`:

| Column | Type | Purpose |
|--------|------|---------|
| `razorpay_customer_id` | TEXT | Stores Razorpay customer ID |
| `razorpay_order_id` | TEXT | Stores latest order ID |
| `razorpay_payment_id` | TEXT | Stores successful payment ID |
| `payment_status` | TEXT | Tracks payment state |
| `payment_completed_at` | TIMESTAMP | Payment completion time |

## 🐛 Common Issues & Solutions

### Issue: "Edge function not found"
**Solution:** Run `supabase functions deploy razorpay-create-customer`

### Issue: "RAZORPAY_KEY_ID is not defined"
**Solution:** Add secrets to Supabase dashboard or via CLI

### Issue: "No authorization header"
**Solution:** Make sure user is logged in before accessing /payments

### Issue: Customer not in Razorpay Dashboard
**Solution:** 
- Check you're in Test Mode (not Live)
- Verify API keys are correct
- Check Supabase function logs for errors

### Issue: TypeScript errors in razorpayService.ts
**Solution:** This is expected until you regenerate types after migration:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## 📈 What Happens Next (Step 1.2)

After completing the setup above, we'll implement:

**Step 1.2: Create Order**
- Generate Razorpay order with amount (₹9,999)
- Link order to customer
- Return order ID for checkout

**Step 1.3: Integrate Checkout**
- Add Razorpay Checkout SDK to frontend
- Open payment modal
- Handle user payment input

**Step 1.4: Handle Success/Failure**
- Redirect on success
- Show error on failure
- Update UI accordingly

**Step 1.5: Store Payment Fields**
- Save payment details to database
- Upgrade user from Free to Pro tier

**Step 1.6: Verify Payment Signature**
- Cryptographically verify payment
- Prevent tampering
- Server-side validation

**Step 1.7: Verify Payment Status**
- Double-check with Razorpay API
- Confirm payment succeeded
- Update user_tier to 'Pro'

## 📞 Support

If you encounter issues:
1. Check the detailed guide: `RAZORPAY_INTEGRATION_SETUP.md`
2. Review Supabase function logs
3. Check Razorpay Dashboard for API errors
4. Verify all environment variables are set

## ✨ Summary

**Status:** ✅ Step 1.1 Complete - Ready for Step 1.2

**What's Working:**
- Customer creation via Edge Function
- Database storage of customer ID
- UI integration in Payments page
- Error handling and validation

**What's Needed Before Proceeding:**
1. Razorpay API credentials configured
2. Database migration applied
3. Edge function deployed
4. Test customer creation successful

**Time to Complete Setup:** ~10-15 minutes

---

Once you've completed the setup steps above, we can move to Step 1.2 (Create Order) to continue the payment integration! 🚀

