# Razorpay Integration Setup Guide

This guide explains how to set up and configure the Razorpay payment integration for Diya AI.

## 📋 Overview

The Razorpay integration is implemented using a serverless architecture with Supabase Edge Functions. We've completed **Step 1.1: Create Customer** from Razorpay's integration guide.

## ✅ What's Been Implemented (Step 1.1)

### 1. Database Schema ✓
- Added `razorpay_customer_id` column to `user_profiles` table
- Added `razorpay_order_id` column for future order tracking
- Added `razorpay_payment_id` column for payment tracking
- Added `payment_status` column to track payment state
- Added indexes for efficient queries

**Migration File:** `supabase/migrations/20251014130114_add_razorpay_customer_id.sql`

### 2. Backend (Supabase Edge Function) ✓
- Created `razorpay-create-customer` Edge Function
- Implements secure server-side customer creation
- Validates user authentication via JWT
- Stores customer ID in database for future use
- Handles duplicate customer requests (idempotent)

**Function Location:** `supabase/functions/razorpay-create-customer/index.ts`

### 3. Frontend Service ✓
- Created `RazorpayService` class with methods for:
  - `createCustomer()` - Step 1.1 implementation
  - `createOrder()` - Placeholder for Step 1.2
  - `verifyPayment()` - Placeholder for Step 1.6
  - `getPaymentStatus()` - Helper to check user's payment state

**Service Location:** `src/services/razorpayService.ts`

### 4. UI Integration ✓
- Updated `Payments.tsx` to use RazorpayService
- Added loading states and error handling
- Shows customer creation status
- Ready for Step 1.2 (Create Order)

**UI Location:** `src/pages/Payments.tsx`

## 🔧 Setup Instructions

### Step 1: Get Razorpay API Credentials

1. **Sign up for Razorpay:**
   - Go to https://razorpay.com/
   - Create an account if you don't have one
   - For India-based businesses only (as per Razorpay requirements)

2. **Get Test API Keys:**
   - Log in to Razorpay Dashboard
   - Go to **Settings** → **API Keys**
   - Generate **Test Keys** (for development)
   - You'll get:
     - `Key ID` (starts with `rzp_test_`)
     - `Key Secret` (keep this secret!)

3. **Later: Get Live API Keys:**
   - After testing, generate **Live Keys**
   - Live keys start with `rzp_live_`

### Step 2: Configure Supabase Secrets

#### Option A: Using Supabase Dashboard (Recommended for Production)

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:
   ```
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

#### Option B: Using Supabase CLI (For Local Development)

1. Make sure you have Supabase CLI installed
2. In your project root, run:
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
   supabase secrets set RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

3. For local development, create a `.env` file in `supabase/.env`:
   ```bash
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

### Step 3: Apply Database Migration

```bash
# Make sure you're in the project root
cd /Users/mihirbedi/Desktop/Business\ ideas/AI\ Counselor/Diya-AI

# Apply the migration to your Supabase database
supabase db push
```

This will add the necessary Razorpay columns to your `user_profiles` table.

### Step 4: Deploy the Edge Function

```bash
# Deploy the razorpay-create-customer function
supabase functions deploy razorpay-create-customer

# Verify deployment
supabase functions list
```

### Step 5: Test the Integration

1. **Start your local development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the Payments page:**
   - Log in to your application
   - Go to `/payments` route
   - Click "Initialize Payment" button

3. **Check the console:**
   - You should see "Creating Razorpay customer..."
   - Customer ID should be logged
   - Check Supabase logs for function execution

4. **Verify in Razorpay Dashboard:**
   - Go to Razorpay Dashboard → Customers
   - Your test customer should appear there

## 🔒 Security Notes

### ✅ What We Did Right

1. **Server-Side Only:** API keys are NEVER exposed to the frontend
2. **Authentication:** All requests verify JWT tokens
3. **Environment Variables:** Secrets stored in Supabase secure vault
4. **Validation:** Input validation before creating customers
5. **Idempotent:** Multiple calls don't create duplicate customers

### ⚠️ Important Security Rules

1. **NEVER commit API keys** to git
2. **NEVER use live keys** in development
3. **NEVER expose keys** in frontend code
4. **ALWAYS verify** payment signatures (Step 1.6)
5. **ALWAYS use HTTPS** in production

## 📊 Database Schema

### Added Columns to `user_profiles`:

| Column | Type | Description |
|--------|------|-------------|
| `razorpay_customer_id` | TEXT | Razorpay customer ID (e.g., `cust_XXXX`) |
| `razorpay_order_id` | TEXT | Latest order ID for the user |
| `razorpay_payment_id` | TEXT | Latest successful payment ID |
| `payment_status` | TEXT | Status: pending, completed, failed |
| `payment_completed_at` | TIMESTAMP | When payment was completed |

## 🧪 Testing Checklist

Before moving to Step 1.2, verify:

- [ ] Database migration applied successfully
- [ ] Edge function deployed and accessible
- [ ] Environment variables configured
- [ ] Can create customer via Payments page
- [ ] Customer ID stored in database
- [ ] Customer appears in Razorpay Dashboard
- [ ] Duplicate calls return existing customer
- [ ] Error handling works (try with logged-out user)

## 📝 Test Data

Use these test values for Razorpay:

### Test Phone Numbers:
- `+919000090000` (default fallback)
- Any valid Indian number format

### Test Email:
- Any valid email format

### Test Customer Name:
- Must be 5-50 characters
- Only letters and spaces
- No special characters

## 🚀 Next Steps (Not Yet Implemented)

### Step 1.2: Create Order
- Create `razorpay-create-order` Edge Function
- Generate order ID with amount and currency
- Link order to customer

### Step 1.3: Integrate Checkout
- Add Razorpay Checkout script to frontend
- Configure checkout options
- Handle checkout events

### Step 1.4: Handle Payment Success/Failure
- Add success/failure callbacks
- Update UI based on payment result

### Step 1.5: Store Payment Fields
- Save payment details to database
- Update user tier (Free → Pro)

### Step 1.6: Verify Payment Signature
- Create verification Edge Function
- Verify signature using webhook secret
- Prevent payment tampering

### Step 1.7: Verify Payment Status
- Check payment status with Razorpay API
- Double verification for security

## 🐛 Troubleshooting

### "No authorization header" error
- User is not logged in
- JWT token expired
- Check authentication status

### "Failed to fetch user profile" error
- User profile not created yet
- Database connection issue
- Check Supabase logs

### "Razorpay API error" messages
- Invalid API credentials
- Check environment variables
- Verify keys in Supabase dashboard
- Check Razorpay dashboard for API status

### Customer not appearing in dashboard
- Check Razorpay Dashboard → Customers
- Verify you're looking at Test mode
- Check function logs in Supabase

### Edge function not deploying
- Ensure Supabase CLI is updated: `supabase update`
- Check function syntax
- Verify CORS headers are included

## 📚 Resources

- [Razorpay Integration Docs](https://razorpay.com/docs/payments/payment-gateway/web-integration/)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Razorpay Dashboard](https://dashboard.razorpay.com/)

## 🔄 Environment Variables Reference

### Required for Razorpay Integration:

```bash
# Already configured (from existing setup)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# New variables needed (add to Supabase Secrets)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_secret_key_here
```

## ✨ What You Need to Change/Add Before Step 2

### 1. **Configure Razorpay API Keys** (Required)
   - Get your test keys from Razorpay Dashboard
   - Add them to Supabase Secrets (see Step 2 above)
   - **This is MANDATORY** - the function will not work without these

### 2. **Apply Database Migration** (Required)
   ```bash
   supabase db push
   ```

### 3. **Deploy Edge Function** (Required)
   ```bash
   supabase functions deploy razorpay-create-customer
   ```

### 4. **Test the Integration** (Recommended)
   - Navigate to `/payments`
   - Click "Initialize Payment"
   - Verify customer creation

### 5. **Verify in Razorpay Dashboard** (Recommended)
   - Check that customer appears in dashboard
   - Verify customer details are correct

---

**Status:** Step 1.1 ✅ Complete | Ready for Step 1.2 (Create Order)

